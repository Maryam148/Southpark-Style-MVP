/**
 * EpisodeComposition — Remotion 4.x composition for server-side Lambda video export.
 *
 * Rendering model:
 *  - useCurrentFrame() drives visual state — no real-time audio events
 *  - @remotion/google-fonts/Inter loads Inter into Puppeteer before frame 0
 *    (fixes subtitle layout vs. Amazon Linux 2 which has no Inter)
 *  - All scene images are loaded with a single delayRender handle that blocks
 *    frame capture until both fonts and images are ready
 *  - Audio lines are scheduled via <Sequence> + <Audio> using pre-computed
 *    startFrames from computeEpisodeTiming — frame-accurate, no drift
 *
 * P1 note: The iteration order assertion (timings.length === expectedLineCount)
 * lives in lib/remotion/computeTimings.ts and is enforced at export-route time
 * before this composition ever receives the data.
 */

import React, { useRef, useEffect } from "react";
import {
    AbsoluteFill,
    Audio,
    Sequence,
    useCurrentFrame,
    delayRender,
    continueRender,
} from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import type { EpisodeTiming, DialogueTiming } from "@/lib/remotion/computeTimings";
import type { SceneData } from "@/components/AnimationEngine/types";
import { getCharPlaceholder } from "@/lib/placeholderAssets";
import {
    CANVAS_W,
    CANVAS_H,
    drawPlaceholderBg,
    drawCharacter,
    drawSubtitle,
} from "@/components/AnimationEngine/drawHelpers";
import type { LayerImage, CharacterState } from "@/components/AnimationEngine/drawHelpers";

/* Export-only resolution — 1080p. Browser preview stays at 720p (CANVAS_W/CANVAS_H). */
const EXPORT_W = 1920;
const EXPORT_H = 1080;

/* ──────────────────────────────────────────────────────────
    Font loading — module level so it starts before React renders.
    waitUntilDone() resolves when @font-face is applied in Puppeteer.
    fontFamily is the CSS name to use in ctx.font (e.g. "Inter").
   ────────────────────────────────────────────────────────── */
const { waitUntilDone: fontReady, fontFamily } = loadFont("normal", {
    weights: ["700"],
    subsets: ["latin"],
});

/* ──────────────────────────────────────────────────────────
    Types
   ────────────────────────────────────────────────────────── */
// Must extend Record<string, unknown> to satisfy Remotion's Composition<Props> constraint.
export interface EpisodeInputProps extends Record<string, unknown> {
    scenes: SceneData[];
    timing: EpisodeTiming;
}

/* ──────────────────────────────────────────────────────────
    calculateMetadata — tells Remotion the composition duration.
    Called by the Lambda coordinator before rendering starts.
    Returns durationInFrames derived from the pre-computed timing.
   ────────────────────────────────────────────────────────── */
export const episodeCalculateMetadata: CalculateMetadataFunction<EpisodeInputProps> = ({
    props,
}) => {
    return {
        durationInFrames: Math.max(1, props.timing.totalFrames),
        fps: 30,
        width: EXPORT_W,
        height: EXPORT_H,
    };
};

/* ──────────────────────────────────────────────────────────
    Frame drawing helpers
   ────────────────────────────────────────────────────────── */

/** Return the scene index that contains the given frame. */
function findSceneIdx(frame: number, sceneStartFrames: number[]): number {
    let idx = 0;
    for (let i = 0; i < sceneStartFrames.length; i++) {
        if (frame >= sceneStartFrames[i]) idx = i;
        else break;
    }
    return idx;
}

/** Return the active dialogue timing for this frame, or null. */
function findActiveDialogue(frame: number, timings: DialogueTiming[]): DialogueTiming | null {
    for (const t of timings) {
        if (frame >= t.startFrame && frame < t.startFrame + t.durationFrames) {
            return t;
        }
    }
    return null;
}

/**
 * Draw one frame to the canvas.
 * Mirrors AnimationEngine.tsx tick() exactly:
 *  - same buildState deduplication logic
 *  - same character/mouth layout
 *  - same subtitle rendering
 */
