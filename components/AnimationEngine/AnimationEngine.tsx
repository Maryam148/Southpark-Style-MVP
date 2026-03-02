"use client";

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import type { SceneData } from "./types";
import { getCharPlaceholder } from "@/lib/placeholderAssets";
import type { ExportAudioPlan } from "@/lib/exportAudio";
import {
    CANVAS_W, CANVAS_H,
    drawPlaceholderBg, drawCharacter, drawSubtitle,
} from "./drawHelpers";
import type { LayerImage, CharacterState } from "./drawHelpers";

/* ──────────────────────────────────────────────────────────
    Constants
   ────────────────────────────────────────────────────────── */
const MOUTH_SWAP_MS = 200;
const NO_AUDIO_LINE_MS = 1800;
const LINE_GAP_MS = 400;
const LOAD_TIMEOUT_MS = 5000;

/* ──────────────────────────────────────────────────────────
    Types
   ────────────────────────────────────────────────────────── */
interface EngineState {
    bg: LayerImage;
    characters: CharacterState[];
    globalDialogueQueue: { charIdx: number; originalCharIdx: number; lineIdx: number }[];
    currentQueueIdx: number;
    lastMouthSwap: number;
    done: boolean;
    totalBaseScale: number;
}

/* ──────────────────────────────────────────────────────────
    Image loader
   ────────────────────────────────────────────────────────── */
function loadLayerImage(src: string | null | undefined, fallbackColor: string): LayerImage {
    const layer: LayerImage = { img: null, loaded: false, color: fallbackColor };
    if (!src) { layer.loaded = true; return layer; }
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => { layer.img = img; layer.loaded = true; };
    img.onerror = () => { layer.loaded = true; };
    img.src = src;
    return layer;
}

/* ──────────────────────────────────────────────────────────
    Build engine state
   ────────────────────────────────────────────────────────── */
function buildState(scene: SceneData): EngineState {
    const bg = loadLayerImage(scene.background, "#2C3E50");
    const numChars = scene.characters.length;
    const totalBaseScale = numChars <= 3 ? 1.0 : Math.max(0.6, 3.5 / numChars);

    const characters: CharacterState[] = scene.characters.map((char, ci) => {
        const ph = getCharPlaceholder(char.name, ci);
        const assignedX = numChars === 1 ? 0.5 : 0.15 + (ci / (numChars - 1)) * 0.7;
        const mouths: Record<string, LayerImage> = {};
        if (char.assets.mouths) {
            for (const [key, url] of Object.entries(char.assets.mouths)) {
                mouths[key] = loadLayerImage(url, key === "neutral" ? ph.mouth : "#E74C3C");
            }
        }
        if (!mouths.neutral) mouths.neutral = loadLayerImage(null, ph.mouth);
        return {
            character: char,
            body: loadLayerImage(char.assets.body, ph.body),
            head: loadLayerImage(char.assets.head, ph.head),
            eyes: loadLayerImage(char.assets.eyes, ph.eyes),
            mouths,
            currentMouthShape: "neutral",
            isTalking: false,
            mouthOpen: false,
            dynamicX: assignedX,
        };
    });

    const uniqueCharacters = characters.filter((cs, index, self) =>
        index === self.findIndex((c) => c.character.name.toLowerCase() === cs.character.name.toLowerCase())
    );

    const globalDialogueQueue: { charIdx: number; originalCharIdx: number; lineIdx: number }[] = [];
    scene.characters.forEach((char, ci) => {
        const uniqueIdx = uniqueCharacters.findIndex(
            (uc) => uc.character.name.toLowerCase() === char.name.toLowerCase()
        );
        char.dialogue.forEach((_, li) => {
            globalDialogueQueue.push({ charIdx: uniqueIdx, originalCharIdx: ci, lineIdx: li });
        });
    });

    return {
        bg,
        characters: uniqueCharacters,
        globalDialogueQueue,
        currentQueueIdx: -1,
        lastMouthSwap: 0,
        done: globalDialogueQueue.length === 0,
        totalBaseScale,
    };
}

/* ──────────────────────────────────────────────────────────
    Props
   ────────────────────────────────────────────────────────── */
