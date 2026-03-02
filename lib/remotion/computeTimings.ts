/**
 * computeTimings — pure Node.js, no browser APIs.
 *
 * Converts SceneData[] into a frame-accurate timing map for the Remotion
 * composition. Every value is derived from pre-stored audioDurationSec
 * (written at TTS generation time) or a word-count estimate, so this runs
 * entirely server-side without Web Audio API.
 *
 * Timing model mirrors exportAudio.ts exactly:
 *   - Iterate scene.characters (with duplicates) — same outer loop order
 *   - LINE_GAP_SEC = 0.4 — matches AnimationEngine LINE_GAP_MS and exportAudio LINE_GAP
 *   - Float-time accumulation — rounds only startFrame, never individual durations
 *     This bounds cumulative error to ±0.5 frames regardless of episode length.
 *     Rounding each duration independently accumulates ~16.7 ms per line (1.67 s / 100 lines).
 */

import type { SceneData } from "@/components/AnimationEngine/types";

const FPS = 30;
const LINE_GAP_SEC = 0.4;   // must match AnimationEngine LINE_GAP_MS / 1000 and exportAudio LINE_GAP
const PAUSE_SEC = 0.8;   // must match exportAudio PAUSE_LINE
const NO_AUDIO_SEC = 1.8;   // must match AnimationEngine NO_AUDIO_LINE_MS / 1000

export interface DialogueTiming {
    sceneIdx: number;
    /** Index into the deduplicated uniqueChars array — used to find the CharacterState to animate. */
    charIdx: number;
    /** Index into scene.characters (original, with duplicates) — used to read dialogue text and audio. */
    originalCharIdx: number;
    lineIdx: number;
    audioUrl: string;
    startFrame: number;
    durationFrames: number;
    text: string;
    mouthShape: string;
}

export interface EpisodeTiming {
    totalFrames: number;
    dialogueTimings: DialogueTiming[];
    /** Frame index where each scene starts — for the sceneIdx lookup in the composition. */
    sceneStartFrames: number[];
}

export function computeEpisodeTiming(scenes: SceneData[]): EpisodeTiming {
    const timings: DialogueTiming[] = [];
    const sceneStartFrames: number[] = [];
    let floatTimeSec = 0; // accumulate in float seconds — never truncate until computing startFrame

    for (let si = 0; si < scenes.length; si++) {
        sceneStartFrames.push(Math.round(floatTimeSec * FPS));
        const scene = scenes[si];

        // Build the deduplicated character list — same logic as AnimationEngine buildState.
        // Used only to compute charIdx (the render-layer index). Dialogue iteration uses
        // scene.characters (with duplicates) to preserve the original speech order.
        const uniqueChars = scene.characters.filter((c, i, arr) =>
            i === arr.findIndex((x) => x.name.toLowerCase() === c.name.toLowerCase())
        );

        // CRITICAL: iterate scene.characters (with duplicates), not uniqueChars.
        // This must stay in sync with:
        //   - AnimationEngine.tsx:107-114  (globalDialogueQueue construction)
        //   - exportAudio.ts:50-55         (audio schedule construction)
        // Any divergence here produces audio desync in the Lambda export.
        for (let ci = 0; ci < scene.characters.length; ci++) {
            const char = scene.characters[ci];
            const uniqueIdx = uniqueChars.findIndex(
                (uc) => uc.name.toLowerCase() === char.name.toLowerCase()
            );

            for (let li = 0; li < char.dialogue.length; li++) {
                const dl = char.dialogue[li];
                const text = dl.line?.trim() ?? "";
                const isPause = !text || /^\[pause\]$/i.test(text);

                let lineDurationSec: number;
                if (isPause) {
                    lineDurationSec = PAUSE_SEC;
                } else if (dl.audioDurationSec && dl.audioDurationSec > 0) {
                    lineDurationSec = dl.audioDurationSec;
                } else {
                    // No stored duration — estimate from word count.
                    // Matches exportAudio.ts:82: Math.max(NO_AUDIO_LINE, wc * 0.35)
                    const wc = text.split(/\s+/).length;
                    lineDurationSec = Math.max(NO_AUDIO_SEC, wc * 0.35);
                }

                // Round only startFrame. Compute durationFrames as the difference between
                // rounded start times to avoid per-line rounding accumulation.
                const startFrame = Math.round(floatTimeSec * FPS);
                const endFrame = Math.round((floatTimeSec + lineDurationSec) * FPS);

                timings.push({
                    sceneIdx: si,
                    charIdx: uniqueIdx,
                    originalCharIdx: ci,
                    lineIdx: li,
                    audioUrl: dl.audio ?? "",
                    startFrame,
                    durationFrames: Math.max(1, endFrame - startFrame),
                    text: dl.line ?? "",
                    mouthShape: dl.mouthShape ?? "talking",
                });

                floatTimeSec += lineDurationSec + LINE_GAP_SEC;
            }
        }

        // Guard: if a scene has no dialogue, advance by 1 second so its
        // sceneStartFrame is unique and the sceneIdx lookup in the composition
        // does not collapse it onto the previous scene's frame range.
        if (scene.characters.length === 0 || scene.characters.every((c) => c.dialogue.length === 0)) {
            floatTimeSec += 1.0;
        }
    }

    // Sanity check — catches iteration-order bugs during development.
    const expectedLineCount = scenes.reduce(
        (acc, scene) =>
            acc + scene.characters.reduce((a, char) => a + char.dialogue.length, 0),
        0
    );
    if (timings.length !== expectedLineCount) {
        throw new Error(
            `[computeEpisodeTiming] Line count mismatch: expected ${expectedLineCount}, ` +
            `got ${timings.length}. Ensure the iteration uses scene.characters ` +
            `(with duplicates), not the deduplicated uniqueChars array.`
        );
    }

    return {
        totalFrames: Math.max(Math.round(floatTimeSec * FPS), FPS),
        dialogueTimings: timings,
        sceneStartFrames,
    };
}
