"use client";

import { useRef, useEffect, useCallback } from "react";
import type { SceneData, SceneCharacter } from "./types";
import { getCharPlaceholder } from "@/lib/placeholderAssets";

/* ──────────────────────────────────────────────────────────
    Constants
   ────────────────────────────────────────────────────────── */
const CANVAS_W = 1280;
const CANVAS_H = 720;
const MOUTH_SWAP_MS = 200;
const DIALOGUE_DURATION_MS = 3000;
const SUBTITLE_FONT = 'bold 22px "Inter", "Segoe UI", system-ui, sans-serif';
const SUBTITLE_PAD_X = 32;
const SUBTITLE_PAD_Y = 16;
const SUBTITLE_BOTTOM = 50;

/* Position map: percentage of canvas width → character center-x */
const _POSITION_X: Record<string, number> = {
    left: 0.2,
    center: 0.45,
    right: 0.7,
    front: 0.45,
    back: 0.45,
};

/* Scale by position (front bigger, back smaller) */
const _POSITION_SCALE: Record<string, number> = {
    left: 1,
    center: 1,
    right: 1,
    front: 1.15,
    back: 0.8,
};

/* ──────────────────────────────────────────────────────────
    Types
   ────────────────────────────────────────────────────────── */

/** An image OR a colored fallback rectangle */
interface LayerImage {
    img: HTMLImageElement | null;
    loaded: boolean;
    color: string; // fallback colour
}

interface CharacterState {
    character: SceneCharacter;
    body: LayerImage;
    head: LayerImage;
    eyes: LayerImage;
    mouths: Record<string, LayerImage>;
    currentMouthShape: string;
    isTalking: boolean;
    mouthOpen: boolean;
    dynamicX: number; // 0..1 horizontal position on canvas
}

interface EngineState {
    bg: LayerImage;
    characters: CharacterState[];
    globalDialogueQueue: { charIdx: number; originalCharIdx: number; lineIdx: number }[];
    currentQueueIdx: number;
    lastAdvance: number;
    lastMouthSwap: number;
    done: boolean;
    totalBaseScale: number; // calculated scale to fit characters
}

/* ──────────────────────────────────────────────────────────
    Image loader helper
   ────────────────────────────────────────────────────────── */
function loadLayerImage(
    src: string | null | undefined,
    fallbackColor: string
): LayerImage {
    const layer: LayerImage = { img: null, loaded: false, color: fallbackColor };
    if (!src) {
        layer.loaded = true; // will use fallback rect
        return layer;
    }
    const img = new Image();
    // Don't set crossOrigin for data URLs (they're same-origin by definition)
    if (!src.startsWith("data:")) {
        img.crossOrigin = "anonymous";
    }
    img.onload = () => {
        layer.img = img;
        layer.loaded = true;
    };
    img.onerror = () => {
        layer.loaded = true; // fallback
    };
    img.src = src;
    return layer;
}

/* ──────────────────────────────────────────────────────────
    Build initial engine state
   ────────────────────────────────────────────────────────── */