function drawEpisodeFrame(
    ctx: CanvasRenderingContext2D,
    frame: number,
    scenes: SceneData[],
    timing: EpisodeTiming,
    imageMap: Map<string, HTMLImageElement>,
    sceneDialogueByScene: DialogueTiming[][] | null,
): void {
    ctx.clearRect(0, 0, EXPORT_W, EXPORT_H);

    const sceneIdx = findSceneIdx(frame, timing.sceneStartFrames);
    const scene = scenes[sceneIdx];
    if (!scene) return;

    // Background
    const bgImg = scene.background ? imageMap.get(scene.background) : undefined;
    if (bgImg) {
        ctx.drawImage(bgImg, 0, 0, EXPORT_W, EXPORT_H);
    } else {
        drawPlaceholderBg(ctx, EXPORT_W, EXPORT_H);
    }

    // Find the active dialogue line for this frame, scoped to the current scene.
    const sceneTimings =
        sceneDialogueByScene?.[sceneIdx] && sceneDialogueByScene[sceneIdx].length > 0
            ? sceneDialogueByScene[sceneIdx]
            : timing.dialogueTimings;
    const activeTiming = findActiveDialogue(frame, sceneTimings);
    const activeCharIdx = activeTiming?.charIdx ?? -1;

    // Alternate mouth open/closed every 6 frames (≈ 200 ms at 30 fps — matches MOUTH_SWAP_MS)
    const mouthOpen = Math.floor(frame / 6) % 2 === 0;

    // Build unique character list — same deduplication as AnimationEngine.buildState
    const uniqueChars = scene.characters.filter((c, i, arr) =>
        i === arr.findIndex((x) => x.name.toLowerCase() === c.name.toLowerCase())
    );
    const numChars = uniqueChars.length;
    const totalBaseScale = numChars <= 3 ? 1.0 : Math.max(0.6, 3.5 / numChars);

    const makeLayer = (url: string | undefined, fallback: string): LayerImage => ({
        img: url ? (imageMap.get(url) ?? null) : null,
        loaded: true,
        color: fallback,
    });

    const charStates: CharacterState[] = uniqueChars.map((char, ci) => {
        const ph = getCharPlaceholder(char.name, ci);
        const assignedX = numChars === 1 ? 0.5 : 0.15 + (ci / (numChars - 1)) * 0.7;
        const mouths: Record<string, LayerImage> = {};
        for (const [key, url] of Object.entries(char.assets.mouths)) {
            mouths[key] = makeLayer(url || undefined, key === "neutral" ? ph.mouth : "#E74C3C");
        }
        if (!mouths.neutral) mouths.neutral = { img: null, loaded: true, color: ph.mouth };
        const isTalking = ci === activeCharIdx;
        return {
            character: char,
            body: makeLayer(char.assets.body || undefined, ph.body),
            head: makeLayer(char.assets.head || undefined, ph.head),
            eyes: makeLayer(char.assets.eyes || undefined, ph.eyes),
            mouths,
            currentMouthShape: activeTiming?.mouthShape ?? "talking",
            isTalking,
            mouthOpen: isTalking && mouthOpen,
            dynamicX: assignedX,
        };
    });

    // Draw characters
    for (const cs of charStates) {
        drawCharacter(ctx, cs, EXPORT_W, EXPORT_H, totalBaseScale);
    }

    // Draw subtitle using the @remotion/google-fonts family name to ensure
    // Puppeteer uses the loaded Inter rather than a system-font fallback.
    if (activeTiming && activeTiming.text && !/^\[pause\]$/i.test(activeTiming.text.trim())) {
        const cs = charStates[activeTiming.charIdx];
        if (cs) {
            drawSubtitle(
                ctx,
                cs.character.name,
                activeTiming.text,
                EXPORT_W,
                EXPORT_H,
                `bold 30px "${fontFamily}", "Segoe UI", system-ui, sans-serif`,
            );
        }
    }
}

/* ──────────────────────────────────────────────────────────
    EpisodeComposition component
   ────────────────────────────────────────────────────────── */