interface AnimationEngineProps {
    sceneData: SceneData;
    onSceneComplete?: () => void;
    onTimeUpdate?: (currentTime: number) => void;
    paused?: boolean;
    muted?: boolean;
    initialTime?: number;
    /**
     * Export capture: when provided, the engine's audio elements are routed
     * through this AudioContext → destination, so the SAME audio that drives
     * the animation is captured by the MediaRecorder. No separate audio system.
     */
    exportAudioCtx?: AudioContext;
    exportAudioDest?: MediaStreamAudioDestinationNode;
    exportAudioPlan?: ExportAudioPlan;
    /**
     * Persistent canvas owned by ScenePlayer. Every rendered frame is mirrored
     * here so MediaRecorder can capture the full episode uninterrupted across
     * scene remounts (AnimationEngine re-mounts on each scene change).
     */
    mirrorCanvasRef?: { current: HTMLCanvasElement | null };
}

/* ──────────────────────────────────────────────────────────
    Component
   ────────────────────────────────────────────────────────── */
export interface AnimationEngineHandle {
    unlockAudio: () => void;
}

const AnimationEngine = forwardRef<AnimationEngineHandle, AnimationEngineProps>(
    function AnimationEngine({
        sceneData,
        onSceneComplete,
        onTimeUpdate,
        paused = false,
        muted = false,
        initialTime: _initialTime = 0,
        exportAudioCtx,
        exportAudioDest,
        exportAudioPlan,
        mirrorCanvasRef,
    }, ref) {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        // Ref wrapper so the tick callback ([] deps) can always read the latest mirrorCanvasRef
        const mirrorCanvasRefRef = useRef(mirrorCanvasRef);
        mirrorCanvasRefRef.current = mirrorCanvasRef;

        useImperativeHandle(ref, () => ({
            unlockAudio: () => {
                const playAndPause = (audio: HTMLAudioElement) => {
                    const p = audio.play();
                    if (p !== undefined) {
                        p.then(() => audio.pause()).catch(() => { });
                    } else {
                        audio.pause();
                    }
                };
                if (audioRef.current) playAndPause(audioRef.current);
                if (preloadRef.current) playAndPause(preloadRef.current);
            }
        }));

        const stateRef = useRef<EngineState | null>(null);
        const rafRef = useRef<number>(0);

        const pausedRef = useRef(paused);
        pausedRef.current = paused;
        const sceneDataRef = useRef(sceneData);
        sceneDataRef.current = sceneData;
        const onCompleteRef = useRef(onSceneComplete);
        onCompleteRef.current = onSceneComplete;
        const onTimeUpdateRef = useRef(onTimeUpdate);
        onTimeUpdateRef.current = onTimeUpdate;

        /* ── Audio refs ──────────────────────────────────────── */
        const audioRef = useRef<HTMLAudioElement | null>(null);
        const preloadRef = useRef<HTMLAudioElement | null>(null);
        const preloadedUrlRef = useRef<string>("");
        const lastPlayedUrlRef = useRef<string>("");
        const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
        const audioUnlockedRef = useRef(false);
        const advanceGenRef = useRef(0);

        // Track MediaElementSourceNodes — can only create one per element
        const sourceNodeMapRef = useRef<WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>>(new WeakMap());

        // Ref wrappers for export props so connectToExport stays stable ([] deps).
        // Without this, connectToExport would re-create whenever exportAudioCtx changes,
        // causing useEffect([connectToExport]) to re-run and destroy live audio elements.
        const exportAudioCtxRef = useRef(exportAudioCtx);
        exportAudioCtxRef.current = exportAudioCtx;
        const exportAudioDestRef = useRef(exportAudioDest);
        exportAudioDestRef.current = exportAudioDest;
        const exportAudioPlanRef = useRef(exportAudioPlan);
        exportAudioPlanRef.current = exportAudioPlan;

        /* ── Clear timers ────────────────────────────────────── */
        const clearSafety = useCallback(() => {
            if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
            if (loadTimerRef.current) { clearTimeout(loadTimerRef.current); loadTimerRef.current = null; }
        }, []);

        /* ── Preload / prefetch helpers ─────────────────────── */
        const preloadVoice = useCallback((url: string) => {
            if (!url || preloadedUrlRef.current === url) return;
            const pre = preloadRef.current;
            if (!pre) return;
            preloadedUrlRef.current = url;
            pre.src = url;
            pre.load();
        }, []);

        const prefetchVoice = useCallback((url: string) => {
            if (!url) return;
            fetch(url, { method: "GET", cache: "force-cache" }).catch(() => { });
        }, []);

        /**
         * Route an audio element through the export AudioContext.
         * Once connected, audio goes through AudioContext → both speakers and recorder.
         * This can only be called ONCE per audio element (browser constraint).
         */
        const connectToExport = useCallback((el: HTMLAudioElement) => {
            // Read from refs so this callback is stable ([] deps).
            // If we closed over the props instead, any change to exportAudioCtx/Dest
            // would recreate this callback → re-run useEffect([connectToExport]) →
            // destroy active audio elements mid-playback → silent audio.
            const ctx = exportAudioCtxRef.current;
            const dest = exportAudioDestRef.current;
            if (!ctx || !dest) return;
            if (sourceNodeMapRef.current.has(el)) return; // already connected

            try {
                const source = ctx.createMediaElementSource(el);
                source.connect(dest);           // → recorder
                source.connect(ctx.destination); // → speakers
                sourceNodeMapRef.current.set(el, source);
            } catch (e) {
                console.warn("[AnimationEngine] Could not connect audio to export:", e);
            }
        }, []); // stable — ctx/dest always read from refs above

        /* ── Advance to next dialogue line ───────────────────── */
        const advanceFnRef = useRef<() => void>(() => { });

        const advance = useCallback(() => {
            clearSafety();
            const state = stateRef.current;
            if (!state || state.done) return;
            if (pausedRef.current) return;

            advanceGenRef.current++;

            const prevIdx = state.currentQueueIdx;
            if (prevIdx >= 0 && prevIdx < state.globalDialogueQueue.length) {
                const prev = state.globalDialogueQueue[prevIdx];
                const cs = state.characters[prev.charIdx];
                if (cs) { cs.isTalking = false; cs.mouthOpen = false; }
            }

            state.currentQueueIdx++;

            if (state.currentQueueIdx >= state.globalDialogueQueue.length) {
                state.done = true;
                audioRef.current?.pause();
                onCompleteRef.current?.();
                return;
            }

            const entry = state.globalDialogueQueue[state.currentQueueIdx];
            const cs = state.characters[entry.charIdx];
            // isTalking is set via the onStarted callback when audio actually begins,
            // so the mouth animation starts in sync with the audio, not before it.

            const scene = sceneDataRef.current;
            const line = scene.characters[entry.originalCharIdx]?.dialogue[entry.lineIdx];
            if (!line) {
                safetyTimerRef.current = setTimeout(() => advanceFnRef.current(), 100);
                return;
            }

            if (!line.line || line.line.trim() === "" || /^\[pause\]$/i.test(line.line.trim())) {
                if (cs) { cs.isTalking = false; cs.mouthOpen = false; }
                safetyTimerRef.current = setTimeout(() => advanceFnRef.current(), 800);
                return;
            }

            playLine(line.audio, line.line, () => { if (cs) cs.isTalking = true; });

            const nextIdx = state.currentQueueIdx + 1;
            if (nextIdx < state.globalDialogueQueue.length) {
                const ne = state.globalDialogueQueue[nextIdx];
                const nl = scene.characters[ne.originalCharIdx]?.dialogue[ne.lineIdx];
                if (nl?.audio) preloadVoice(nl.audio);
            }
            const next2Idx = state.currentQueueIdx + 2;
            if (next2Idx < state.globalDialogueQueue.length) {
                const ne2 = state.globalDialogueQueue[next2Idx];
                const nl2 = scene.characters[ne2.originalCharIdx]?.dialogue[ne2.lineIdx];
                if (nl2?.audio) prefetchVoice(nl2.audio);
            }
        }, [clearSafety, prefetchVoice]); // eslint-disable-line react-hooks/exhaustive-deps

        advanceFnRef.current = advance;

        /* ── Play a single line ──────────────────────────────── */
        // onStarted is called the moment audio actually begins playing (or immediately
        // for the no-audio fallback). We use this to start the mouth animation in sync
        // with the audio rather than starting it the moment advance() is called.
        const playLine = useCallback((url: string | undefined, text: string, onStarted?: () => void) => {
            const audio = audioRef.current;
            if (!audio) return;

            const gen = ++advanceGenRef.current;

            if (!url) {
                // No audio — start talking animation immediately (word-count timing)
                onStarted?.();
                const wordCount = text.trim().split(/\s+/).length;
                const dur = Math.max(NO_AUDIO_LINE_MS, wordCount * 350);
                safetyTimerRef.current = setTimeout(() => {
                    if (advanceGenRef.current !== gen) return;
                    advanceFnRef.current();
                }, dur + LINE_GAP_MS);
                return;
            }

            const plan = exportAudioPlanRef.current;
            if (plan && url) {
                plan.playClip(url);
                const buffer = plan.bufferMap.get(url);
                const durationMs = buffer ? buffer.duration * 1000 : text.trim().split(/\s+/).length * 400;

                if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
                safetyTimerRef.current = setTimeout(() => {
                    if (advanceGenRef.current !== gen) return;
                    advanceFnRef.current();
                }, durationMs + LINE_GAP_MS);
                return;
            }

            lastPlayedUrlRef.current = url;
            audio.pause();

            const pre = preloadRef.current;
            if (pre && preloadedUrlRef.current === url && pre.readyState >= 3) {
                const old = audioRef.current!;
                old.onended = null;
                old.onstalled = null;
                old.pause();
                audioRef.current = pre;
                preloadRef.current = old;
                preloadedUrlRef.current = "";
            } else {
                audio.src = url;
                audio.load();
            }

            const target = audioRef.current!;

            // Ensure this element is routed through the export AudioContext
            connectToExport(target);

            target.onended = () => {
                if (advanceGenRef.current !== gen) return;
                // Stop mouth animation the moment audio ends — not 400 ms later when
                // advance() runs. Without this the character keeps flapping in silence
                // during the LINE_GAP delay, which is clearly visible in exported video.
                const st = stateRef.current;
                if (st && st.currentQueueIdx >= 0) {
                    const entry = st.globalDialogueQueue[st.currentQueueIdx];
                    if (entry) {
                        const cs = st.characters[entry.charIdx];
                        if (cs) { cs.isTalking = false; cs.mouthOpen = false; }
                    }
                }
                setTimeout(() => advanceFnRef.current(), LINE_GAP_MS);
            };

            target.onstalled = () => {
                setTimeout(() => {
                    const a = audioRef.current;
                    if (a && a.src && a.paused && !a.ended && !pausedRef.current) {
                        a.load();
                        a.play().catch(() => { });
                    }
                }, 1500);
            };

            const doPlay = () => {
                if (loadTimerRef.current) { clearTimeout(loadTimerRef.current); loadTimerRef.current = null; }
                if (pausedRef.current) return;
                if (advanceGenRef.current !== gen) return;

                target.play().then(() => {
                    // Audio is now playing — start mouth animation in sync
                    onStarted?.();
                    if (safetyTimerRef.current) {
                        clearTimeout(safetyTimerRef.current);
                        safetyTimerRef.current = null;
                    }
                    const durationMs = isFinite(target.duration) && target.duration > 0
                        ? target.duration * 1000
                        : text.trim().split(/\s+/).length * 400;
                    safetyTimerRef.current = setTimeout(() => {
                        if (advanceGenRef.current !== gen) return;
                        console.warn("[AnimationEngine] Safety timeout — advancing");
                        advanceFnRef.current();
                    }, durationMs + 3000);
                }).catch((e) => {
                    console.warn("[AnimationEngine] play() failed:", e.message);
                    if (advanceGenRef.current !== gen) return;
                    // Play failed — still animate mouth for the word-count fallback duration
                    onStarted?.();
                    const wc = text.trim().split(/\s+/).length;
                    safetyTimerRef.current = setTimeout(() => {
                        if (advanceGenRef.current !== gen) return;
                        advanceFnRef.current();
                    }, Math.max(NO_AUDIO_LINE_MS, wc * 350) + LINE_GAP_MS);
                });
            };

            if (target.readyState >= 3) {
                doPlay();
            } else {
                target.addEventListener("canplaythrough", doPlay, { once: true });
                target.addEventListener("error", () => {
                    if (loadTimerRef.current) { clearTimeout(loadTimerRef.current); loadTimerRef.current = null; }
                    if (advanceGenRef.current !== gen) return;
                    advanceFnRef.current();
                }, { once: true });
                loadTimerRef.current = setTimeout(() => {
                    loadTimerRef.current = null;
                    if (advanceGenRef.current !== gen) return;
                    if (target.readyState >= 2) doPlay();
                    else advanceFnRef.current();
                }, LOAD_TIMEOUT_MS);
            }
        }, [connectToExport]); // eslint-disable-line react-hooks/exhaustive-deps

        /* ── Create audio elements once ──────────────────────── */
        useEffect(() => {
            // crossOrigin is only set when an AudioContext is active (i.e. during export).
            // createMediaElementSource() requires it for cross-origin audio; without it the
            // browser throws a SecurityError and audio isn't captured.
            // For normal playback we leave it unset: some browsers/networks fail the CORS
            // check silently and produce no audio, so we only pay the cost when we need it.
            const withCrossOrigin = !!exportAudioCtxRef.current;
            const makeAudio = () => {
                const a = new Audio();
                a.preload = "auto";
                if (withCrossOrigin) a.crossOrigin = "anonymous"; // Required for createMediaElementSource
                // Tiny silent WAV to unlock audio on iOS Safari
                a.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
                return a;
            };
            const audio = makeAudio();
            audioRef.current = audio;
            preloadRef.current = makeAudio();

            // Connect both elements to export if available
            connectToExport(audio);
            connectToExport(preloadRef.current);

            return () => {
                const cur = audioRef.current;
                if (cur) { cur.onended = null; cur.onstalled = null; cur.pause(); cur.src = ""; }
                audioRef.current = null;
                if (preloadRef.current) { preloadRef.current.pause(); preloadRef.current.src = ""; preloadRef.current = null; }
            };
        }, [connectToExport]);

        /* ── Handle play / pause transitions ──────────────────── */
        useEffect(() => {
            if (!paused) {
                const state = stateRef.current;
                if (!state || state.done) return;

                if (!audioUnlockedRef.current && state.currentQueueIdx === -1) {
                    audioUnlockedRef.current = true;
                    state.currentQueueIdx = 0;

                    const entry = state.globalDialogueQueue[0];
                    if (!entry) { state.done = true; onCompleteRef.current?.(); return; }

                    const cs = state.characters[entry.charIdx];

                    const line = sceneData.characters[entry.originalCharIdx]?.dialogue[entry.lineIdx];

                    if (state.globalDialogueQueue.length > 1) {
                        const ne = state.globalDialogueQueue[1];
                        const nl = sceneData.characters[ne.originalCharIdx]?.dialogue[ne.lineIdx];
                        if (nl?.audio) preloadVoice(nl.audio);
                    }
                    if (state.globalDialogueQueue.length > 2) {
                        const ne2 = state.globalDialogueQueue[2];
                        const nl2 = sceneData.characters[ne2.originalCharIdx]?.dialogue[ne2.lineIdx];
                        if (nl2?.audio) prefetchVoice(nl2.audio);
                    }

                    if (line) playLine(line.audio, line.line ?? "", () => { if (cs) cs.isTalking = true; });
                } else {
                    const audio = audioRef.current;
                    if (audio && audio.src && audio.paused && !audio.ended) {
                        audio.play().catch(() => { });
                    }
                }
            } else {
                clearSafety();
                audioRef.current?.pause();
            }
        }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

        /* ── rAF drawing loop ─────────────────────────────────── */
        const tick = useCallback((now: number) => {
            const state = stateRef.current;
            const canvas = canvasRef.current;
            if (!state || !canvas) { rafRef.current = requestAnimationFrame(tick); return; }
            const ctx = canvas.getContext("2d");
            if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

            if (!state.done && !pausedRef.current && now - state.lastMouthSwap >= MOUTH_SWAP_MS) {
                state.lastMouthSwap = now;
                const entry = state.currentQueueIdx >= 0 ? state.globalDialogueQueue[state.currentQueueIdx] : null;
                state.characters.forEach((cs) => {
                    if (cs.isTalking) {
                        if (entry) {
                            const dl = sceneDataRef.current.characters[entry.originalCharIdx]?.dialogue[entry.lineIdx];
                            cs.currentMouthShape = dl?.mouthShape || "talking";
                        }
                        cs.mouthOpen = !cs.mouthOpen;
                    } else {
                        cs.mouthOpen = false;
                    }
                });
            }

            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
            if (state.bg.img) {
                ctx.drawImage(state.bg.img, 0, 0, CANVAS_W, CANVAS_H);
            } else {
                drawPlaceholderBg(ctx, CANVAS_W, CANVAS_H);
            }
            state.characters.forEach((cs) => drawCharacter(ctx, cs, CANVAS_W, CANVAS_H, state.totalBaseScale));

            if (!state.done && state.currentQueueIdx >= 0) {
                const entry = state.globalDialogueQueue[state.currentQueueIdx];
                if (entry) {
                    const cs = state.characters[entry.charIdx];
                    const dl = sceneDataRef.current.characters[entry.originalCharIdx]?.dialogue[entry.lineIdx];
                    if (dl?.line && !/^\[pause\]$/i.test(dl.line.trim())) {
                        drawSubtitle(ctx, cs.character.name, dl.line, CANVAS_W, CANVAS_H);
                    }
                }
            }

            if (!state.done && state.currentQueueIdx >= 0) {
                const audio = audioRef.current;
                const lineOffset = (audio && !audio.paused && !isNaN(audio.currentTime)) ? audio.currentTime : 0;
                const lineDuration = NO_AUDIO_LINE_MS / 1000;
                onTimeUpdateRef.current?.(state.currentQueueIdx * lineDuration + lineOffset);
            }

            // Mirror frame to ScenePlayer's persistent canvas so MediaRecorder
            // captures the full episode across scene remounts.
            const mirrorCanvas = mirrorCanvasRefRef.current?.current;
            if (mirrorCanvas) {
                const mCtx = mirrorCanvas.getContext("2d");
                if (mCtx) mCtx.drawImage(canvas, 0, 0);
            }

            rafRef.current = requestAnimationFrame(tick);
        }, []);

        /* ── Mute / unmute ─────────────────────────────────────── */
        useEffect(() => {
            if (audioRef.current) audioRef.current.muted = muted;
            if (preloadRef.current) preloadRef.current.muted = muted;
        }, [muted]);

        /* ── Bootstrap: scene change ──────────────────────────── */
        useEffect(() => {
            audioUnlockedRef.current = false;
            lastPlayedUrlRef.current = "";
            advanceGenRef.current++;
            clearSafety();
            audioRef.current?.pause();

            const state = buildState(sceneData);
            stateRef.current = state;

            cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(tick);

            if (!pausedRef.current && !state.done && state.globalDialogueQueue.length > 0) {
                audioUnlockedRef.current = true;
                state.currentQueueIdx = 0;

                const entry = state.globalDialogueQueue[0];
                const cs = state.characters[entry.charIdx];

                const line = sceneData.characters[entry.originalCharIdx]?.dialogue[entry.lineIdx];

                if (state.globalDialogueQueue.length > 1) {
                    const ne = state.globalDialogueQueue[1];
                    const nl = sceneData.characters[ne.originalCharIdx]?.dialogue[ne.lineIdx];
                    if (nl?.audio) preloadVoice(nl.audio);
                }
                if (state.globalDialogueQueue.length > 2) {
                    const ne2 = state.globalDialogueQueue[2];
                    const nl2 = sceneData.characters[ne2.originalCharIdx]?.dialogue[ne2.lineIdx];
                    if (nl2?.audio) prefetchVoice(nl2.audio);
                }

                if (line) playLine(line.audio, line.line ?? "", () => { if (cs) cs.isTalking = true; });
            }

            return () => { cancelAnimationFrame(rafRef.current); clearSafety(); };
        }, [sceneData, tick, clearSafety, prefetchVoice]); // eslint-disable-line react-hooks/exhaustive-deps

        return (
            <div
                className="relative w-full overflow-hidden rounded-lg border border-sk-border bg-black cursor-pointer"
                onClick={() => {
                    const audio = audioRef.current;
                    if (audio && audio.src && audio.paused && !audio.ended && !pausedRef.current) {
                        audio.play().catch(() => { });
                    }
                }}
            >
                <canvas
                    ref={canvasRef}
                    width={CANVAS_W}
                    height={CANVAS_H}
                    className="block w-full h-auto"
                    style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
                />
            </div>
        );
    });

export default AnimationEngine;
