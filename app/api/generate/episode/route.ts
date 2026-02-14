import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import type { ScriptJSON } from "@/types";
import type { SceneData, SceneCharacter } from "@/components/AnimationEngine/types";
import { synthesizeSpeech, DEFAULT_VOICE_ID } from "@/lib/elevenlabs";
import { uploadAudio } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { episode_id } = await req.json();

        if (!episode_id) {
            return NextResponse.json(
                { error: "episode_id is required" },
                { status: 400 }
            );
        }

        /* ── 1. Fetch episode & assets in parallel ──────────── */
        const [
            { data: episode, error: fetchError },
            { data: userAssets, error: assetError }
        ] = await Promise.all([
            supabase.from("episodes").select("*").eq("id", episode_id).eq("user_id", user.id).single(),
            supabase.from("assets").select("name, url").eq("user_id", user.id)
        ]);

        if (fetchError || !episode) {
            return NextResponse.json({ error: "Episode not found" }, { status: 404 });
        }
        if (assetError) {
            console.error("[Generate] Asset fetch error:", assetError);
        }

        if (!episode.script) {
            return NextResponse.json({ error: "Episode has no script JSON" }, { status: 400 });
        }

        /* ── 2. Parse the script JSON ───────────────────────── */
        let scriptJSON: ScriptJSON;
        try {
            scriptJSON = JSON.parse(episode.script);
        } catch {
            return NextResponse.json({ error: "Invalid script JSON" }, { status: 400 });
        }

        /* ── 3. Build Asset Map ─────────────────────────────── */
        const assetMap = new Map<string, string>();
        (userAssets || []).forEach((a) => {
            assetMap.set(a.name.toLowerCase(), a.url);
        });

        const resolve = (name: string | undefined): string =>
            name ? assetMap.get(name.toLowerCase()) || "" : "";

        /* ── 4. Build resolved SceneData[] (Clean URLs only) ── */
        // We handle dialogue synthesis separately to keep this clean
        const resolvedScenes: SceneData[] = scriptJSON.scenes.map((scene) => {
            // Deduplicate characters by name to prevent double-speaking bugs
            const uniqueChars = scene.characters.filter((char, index, self) =>
                index === self.findIndex((c) => c.name.toLowerCase() === char.name.toLowerCase())
            );

            const characters: SceneCharacter[] = uniqueChars.map((char) => {
                const baseName = char.name.toLowerCase();
                return {
                    name: char.name,
                    position: char.position as SceneCharacter["position"],
                    assets: {
                        body: resolve(`${baseName}_body`),
                        head: resolve(`${baseName}_head`),
                        eyes: resolve(`${baseName}_eyes`),
                        mouths: {
                            neutral: resolve(`${baseName}_mouth_neutral`),
                            talking: resolve(`${baseName}_mouth_talking`),
                        },
                    },
                    dialogue: char.dialogue.map((dl) => ({
                        line: dl.line,
                        mouthShape: dl.mouthShape || "talking",
                    })),
                };
            });

            return {
                background: resolve(scene.background),
                characters,
                props: (scene.props || []).map((p) => ({
                    name: p,
                    text: undefined,
                    animation: undefined,
                })),
            };
        });

        /* ── 5. Voice Generation (ElevenLabs) — Batched Parallel ── */
        console.log("[Generate] Starting voice synthesis...");
        const voiceId = DEFAULT_VOICE_ID;
        const BATCH_SIZE = 4;

        // Collect all dialogue lines with their references
        const allLines: { scene: number; char: number; dial: number; line: string }[] = [];
        for (let sIdx = 0; sIdx < resolvedScenes.length; sIdx++) {
            const scene = resolvedScenes[sIdx];
            for (let cIdx = 0; cIdx < scene.characters.length; cIdx++) {
                const char = scene.characters[cIdx];
                for (let dIdx = 0; dIdx < char.dialogue.length; dIdx++) {
                    allLines.push({ scene: sIdx, char: cIdx, dial: dIdx, line: char.dialogue[dIdx].line });
                }
            }
        }

        // Process in batches of BATCH_SIZE
        for (let i = 0; i < allLines.length; i += BATCH_SIZE) {
            const batch = allLines.slice(i, i + BATCH_SIZE);
            const results = await Promise.all(
                batch.map(async (item) => {
                    try {
                        console.log(`[Generate] Synthesizing: "${item.line.substring(0, 40)}..."`);
                        const buffer = await synthesizeSpeech(item.line, voiceId);
                        const publicId = `ep_${episode_id}_s${item.scene}_c${item.char}_d${item.dial}`;
                        const url = await uploadAudio(buffer, publicId);
                        return { ...item, url };
                    } catch (err: unknown) {
                        console.error(`[Generate] Voice synthesis FAILED:`, err);
                        const errorMessage = (err as Error)?.message || String(err);
                        if (errorMessage.includes("quota_exceeded")) {
                            throw new Error("ELEVENLABS_QUOTA_EXCEEDED");
                        }
                        return { ...item, url: null };
                    }
                })
            );

            // Assign results back
            for (const r of results) {
                if (r.url) {
                    resolvedScenes[r.scene].characters[r.char].dialogue[r.dial].audio = r.url;
                }
            }
        }
        console.log("[Generate] Voice synthesis complete.");

        const playableEpisode = {
            episodeTitle: scriptJSON.episodeTitle,
            scenes: resolvedScenes,
        };

        /* ── 6. Save resolved episode back to Supabase ──────── */
        const { error: updateError } = await supabase
            .from("episodes")
            .update({
                status: "completed",
                metadata: {
                    ...(episode.metadata || {}),
                    playable: playableEpisode,
                    generated_at: new Date().toISOString(),
                },
                updated_at: new Date().toISOString(),
            })
            .eq("id", episode_id)
            .eq("user_id", user.id);

        if (updateError) {
            console.error("[Generate] Database update error:", updateError);
            return NextResponse.json(
                { error: `Failed to save: ${updateError.message}` },
                { status: 500 }
            );
        }

        return NextResponse.json({
            episode_id,
            status: "completed",
            playable: playableEpisode,
        });
    } catch (error: unknown) {
        console.error("Generate episode error:", error);
        const errorMessage = (error as Error)?.message || String(error);

        if (errorMessage === "ELEVENLABS_QUOTA_EXCEEDED") {
            return NextResponse.json(
                { error: "ElevenLabs API quota exceeded. Please upgrade your plan or wait for your character limit to reset." },
                { status: 402 } // Payment Required (fitting for quota)
            );
        }

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
