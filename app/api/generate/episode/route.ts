import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";
import type { ScriptJSON } from "@/types";
import type { SceneData, SceneCharacter } from "@/components/AnimationEngine/types";
import { VOICE_MAP, DEFAULT_VOICE_ID, synthesizeSpeech } from "@/lib/tts";

export const maxDuration = 300;

/* ──────────────────────────────────────────────────────────
   Generate all TTS audio in parallel and upload to Supabase Storage.
   Returns a map of { storageKey → publicUrl }.
   Falls back to the /api/tts proxy URL on any individual failure so
   the episode still plays — it just gets on-demand audio for that line.
   ────────────────────────────────────────────────────────── */
interface TtsJob {
    key: string;       // unique path within the bucket, e.g. "tts/{ep}/{i}.mp3"
    text: string;
    voice: string;
    fallbackUrl: string;
}

/** Run async tasks with at most `concurrency` in-flight at once. */
async function asyncPool<T>(
    tasks: (() => Promise<T>)[],
    concurrency: number,
): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    const executing = new Set<Promise<void>>();
    for (let i = 0; i < tasks.length; i++) {
        const idx = i;
        const run = Promise.resolve().then(async () => {
            results[idx] = await tasks[idx]();
        }).finally(() => executing.delete(run));
        executing.add(run);
        if (executing.size >= concurrency) await Promise.race(executing);
    }
    await Promise.all(executing);
    return results;
}

async function generateAllAudio(jobs: TtsJob[]): Promise<Map<string, string>> {
    const admin = createAdminClient();
    const results = new Map<string, string>();

    // Ensure the audio bucket exists (no-op if already created)
    await admin.storage.createBucket("audio", { public: true }).catch(() => { });

    // 10 concurrent TTS requests — enough to be fast, won't hammer OpenAI rate limits
    await asyncPool(
        jobs.map(({ key, text, voice, fallbackUrl }) => async () => {
            try {
                const buffer = await synthesizeSpeech(text, voice);
                const { error: uploadError } = await admin.storage
                    .from("audio")
                    .upload(key, buffer, {
                        contentType: "audio/mpeg",
                        upsert: true,
                    });

                if (uploadError) throw uploadError;

                const { data } = admin.storage.from("audio").getPublicUrl(key);
                results.set(key, data.publicUrl);
            } catch (err) {
                console.error(`[Generate] TTS upload failed for ${key}:`, err);
                results.set(key, fallbackUrl);
            }
        }),
        10,
    );

    return results;
}

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

        // Idempotency: if already completed return early
        if (episode.status === "completed" && (episode.metadata as Record<string, unknown>)?.playable) {
            return NextResponse.json({
                episode_id,
                status: "completed",
                playable: (episode.metadata as Record<string, unknown>).playable,
            });
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

        /* ── 4. Build resolved SceneData[] ──────────────────── */
        const resolvedScenes: SceneData[] = scriptJSON.scenes.map((scene) => {
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

        /* ── 5. Pre-generate ALL TTS audio in parallel ──────────
           Collect every dialogue line as a TtsJob, run them all at once,
           then assign the resulting URLs back into the scene data.
           Each file is stored at  audio/tts/{episode_id}/{globalLineIndex}.mp3
           so re-generating the same episode overwrites previous audio (upsert).
        ─────────────────────────────────────────────────────── */
        console.log("[Generate] Pre-generating TTS audio...");

        const jobs: TtsJob[] = [];
        let globalIdx = 0;

        for (const scene of resolvedScenes) {
            for (const char of scene.characters) {
                const voice = VOICE_MAP[char.name.toLowerCase()] || DEFAULT_VOICE_ID;
                for (const dl of char.dialogue) {
                    if (!dl.line || dl.line.trim() === "" || /^\[pause\]$/i.test(dl.line.trim())) {
                        globalIdx++;
                        continue;
                    }
                    const key = `tts/${episode_id}/${globalIdx}.mp3`;
                    const fallbackParams = new URLSearchParams({ text: dl.line, voice });
                    jobs.push({
                        key,
                        text: dl.line,
                        voice,
                        fallbackUrl: `/api/tts?${fallbackParams.toString()}`,
                    });
                    globalIdx++;
                }
            }
        }

        const audioUrls = await generateAllAudio(jobs);
        console.log(`[Generate] TTS done — ${jobs.length} lines generated.`);

        // Assign the URLs back
        globalIdx = 0;
        for (const scene of resolvedScenes) {
            for (const char of scene.characters) {
                for (const dl of char.dialogue) {
                    if (!dl.line || dl.line.trim() === "" || /^\[pause\]$/i.test(dl.line.trim())) {
                        globalIdx++;
                        continue;
                    }
                    const key = `tts/${episode_id}/${globalIdx}.mp3`;
                    dl.audio = audioUrls.get(key);
                    globalIdx++;
                }
            }
        }

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

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