function buildState(scene: SceneData): EngineState {
    const bg = loadLayerImage(scene.background, "#2C3E50");

    const numChars = scene.characters.length;
    // Scale down if crowded (base scale is 1.0 for up to 3 chars, then shrinks)
    const totalBaseScale = numChars <= 3 ? 1.0 : Math.max(0.6, 3.5 / numChars);

    const characters: CharacterState[] = scene.characters.map((char, ci) => {
        // Look up character-specific placeholder colours
        const ph = getCharPlaceholder(char.name, ci);

        // Dynamically assign even horizontal positions (override script positions)
        // Spread from 15% to 85% of canvas width
        let assignedX: number;
        if (numChars === 1) {
            assignedX = 0.5;
        } else {
            assignedX = 0.15 + (ci / (numChars - 1)) * 0.7;
        }

        const mouths: Record<string, LayerImage> = {};
        if (char.assets.mouths) {
            for (const [key, url] of Object.entries(char.assets.mouths)) {
                mouths[key] = loadLayerImage(url, key === "neutral" ? ph.mouth : "#E74C3C");
            }
        }
        // ensure "neutral" always exists
        if (!mouths.neutral) {
            mouths.neutral = loadLayerImage(null, ph.mouth);
        }

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

    // Deduplicate characters by name to prevent double-speaking bugs if data is messy
    const uniqueCharacters = characters.filter((cs, index, self) =>
        index === self.findIndex((c) => c.character.name.toLowerCase() === cs.character.name.toLowerCase())
    );

    // Build a flat queue sequentially from characters array
    const globalDialogueQueue: { charIdx: number; originalCharIdx: number; lineIdx: number }[] = [];
    scene.characters.forEach((char, ci) => {
        // Map original char to unique index
        const uniqueIdx = uniqueCharacters.findIndex(uc => uc.character.name.toLowerCase() === char.name.toLowerCase());
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
        lastAdvance: 0,
        done: globalDialogueQueue.length === 0,
        totalBaseScale,
    };
}

/* ──────────────────────────────────────────────────────────
    Premium Gradient Helper
   ────────────────────────────────────────────────────────── */
function createPremiumGradient(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, baseColor: string) {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, baseColor);
    // Darken slightly for bottom
    grad.addColorStop(1, "rgba(0,0,0,0.2)");
    return grad;
}

/* ──────────────────────────────────────────────────────────
    Drawing helpers
   ────────────────────────────────────────────────────────── */

function drawLayer(
    ctx: CanvasRenderingContext2D,
    layer: LayerImage,
    x: number,
    y: number,
    w: number,
    h: number
) {
    if (layer.img) {
        ctx.drawImage(layer.img, x, y, w, h);
    } else {
        ctx.fillStyle = layer.color;
        ctx.fillRect(x, y, w, h);
    }
}

function drawCharacter(
    ctx: CanvasRenderingContext2D,
    cs: CharacterState,
    _canvasW: number,
    canvasH: number,
    baseGlobalScale: number
) {
    // Use dynamicX (evenly distributed) for horizontal positioning
    const cx = cs.dynamicX * _canvasW;

    // South Park characters: ~300px tall basis
    const scale = baseGlobalScale;
    const charW = Math.round(160 * scale);
    const charH = Math.round(300 * scale);
    const baseY = canvasH - charH - 60; // standing on "ground", offset up slightly

    const x = Math.round(cx - charW / 2);

    // --- Body ---
    drawLayer(ctx, cs.body, x, baseY + Math.round(charH * 0.35), charW, Math.round(charH * 0.65));

    // --- Head ---
    const headW = Math.round(charW * 0.85);
    const headH = Math.round(charH * 0.4);
    const headX = x + Math.round((charW - headW) / 2);
    const headY = baseY;
    drawLayer(ctx, cs.head, headX, headY, headW, headH);

    // --- Eyes ---
    const eyeW = Math.round(headW * 0.55);
    const eyeH = Math.round(headH * 0.28);
    const eyeX = headX + Math.round((headW - eyeW) / 2);
    const eyeY = headY + Math.round(headH * 0.25);
    drawLayer(ctx, cs.eyes, eyeX, eyeY, eyeW, eyeH);

    // --- Mouth ---
    const mouthW = Math.round(headW * 0.32);
    const mouthH = Math.round(headH * 0.18);
    const mouthX = headX + Math.round((headW - mouthW) / 2);
    const mouthY = headY + Math.round(headH * 0.65);

    // Determine which mouth frame to use
    let mouthLayer: LayerImage | undefined;
    if (cs.isTalking && cs.mouthOpen) {
        // We need the mouth shape from the CURRENT global line
        // But CharacterState doesn't know it directly anymore. 
        // We'll pass it in via cs or look it up.
        // For simplicity, I'll add currentMouthShape to CharacterState
        const shape = (cs as any).currentMouthShape || "talking";
        mouthLayer = cs.mouths[shape] || cs.mouths.talking || cs.mouths.neutral;
    } else {
        mouthLayer = cs.mouths.neutral;
    }
    if (mouthLayer) {
        if (!mouthLayer.img) {
            // Premium fallback mouth: soft-edged ellipse
            ctx.fillStyle = mouthLayer.color;
            ctx.beginPath();
            ctx.ellipse(mouthX + mouthW / 2, mouthY + mouthH / 2, mouthW / 2, mouthH / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            // Subtle lip highlight
            ctx.strokeStyle = "rgba(255,255,255,0.2)";
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            drawLayer(ctx, mouthLayer, mouthX, mouthY, mouthW, mouthH);
        }
    }

    // --- Indicator (if talking but no audio) ---
    if (cs.isTalking) {
        // We'd need to know if the current line has audio. 
        // For indicator, we can just check if mouth is moving manually or pass a flag.
        // For now, I'll remove the specific arc check here to avoid complex lookups in draw.
    }

    // --- Name label ---
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.font = '12px "Inter", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(cs.character.name, cx, baseY + charH + 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(cs.character.name, cx, baseY + charH + 15);
}

function drawSubtitle(
    ctx: CanvasRenderingContext2D,
    name: string,
    line: string,
    canvasW: number,
    canvasH: number
) {
    const text = `${name}: "${line}"`;
    ctx.font = SUBTITLE_FONT;
    ctx.textAlign = "center";

    const metrics = ctx.measureText(text);
    const tw = metrics.width;
    const boxW = tw + SUBTITLE_PAD_X * 2;
    const boxH = 36 + SUBTITLE_PAD_Y;
    const boxX = (canvasW - boxW) / 2;
    const boxY = canvasH - SUBTITLE_BOTTOM - boxH;

    // Backdrop with premium glassmorphism
    ctx.fillStyle = "rgba(15, 15, 20, 0.85)";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 12);
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Vibrant Outline
    ctx.strokeStyle = "rgba(139, 92, 246, 0.5)"; // violet-500
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 12);
    ctx.stroke();

    // Text with better contrast
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, canvasW / 2, boxY + boxH / 2 + 8);
}

