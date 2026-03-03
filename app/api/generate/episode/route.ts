import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";
import type { ScriptJSON } from "@/types";
import type { SceneData, SceneCharacter } from "@/components/AnimationEngine/types";
import { VOICE_MAP, DEFAULT_VOICE_ID, synthesizeSpeech, estimateMp3DurationSec } from "@/lib/tts";
import { computeEpisodeTiming } from "@/lib/remotion/computeTimings";
import { startRender } from "@/lib/remotion/lambda-render";

export const maxDuration = 300;

/* ──────────────────────────────────────────────────────────
   Generate all TTS audio in parallel and upload to Supabase Storage.
   Returns a map of { storageKey → AudioResult }.
   On individual failure the result has url: "" and durationSec: 0 —
   the browser player falls back to word-count timing for that line,
   and the Lambda export guard rejects episodes with missing audio.
   ────────────────────────────────────────────────────────── */
interface TtsJob {
    key: string;   // unique path within the bucket, e.g. "tts/{ep}/{i}.mp3"
    text: string;
    voice: string;
}

interface AudioResult {
    url: string;         // absolute Supabase Storage public URL, or "" on failure
    durationSec: number; // CBR-estimated duration; 0 on failure
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

async function generateAllAudio(jobs: TtsJob[]): Promise<Map<string, AudioResult>> {
    const admin = createAdminClient();
    const results = new Map<string, AudioResult>();

    // Ensure the audio bucket exists AND is public.
    // createBucket is a no-op when the bucket already exists, so we also call
    // updateBucket to force public:true on buckets that were created without it.
    // Both calls are non-fatal — a failure here means audio URLs will 403 on
    // the client, but we don't want to abort the whole generation.
    await admin.storage.createBucket("audio", { public: true }).catch(() => { });
    await admin.storage.updateBucket("audio", { public: true }).catch(() => { });

    // 5 concurrent TTS requests — prevents hammering OpenAI rate limits initially while backoff handles the rest.
    await asyncPool(
        jobs.map(({ key, text, voice }) => async () => {
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
                results.set(key, {
                    url: data.publicUrl,
                    durationSec: estimateMp3DurationSec(buffer),
                });
            } catch (err) {
                console.error(`[Generate] TTS upload failed for ${key}:`, err);
                // Empty URL — never store a relative URL. The browser player falls
                // back to word-count timing; the Lambda export guard rejects these.
                results.set(key, { url: "", durationSec: 0 });
            }
        }),
        5,
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

        const { episode_id, force } = await req.json();

        if (!episode_id) {
            return NextResponse.json(
                { error: "episode_id is required" },
                { status: 400 }
            );
        }

        /* ── 1. Fetch episode & assets ── */
        const [
            { data: episode, error: fetchError },
            { data: userAssets, error: assetError },
        ] = await Promise.all([
            supabase.from("episodes").select("*").eq("id", episode_id).eq("user_id", user.id).single(),
            supabase.from("assets").select("name, url").eq("user_id", user.id),
        ]);

        if (fetchError || !episode) {
            return NextResponse.json({ error: "Episode not found" }, { status: 404 });
        }
        if (assetError) {
            console.error("[Generate] Asset fetch error:", assetError);
        }

        // Idempotency: if already completed return early (unless force=true to regenerate audio)
        if (!force && episode.status === "completed" && (episode.metadata as Record<string, unknown>)?.playable) {
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

        /* ── 2b. Estimate episode duration (for duration_sec field only) ── */
        const allWords = scriptJSON.scenes
            .flatMap((s) => s.characters.flatMap((c) => c.dialogue.map((d) => d.line)))
            .join(" ")
            .split(/\s+/)
            .filter(Boolean);
        const estimatedSec = Math.ceil(allWords.length / (130 / 60));

        // Plan limits disabled for client testing
        // const PLAN_LIMITS_SEC = { free: 60, pro: 600, creator_plus: 1800 };

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

            const characters: SceneCharacter[] = scene.characters.map((char) => {
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
                    jobs.push({ key, text: dl.line, voice });
                    globalIdx++;
                }
            }
        }

        const audioUrls = await generateAllAudio(jobs);
        const successfulAudio = Array.from(audioUrls.values()).filter((r) => !!r.url).length;
        console.log(`[Generate] TTS done — ${successfulAudio}/${jobs.length} lines uploaded successfully.`);

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
                    const audioResult = audioUrls.get(key);
                    dl.audio = audioResult?.url || undefined;
                    dl.audioDurationSec = audioResult?.durationSec || undefined;
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
                duration_sec: estimatedSec,
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

        /* ── 7. Fire-and-forget: pre-render the video in the background ──
           The user sees the preview immediately; by the time they click
           "Export Video" the MP4 is already rendered or close to done.
           Failures here are non-fatal — the user can still trigger a
           manual export from the player page.
        ──────────────────────────────────────────────────────────────── */
        try {
            const timing = computeEpisodeTiming(resolvedScenes);
            const inputProps = { scenes: resolvedScenes, timing };
            const admin = createAdminClient();

            startRender({
                compositionId: process.env.REMOTION_COMPOSITION_ID ?? "Episode",
                inputProps,
                episodeId: episode_id,
                totalFrames: timing.totalFrames,
            })
                .then(async (handle) => {
                    await admin.from("exports").insert({
                        episode_id,
                        user_id: user.id,
                        status: "rendering",
                        render_id: handle.renderId,
                        bucket_name: handle.bucketName,
                    });
                    console.log(`[Generate] Background render started: ${handle.renderId}`);
                })
                .catch((err) => {
                    console.error("[Generate] Background render failed (non-fatal):", err);
                });
        } catch (bgErr) {
            console.error("[Generate] Background render setup failed (non-fatal):", bgErr);
        }

        if (successfulAudio === 0 && jobs.length > 0) {
            console.error(`[Generate] ❌ ALL ${jobs.length} audio uploads failed — episode saved with no audio.`);
        }

        return NextResponse.json({
            episode_id,
            status: "completed",
            playable: playableEpisode,
            audioWarning: successfulAudio === 0 && jobs.length > 0
                ? `All ${jobs.length} audio uploads failed. Check OpenAI API key and Supabase Storage.`
                : undefined,
            debug: { audioLines: jobs.length, audioUploaded: successfulAudio },
        });
    } catch (error: unknown) {
        console.error("Generate episode error:", error);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