export const EpisodeComposition: React.FC<EpisodeInputProps> = ({ scenes, timing }) => {
    const frame = useCurrentFrame();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageMapRef = useRef(new Map<string, HTMLImageElement>());
    const loadedRef = useRef(false);
    const sceneDialogueRef = useRef<DialogueTiming[][] | null>(null);

    // Build a per-scene dialogue index once per timing payload so that
    // findActiveDialogue only scans the current scene's lines instead of
    // the entire episode on every frame.
    if (!sceneDialogueRef.current) {
        const sceneCount = Math.max(timing.sceneStartFrames.length, scenes.length);
        const byScene: DialogueTiming[][] = Array.from({ length: sceneCount }, () => []);
        for (const t of timing.dialogueTimings) {
            if (t.sceneIdx >= 0 && t.sceneIdx < byScene.length) {
                byScene[t.sceneIdx].push(t);
            }
        }
        // Ensure timings within each scene are ordered by startFrame so the
        // linear scan in findActiveDialogue can stay efficient.
        sceneDialogueRef.current = byScene.map((list) =>
            list.slice().sort((a, b) => a.startFrame - b.startFrame),
        );
    }

    /* ── Load Inter + all scene images once per Puppeteer session ──
       delayRender blocks Remotion from capturing any frame until
       continueRender is called — ensures frame 0 has all resources.
    ─────────────────────────────────────────────────────────────── */
    useEffect(() => {
        const handle = delayRender("Loading fonts and images", {
            timeoutInMilliseconds: 120_000, // 120 s — large episodes may have many assets
        });

        // Collect every image URL across all scenes
        const urls = new Set<string>();
        for (const scene of scenes) {
            if (scene.background) urls.add(scene.background);
            for (const char of scene.characters) {
                if (char.assets.body) urls.add(char.assets.body);
                if (char.assets.head) urls.add(char.assets.head);
                if (char.assets.eyes) urls.add(char.assets.eyes);
                for (const url of Object.values(char.assets.mouths)) {
                    if (url) urls.add(url);
                }
            }
        }

        const imagePromises = Array.from(urls).map(
            (url) =>
                new Promise<void>((resolve) => {
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => {
                        imageMapRef.current.set(url, img);
                        resolve();
                    };
                    img.onerror = () => resolve(); // never block on a failed asset
                    img.src = url;
                }),
        );

        Promise.all([fontReady(), ...imagePromises])
            .then(() => {
                loadedRef.current = true;
                continueRender(handle);
            })
            .catch(() => {
                // Continue even on partial failure — missing assets render as placeholders
                loadedRef.current = true;
                continueRender(handle);
            });

        return () => {
            // If the component unmounts before loading finishes, release the handle
            // so Remotion does not hang indefinitely.
            if (!loadedRef.current) {
                loadedRef.current = true;
                continueRender(handle);
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Draw the current frame to the canvas ───────────────
       Runs after every render. Remotion changes useCurrentFrame()
       → React re-renders → this effect fires → canvas is updated
       → Remotion takes the screenshot.
    ─────────────────────────────────────────────────────── */
    useEffect(() => {
        if (!loadedRef.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        drawEpisodeFrame(
            ctx,
            frame,
            scenes,
            timing,
            imageMapRef.current,
            sceneDialogueRef.current,
        );
    }, [frame, scenes, timing]);

    return (
        <AbsoluteFill style={{ backgroundColor: "#000" }}>
            {/* Canvas for all visual rendering */}
            <canvas
                ref={canvasRef}
                width={EXPORT_W}
                height={EXPORT_H}
                style={{ width: "100%", height: "100%" }}
            />

            {/* Audio — one <Sequence>+<Audio> per dialogue line with a URL.
                startFrame and durationFrames come from computeEpisodeTiming,
                so audio is frame-accurate and matches the visual. */}
            {timing.dialogueTimings.map((t, i) =>
                t.audioUrl ? (
                    <Sequence key={i} from={t.startFrame} durationInFrames={t.durationFrames}>
                        <Audio src={t.audioUrl} />
                    </Sequence>
                ) : null,
            )}
        </AbsoluteFill>
    );
};