/* ──────────────────────────────────────────────────────────
    Props
   ────────────────────────────────────────────────────────── */
interface AnimationEngineProps {
    sceneData: SceneData;
    onSceneComplete?: () => void;
    /** Reported every frame: (currentTimeInSec, durationInSec) */
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    /** When true the engine pauses drawing */
    paused?: boolean;
    /** Optional starting offset for the scene (in seconds) */
    initialTime?: number;
}

/* ──────────────────────────────────────────────────────────
    Component
   ────────────────────────────────────────────────────────── */
export default function AnimationEngine({
    sceneData,
    onSceneComplete,
    onTimeUpdate,
    paused = false,
    initialTime = 0,
}: AnimationEngineProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<EngineState | null>(null);
    /* ── State & Animation Refs ─────────────────────────── */
    const rafRef = useRef<number>(0);
    const lastNowRef = useRef<number>(0);
    const lastPlayedIdxRef = useRef<number>(-2);
    const onCompleteRef = useRef(onSceneComplete);
    onCompleteRef.current = onSceneComplete;
    const onTimeUpdateRef = useRef(onTimeUpdate);
    onTimeUpdateRef.current = onTimeUpdate;
    const initialTimeLoadedRef = useRef(false);

    /* ── Persistent Audio ───────────────────────────────── */
    const audioRef = useRef<HTMLAudioElement | null>(null);
    useEffect(() => {
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audioRef.current = audio;
        return () => {
            audio.pause();
            audio.src = "";
            audioRef.current = null;
        };
    }, []);

    const stopAudio = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
    }, []);

    const playVoice = useCallback((url: string | undefined, queueIdx: number, offsetMs: number = 0) => {
        if (lastPlayedIdxRef.current === queueIdx && offsetMs === 0) return;
        lastPlayedIdxRef.current = queueIdx;

        const audio = audioRef.current;
        if (!audio) return;

        audio.pause();
        if (!url) {
            console.log("[AnimationEngine] No audio for index", queueIdx);
            return;
        }

        console.log(`[AnimationEngine] Playing (${queueIdx}): ${url}`);
        audio.src = url;
        audio.load();

        if (offsetMs > 0) {
            const seek = () => {
                if (audio.readyState >= 1) { // HAVE_METADATA
                    audio.currentTime = offsetMs / 1000;
                    audio.removeEventListener("loadedmetadata", seek);
                }
            };
            audio.addEventListener("loadedmetadata", seek);
            seek();
        }

        if (!paused) {
            audio.play().catch(e => {
                console.warn("[AnimationEngine] Play failed (possible autoplay block):", e.message);
            });
        }
    }, [paused]);

    /* ── Main render loop ─────────────────────────────────── */
    const tick = useCallback(
        (now: number) => {
            const state = stateRef.current;
            const canvas = canvasRef.current;
            if (!state || !canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            /* —— Advance dialogue queue ————————————————————————— */
            if (!state.done && !paused) {

                // First frame or Seek: jump to initialTime
                if (state.currentQueueIdx === -1 || !initialTimeLoadedRef.current) {
                    let targetIdx = 0;
                    let accumulatedMs = 0;
                    const lineDuration = (DIALOGUE_DURATION_MS + 1200);

                    if (initialTime > 0) {
                        targetIdx = Math.floor((initialTime * 1000) / lineDuration);
                        accumulatedMs = targetIdx * lineDuration;
                        targetIdx = Math.min(targetIdx, state.globalDialogueQueue.length - 1);
                    }

                    state.currentQueueIdx = targetIdx;
                    state.lastAdvance = now - (initialTime * 1000 - accumulatedMs);
                    state.lastMouthSwap = now;
                    initialTimeLoadedRef.current = true;

                    // Reset all
                    state.characters.forEach((cs) => {
                        cs.isTalking = false;
                        cs.mouthOpen = false;
                        cs.currentMouthShape = "neutral";
                    });

                    if (state.globalDialogueQueue.length > targetIdx) {
                        const entry = state.globalDialogueQueue[targetIdx];
                        const cs = state.characters[entry.charIdx];
                        cs.isTalking = true;
                        // We need a way to pass the specific line to the character state for mouth shape
                        const line = sceneData.characters[entry.originalCharIdx].dialogue[entry.lineIdx];
                        const offset = initialTime * 1000 - accumulatedMs;
                        playVoice(line.audio, targetIdx, offset);
                    }
                }

                // Auto-advance
                const currentEntry = state.globalDialogueQueue[state.currentQueueIdx];
                if (currentEntry) {
                    const audio = audioRef.current;
                    const hasValidAudioDuration = audio && !isNaN(audio.duration) && audio.duration > 0;

                    let lineDuration: number;
                    const isReady = audio && audio.readyState >= 3; // HAVE_FUTURE_DATA

                    if (audio && !isReady) {
                        // If audio is present but not ready, wait a bit but don't hang for 10s
                        // If it takes more than 2s, we assume it's stuck or slow and use fallback duration
                        const timeLoading = now - state.lastAdvance;
                        lineDuration = timeLoading > 2000 ? (DIALOGUE_DURATION_MS + 1200) : 10000;
                    } else if (hasValidAudioDuration) {
                        lineDuration = audio!.duration * 1000 + 1200; // 1.2s padding
                    } else {
                        lineDuration = DIALOGUE_DURATION_MS + 1200;
                    }

                    const timeSinceAdvance = now - state.lastAdvance;
                    const audioEnded = audio?.ended || false;

                    if (audioEnded || timeSinceAdvance >= lineDuration) {
                        state.lastAdvance = now;

                        // Stop current talker
                        const prev = state.globalDialogueQueue[state.currentQueueIdx];
                        state.characters[prev.charIdx].isTalking = false;
                        state.characters[prev.charIdx].mouthOpen = false;

                        state.currentQueueIdx++;

                        if (state.currentQueueIdx >= state.globalDialogueQueue.length) {
                            state.done = true;
                            stopAudio();
                            onCompleteRef.current?.();
                        } else {
                            const entry = state.globalDialogueQueue[state.currentQueueIdx];
                            const ncs = state.characters[entry.charIdx];
                            ncs.isTalking = true;
                            const line = sceneData.characters[entry.originalCharIdx].dialogue[entry.lineIdx];
                            playVoice(line.audio, state.currentQueueIdx);
                        }
                    }
                }

                // Mouth animation
                const isAudioPlaying = audioRef.current && !audioRef.current.paused && !audioRef.current.ended;
                const shouldMouthMove = isAudioPlaying || (!audioRef.current && now - state.lastAdvance < DIALOGUE_DURATION_MS);

                if (now - state.lastMouthSwap >= MOUTH_SWAP_MS) {
                    state.lastMouthSwap = now;
                    state.characters.forEach((cs) => {
                        if (cs.isTalking) {
                            const entry = state.globalDialogueQueue[state.currentQueueIdx];
                            if (entry) {
                                const dl = sceneData.characters[entry.originalCharIdx].dialogue[entry.lineIdx];
                                (cs as any).currentMouthShape = dl?.mouthShape || "talking";
                            }
                            cs.mouthOpen = shouldMouthMove ? !cs.mouthOpen : false;
                        }
                    });
                }
            } else if (!state.done && paused) {
                if (audioRef.current && !audioRef.current.paused) {
                    audioRef.current.pause();
                }

                const diff = now - (lastNowRef.current || now);
                if (diff > 0) {
                    state.lastAdvance += diff;
                    state.lastMouthSwap += diff;
                }
            }
            lastNowRef.current = now;

            /* —— Draw ——————————————————————————————————————————— */
            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
            drawLayer(ctx, state.bg, 0, 0, CANVAS_W, CANVAS_H);

            state.characters.forEach((cs) => drawCharacter(ctx, cs, CANVAS_W, CANVAS_H, state.totalBaseScale));

            if (!state.done && state.currentQueueIdx >= 0) {
                const entry = state.globalDialogueQueue[state.currentQueueIdx];
                if (entry) {
                    const cs = state.characters[entry.charIdx];
                    const dl = sceneData.characters[entry.originalCharIdx].dialogue[entry.lineIdx];
                    if (dl) {
                        drawSubtitle(ctx, cs.character.name, dl.line, CANVAS_W, CANVAS_H);
                    }
                }
            }

            // Progress reporting
            if (state && !state.done) {
                const lineDuration = DIALOGUE_DURATION_MS + 1200;
                const totalSeconds = (state.globalDialogueQueue.length * lineDuration) / 1000;
                const currentSeconds = (state.currentQueueIdx * lineDuration + (now - state.lastAdvance)) / 1000;
                onTimeUpdateRef.current?.(Math.max(0, Math.min(currentSeconds, totalSeconds)), totalSeconds);
            }

            rafRef.current = requestAnimationFrame(tick);
        }, [paused, playVoice, stopAudio]);

    /* ── Manage play/pause state explicitly ──────────────── */
    useEffect(() => {
        if (!paused && audioRef.current?.paused && !audioRef.current.ended) {
            audioRef.current.play().catch(() => {
                // If it fails, we'll try again on next tick or wait for user interaction
            });
        } else if (paused && !audioRef.current?.paused) {
            audioRef.current?.pause();
        }
    }, [paused]);

    /* ── Effects ──────────────────────────────────────────── */
    useEffect(() => {
        stateRef.current = buildState(sceneData);
        rafRef.current = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(rafRef.current);
            // We handle audio cleanup in the specific audio useEffect
        };
    }, [sceneData, tick]);

    useEffect(() => {
        if (stateRef.current && initialTime !== undefined) {
            initialTimeLoadedRef.current = false;
        }
    }, [initialTime]);

    return (
        <div
            className="relative w-full overflow-hidden rounded-xl border border-gray-800 bg-black shadow-2xl cursor-pointer"
            onClick={() => {
                if (audioRef.current?.paused && !paused) {
                    audioRef.current.play().catch(() => { });
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
}
