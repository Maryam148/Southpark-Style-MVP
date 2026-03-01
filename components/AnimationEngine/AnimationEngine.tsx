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
/** Fallback duration per line when no audio URL (ms) */
const NO_AUDIO_LINE_MS = 3000;
/** Gap between lines for natural pacing (ms) */
const LINE_GAP_MS = 400;
/** Safety-net timeout per line — covers slow network / iOS stall (ms) */
const SAFETY_TIMEOUT_MS = 6000;
/** Max wait for canplaythrough before force-advancing (ms) */
const LOAD_TIMEOUT_MS = 5000;
const SUBTITLE_FONT = 'bold 22px "Inter", "Segoe UI", system-ui, sans-serif';
const SUBTITLE_PAD_X = 32;
const SUBTITLE_PAD_Y = 16;
const SUBTITLE_BOTTOM = 50;

/* ──────────────────────────────────────────────────────────
    Types
   ────────────────────────────────────────────────────────── */
interface LayerImage {
    img: HTMLImageElement | null;
    loaded: boolean;
    color: string;
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
    dynamicX: number;
}

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
    Draw helpers
   ────────────────────────────────────────────────────────── */
function drawLayer(ctx: CanvasRenderingContext2D, layer: LayerImage, x: number, y: number, w: number, h: number) {
    if (layer.img) {
        ctx.drawImage(layer.img, x, y, w, h);
    } else {
        ctx.fillStyle = layer.color;
        ctx.fillRect(x, y, w, h);
    }
}

/**
 * Draw a South Park–style placeholder background when no image asset is loaded.
 * Outdoor: gradient sky + green ground + building silhouettes.
 */
function drawPlaceholderBg(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number) {
    const groundY = Math.round(canvasH * 0.72);

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, "#5ba4d4");
    sky.addColorStop(1, "#b8ddf0");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvasW, groundY);

    // Distant buildings (lighter, behind)
    ctx.fillStyle = "rgba(80,90,120,0.28)";
    const farBuildings = [
        { x: 0.12, w: 0.08, h: 0.28 },
        { x: 0.22, w: 0.06, h: 0.20 },
        { x: 0.60, w: 0.10, h: 0.25 },
        { x: 0.72, w: 0.07, h: 0.32 },
        { x: 0.84, w: 0.09, h: 0.22 },
    ];
    for (const b of farBuildings) {
        const bx = Math.round(b.x * canvasW);
        const bw = Math.round(b.w * canvasW);
        const bh = Math.round(b.h * groundY);
        ctx.fillRect(bx, groundY - bh, bw, bh);
    }

    // Close buildings (darker)
    ctx.fillStyle = "rgba(55,65,95,0.55)";
    const closeBuildings = [
        { x: 0.0, w: 0.13, h: 0.40 },
        { x: 0.14, w: 0.09, h: 0.30 },
        { x: 0.76, w: 0.12, h: 0.44 },
        { x: 0.89, w: 0.11, h: 0.33 },
    ];
    for (const b of closeBuildings) {
        const bx = Math.round(b.x * canvasW);
        const bw = Math.round(b.w * canvasW);
        const bh = Math.round(b.h * groundY);
        ctx.fillRect(bx, groundY - bh, bw, bh);
        // Simple windows
        ctx.fillStyle = "rgba(255,240,150,0.35)";
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 2; col++) {
                ctx.fillRect(
                    bx + Math.round(bw * (0.2 + col * 0.42)),
                    groundY - bh + Math.round(bh * (0.15 + row * 0.2)),
                    Math.round(bw * 0.22), Math.round(bh * 0.1)
                );
            }
        }
        ctx.fillStyle = "rgba(55,65,95,0.55)";
    }

    // Ground
    const ground = ctx.createLinearGradient(0, groundY, 0, canvasH);
    ground.addColorStop(0, "#4a7c35");
    ground.addColorStop(1, "#2e5220");
    ctx.fillStyle = ground;
    ctx.fillRect(0, groundY, canvasW, canvasH - groundY);

    // Sidewalk strip
    ctx.fillStyle = "rgba(190,185,175,0.55)";
    ctx.fillRect(0, groundY, canvasW, Math.round((canvasH - groundY) * 0.35));
}

/**
 * Draw a South Park–style placeholder character when asset PNGs are not loaded.
 * Round head with a coloured hood, simple parka body, beady eyes, animated mouth.
 */
function drawSPCharacter(
    ctx: CanvasRenderingContext2D,
    cs: CharacterState,
    cx: number,
    feetY: number,
    charW: number,
    charH: number,
) {
    const bodyColor = cs.body.color;
    const skinColor = cs.head.color;

    /* ── Head geometry ── */
    const headR = Math.round(charW * 0.46);
    const headCY = Math.round(feetY - charH + headR * 1.1);

    /* ── Body (parka) ── */
    const bodyTop = headCY + Math.round(headR * 0.7);
    const bodyW = Math.round(charW * 0.9);
    const bodyH = Math.round(feetY - bodyTop);
    const bodyX = Math.round(cx - bodyW / 2);

    // Parka main fill
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(bodyX + 8, bodyTop);
    ctx.lineTo(bodyX + bodyW - 8, bodyTop);
    ctx.lineTo(bodyX + bodyW + 4, feetY);
    ctx.lineTo(bodyX - 4, feetY);
    ctx.closePath();
    ctx.fill();

    // Parka front zipper line
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = Math.max(2, charW * 0.025);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx, bodyTop + bodyH * 0.08);
    ctx.lineTo(cx, bodyTop + bodyH * 0.82);
    ctx.stroke();

    // Pockets
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    const pocketW = Math.round(bodyW * 0.24);
    const pocketH = Math.round(bodyH * 0.18);
    const pocketY = Math.round(bodyTop + bodyH * 0.52);
    ctx.fillRect(bodyX + Math.round(bodyW * 0.1), pocketY, pocketW, pocketH);
    ctx.fillRect(bodyX + Math.round(bodyW * 0.66), pocketY, pocketW, pocketH);

    /* ── Head circle (skin) ── */
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(cx, headCY, headR, 0, Math.PI * 2);
    ctx.fill();

    /* ── Hood (upper half, body colour) ── */
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(cx, headCY, headR * 1.04, Math.PI, Math.PI * 2);
    ctx.fill();
    // Hood inner shadow line
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, headCY, headR * 0.98, Math.PI + 0.15, Math.PI * 2 - 0.15);
    ctx.stroke();

    /* ── Eyes ── */
    const eyeY = headCY + Math.round(headR * 0.08);
    const eyeRx = Math.round(charW * 0.09);
    const eyeRy = Math.round(charW * 0.065);
    const eyeGap = Math.round(charW * 0.19);

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(cx - eyeGap, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + eyeGap, eyeY, eyeRx, eyeRy, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1a1a1a";
    const pupilR = Math.round(eyeRy * 0.62);
    ctx.beginPath();
    ctx.arc(cx - eyeGap, eyeY, pupilR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeGap, eyeY, pupilR, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    const shineR = Math.round(pupilR * 0.38);
    ctx.beginPath();
    ctx.arc(cx - eyeGap + shineR, eyeY - shineR, shineR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + eyeGap + shineR, eyeY - shineR, shineR, 0, Math.PI * 2);
    ctx.fill();

    /* ── Mouth ── */
    const mouthY = headCY + Math.round(headR * 0.52);
    if (cs.isTalking && cs.mouthOpen) {
        ctx.fillStyle = "#1a0000";
        ctx.beginPath();
        ctx.ellipse(cx, mouthY, Math.round(charW * 0.12), Math.round(charW * 0.07), 0, 0, Math.PI * 2);
        ctx.fill();
        // Teeth
        ctx.fillStyle = "#f5f5f5";
        ctx.fillRect(
            Math.round(cx - charW * 0.09),
            mouthY - Math.round(charW * 0.035),
            Math.round(charW * 0.18),
            Math.round(charW * 0.035)
        );
    } else {
        ctx.strokeStyle = "#333";
        ctx.lineWidth = Math.max(1.5, charW * 0.02);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx - Math.round(charW * 0.1), mouthY);
        ctx.lineTo(cx + Math.round(charW * 0.1), mouthY);
        ctx.stroke();
    }
}

function drawCharacter(ctx: CanvasRenderingContext2D, cs: CharacterState, canvasW: number, canvasH: number, scale: number) {
    const cx = Math.round(cs.dynamicX * canvasW);
    const charW = Math.round(170 * scale);
    const charH = Math.round(340 * scale);
    // Feet at 75% of canvas height — characters centred in the scene
    const feetY = Math.round(canvasH * 0.75);
    const baseY = feetY - charH;
    const x = Math.round(cx - charW / 2);

    const hasAssets = !!cs.body.img || !!cs.head.img;

    if (!hasAssets) {
        // South Park–style procedural character
        drawSPCharacter(ctx, cs, cx, feetY, charW, charH);
    } else {
        // Asset-based rendering (uploaded PNGs)
        drawLayer(ctx, cs.body, x, baseY + Math.round(charH * 0.35), charW, Math.round(charH * 0.65));

        const headW = Math.round(charW * 0.85);
        const headH = Math.round(charH * 0.4);
        const headX = x + Math.round((charW - headW) / 2);
        drawLayer(ctx, cs.head, headX, baseY, headW, headH);

        const eyeW = Math.round(headW * 0.55);
        const eyeH = Math.round(headH * 0.28);
        drawLayer(ctx, cs.eyes, headX + Math.round((headW - eyeW) / 2), baseY + Math.round(headH * 0.25), eyeW, eyeH);

        const mouthW = Math.round(headW * 0.32);
        const mouthH = Math.round(headH * 0.18);
        const mouthX = headX + Math.round((headW - mouthW) / 2);
        const mouthY = baseY + Math.round(headH * 0.65);
        const mouthLayer = (cs.isTalking && cs.mouthOpen)
            ? (cs.mouths[cs.currentMouthShape || "talking"] || cs.mouths.talking || cs.mouths.neutral)
            : cs.mouths.neutral;
        if (mouthLayer) {
            drawLayer(ctx, mouthLayer, mouthX, mouthY, mouthW, mouthH);
        }
    }

    // Name label
    ctx.font = 'bold 13px "Inter", system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(cs.character.name, cx, feetY + 17);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(cs.character.name, cx, feetY + 16);
}

/** roundRect polyfill — Safari < 15.4 and some iOS versions lack it */
function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
) {
    if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, w, h, r);
    } else {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}

/** Break `text` into lines that each fit within `maxWidth` pixels. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (ctx.measureText(candidate).width > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) lines.push(current);
    return lines;
}

function drawSubtitle(ctx: CanvasRenderingContext2D, name: string, line: string, canvasW: number, canvasH: number) {
    const fullText = `${name}: "${line}"`;
    ctx.font = SUBTITLE_FONT;
    ctx.textAlign = "center";

    const maxBoxW = canvasW - SUBTITLE_PAD_X * 2;
    const lines = wrapText(ctx, fullText, maxBoxW - SUBTITLE_PAD_X * 2);

    const lineH = 28;
    const boxW = Math.min(
        Math.max(...lines.map((l) => ctx.measureText(l).width)) + SUBTITLE_PAD_X * 2,
        maxBoxW
    );
    const boxH = lines.length * lineH + SUBTITLE_PAD_Y;
    const boxX = (canvasW - boxW) / 2;
    const boxY = canvasH - SUBTITLE_BOTTOM - boxH;

    ctx.fillStyle = "rgba(15, 15, 20, 0.85)";
    ctx.shadowBlur = 15;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    roundRect(ctx, boxX, boxY, boxW, boxH, 12);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(139, 92, 246, 0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    roundRect(ctx, boxX, boxY, boxW, boxH, 12);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    lines.forEach((l, i) => {
        ctx.fillText(l, canvasW / 2, boxY + SUBTITLE_PAD_Y / 2 + (i + 1) * lineH - 4);
    });
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
}

/* ──────────────────────────────────────────────────────────
    Component
   ────────────────────────────────────────────────────────── */
export default function AnimationEngine({
    sceneData,
    onSceneComplete,
    onTimeUpdate,
    paused = false,
    muted = false,
    initialTime = 0,
}: AnimationEngineProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<EngineState | null>(null);
    const rafRef = useRef<number>(0);

    // Always-fresh refs — avoids stale closures without adding to useCallback deps
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
    /** Refs for the ended/stalled handlers so they can be re-attached after swap */
    const onEndedRef = useRef<(() => void) | null>(null);
    const onStalledRef = useRef<(() => void) | null>(null);
    /** Set to true after first audio play has been triggered from a user gesture */
    const audioUnlockedRef = useRef(false);

    /* ── Clear safety & load timers ──────────────────────── */
    const clearSafety = useCallback(() => {
        if (safetyTimerRef.current) {
            clearTimeout(safetyTimerRef.current);
            safetyTimerRef.current = null;
        }
        if (loadTimerRef.current) {
            clearTimeout(loadTimerRef.current);
            loadTimerRef.current = null;
        }
    }, []);

    /* ── Preload / prefetch helpers ─────────────────────── */
    // Load the next line into the swap buffer for instant playback
    const preloadVoice = useCallback((url: string) => {
        if (!url || preloadedUrlRef.current === url) return;
        const pre = preloadRef.current;
        if (!pre) return;
        preloadedUrlRef.current = url;
        pre.src = url;
        pre.load();
    }, []);

    /** Kick off a plain fetch to warm the CDN/server cache without blocking playback */
    const prefetchVoice = useCallback((url: string) => {
        if (!url) return;
        fetch(url, { method: "GET", cache: "force-cache" }).catch(() => { });
    }, []);

    /* ── Advance to next dialogue line ─────────────────────
       Single source of truth for scene progression.
       Called by: audio 'ended' event, safety timeout, no-audio timer.
    ─────────────────────────────────────────────────────── */
    // Use a ref so the audio 'ended' listener always calls the latest version
    const advanceFnRef = useRef<() => void>(() => { });

    const advance = useCallback(() => {
        clearSafety();
        const state = stateRef.current;
        if (!state || state.done) return;
        // Don't advance if paused — will resume from correct position when unpaused
        if (pausedRef.current) return;

        // Stop current talker
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
        if (cs) cs.isTalking = true;

        const scene = sceneDataRef.current;
        const line = scene.characters[entry.originalCharIdx]?.dialogue[entry.lineIdx];
        if (!line) {
            safetyTimerRef.current = setTimeout(() => advanceFnRef.current(), 100);
            return;
        }

        // Pause marker or empty line — short pause, then advance
        if (!line.line || line.line.trim() === "" || /^\[pause\]$/i.test(line.line.trim())) {
            if (cs) { cs.isTalking = false; cs.mouthOpen = false; }
            safetyTimerRef.current = setTimeout(() => advanceFnRef.current(), 800);
            return;
        }

        playLine(line.audio, line.line);

        // Pre-load the next line into the swap buffer
        const nextIdx = state.currentQueueIdx + 1;
        if (nextIdx < state.globalDialogueQueue.length) {
            const ne = state.globalDialogueQueue[nextIdx];
            const nl = scene.characters[ne.originalCharIdx]?.dialogue[ne.lineIdx];
            if (nl?.audio) preloadVoice(nl.audio);
        }
        // Prefetch the line after that to warm the CDN cache
        const next2Idx = state.currentQueueIdx + 2;
        if (next2Idx < state.globalDialogueQueue.length) {
            const ne2 = state.globalDialogueQueue[next2Idx];
            const nl2 = scene.characters[ne2.originalCharIdx]?.dialogue[ne2.lineIdx];
            if (nl2?.audio) prefetchVoice(nl2.audio);
        }
    }, [clearSafety, prefetchVoice]); // eslint-disable-line react-hooks/exhaustive-deps

    advanceFnRef.current = advance;

    /* ── Re-attach ended/stalled listeners to the active audio element ── */
    const attachListeners = useCallback((el: HTMLAudioElement) => {
        // Remove from any previous element first
        const prevEnded = onEndedRef.current;
        const prevStalled = onStalledRef.current;

        // Create fresh handlers
        const onEnded = () => {
            setTimeout(() => advanceFnRef.current(), LINE_GAP_MS);
        };
        const onStalled = () => {
            setTimeout(() => {
                const a = audioRef.current;
                if (a && a.src && a.paused && !a.ended && !pausedRef.current) {
                    a.load();
                    a.play().catch(() => { });
                }
            }, 1500);
        };

        onEndedRef.current = onEnded;
        onStalledRef.current = onStalled;

        el.addEventListener("ended", onEnded);
        el.addEventListener("stalled", onStalled);

        // Return cleanup to remove just these listeners
        return { prevEnded, prevStalled };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Play a single line ──────────────────────────────── */
    const playLine = useCallback((url: string | undefined, text: string) => {
        const audio = audioRef.current;
        if (!audio) return;

        if (!url) {
            // No audio URL: advance after word-count-based estimate
            const wordCount = text.trim().split(/\s+/).length;
            const dur = Math.max(NO_AUDIO_LINE_MS, wordCount * 350);
            safetyTimerRef.current = setTimeout(() => advanceFnRef.current(), dur + LINE_GAP_MS);
            return;
        }

        // Avoid re-playing the same URL if already playing
        if (lastPlayedUrlRef.current === url && !audio.ended && !audio.paused) {
            safetyTimerRef.current = setTimeout(() => advanceFnRef.current(), SAFETY_TIMEOUT_MS);
            return;
        }
        lastPlayedUrlRef.current = url;

        audio.pause();

        // Swap in preloaded buffer if available for instant playback
        const pre = preloadRef.current;
        if (pre && preloadedUrlRef.current === url && pre.readyState >= 3) {
            const old = audioRef.current!;
            // Remove listeners from old element
            if (onEndedRef.current) old.removeEventListener("ended", onEndedRef.current);
            if (onStalledRef.current) old.removeEventListener("stalled", onStalledRef.current);
            // Swap
            audioRef.current = pre;
            preloadRef.current = old;
            preloadedUrlRef.current = "";
            // Re-attach listeners to the new active element
            attachListeners(pre);
        } else {
            audio.src = url;
            audio.load();
        }

        const target = audioRef.current!;
        const doPlay = () => {
            if (loadTimerRef.current) { clearTimeout(loadTimerRef.current); loadTimerRef.current = null; }
            if (pausedRef.current) return;
            target.play().then(() => {
                // Audio started — reset safety timer based on actual duration so long
                // lines aren't cut off by the fixed 6s cap set before play began.
                if (safetyTimerRef.current) {
                    clearTimeout(safetyTimerRef.current);
                    safetyTimerRef.current = null;
                }
                const durationMs = isFinite(target.duration) && target.duration > 0
                    ? target.duration * 1000
                    : text.trim().split(/\s+/).length * 400;
                safetyTimerRef.current = setTimeout(
                    () => advanceFnRef.current(),
                    durationMs + 3000  // 3s buffer past actual audio end
                );
            }).catch((e) => {
                console.warn("[AnimationEngine] play() failed:", e.message);
                // Fallback timer so scene still advances
                const wc = text.trim().split(/\s+/).length;
                safetyTimerRef.current = setTimeout(
                    () => advanceFnRef.current(),
                    Math.max(NO_AUDIO_LINE_MS, wc * 350) + LINE_GAP_MS
                );
            });
        };

        if (target.readyState >= 3) {
            doPlay();
        } else {
            target.addEventListener("canplaythrough", doPlay, { once: true });
            // Error fallback: if audio URL is broken, advance instead of freezing
            target.addEventListener("error", () => {
                console.warn("[AnimationEngine] Audio load error — advancing");
                if (loadTimerRef.current) { clearTimeout(loadTimerRef.current); loadTimerRef.current = null; }
                advanceFnRef.current();
            }, { once: true });
            // Load timeout: don't wait more than LOAD_TIMEOUT_MS for canplaythrough
            loadTimerRef.current = setTimeout(() => {
                console.warn("[AnimationEngine] Load timeout — force-playing or advancing");
                loadTimerRef.current = null;
                if (target.readyState >= 2) {
                    // Enough data to attempt play
                    doPlay();
                } else {
                    // Not enough data, just advance
                    advanceFnRef.current();
                }
            }, LOAD_TIMEOUT_MS);
        }

        // Safety net — advances scene if audio never ends (stall / network error)
        safetyTimerRef.current = setTimeout(() => {
            console.warn("[AnimationEngine] Safety timeout hit — advancing");
            advanceFnRef.current();
        }, SAFETY_TIMEOUT_MS);
    }, [attachListeners]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Create audio elements once ────────────────────────
       IMPORTANT: attach the 'ended' listener here.
       This is the primary scene-advance trigger — NOT the rAF loop.
    ─────────────────────────────────────────────────────── */
    useEffect(() => {
        const makeAudio = () => {
            const a = new Audio();
            a.preload = "auto";
            return a;
        };
        const audio = makeAudio();
        audioRef.current = audio;
        preloadRef.current = makeAudio();

        // Attach listeners via the shared helper so they track swaps
        attachListeners(audio);

        return () => {
            // Clean up listeners from whichever element is currently active
            const cur = audioRef.current;
            if (cur) {
                if (onEndedRef.current) cur.removeEventListener("ended", onEndedRef.current);
                if (onStalledRef.current) cur.removeEventListener("stalled", onStalledRef.current);
                cur.pause();
                cur.src = "";
            }
            audioRef.current = null;
            if (preloadRef.current) {
                preloadRef.current.pause();
                preloadRef.current.src = "";
                preloadRef.current = null;
            }
        };
    }, [attachListeners]); // run once (attachListeners is stable)

    /* ── Handle play / pause transitions ────────────────────
       This effect fires synchronously after a user gesture (click),
       so audio.play() called here IS in the gesture context — required on iOS.
    ─────────────────────────────────────────────────────── */
    useEffect(() => {
        if (!paused) {
            const state = stateRef.current;
            if (!state || state.done) return;

            if (!audioUnlockedRef.current && state.currentQueueIdx === -1) {
                // ── First play: initialize engine and start first line ──
                audioUnlockedRef.current = true;
                state.currentQueueIdx = 0;

                const entry = state.globalDialogueQueue[0];
                if (!entry) { state.done = true; onCompleteRef.current?.(); return; }

                const cs = state.characters[entry.charIdx];
                if (cs) cs.isTalking = true;

                const line = sceneData.characters[entry.originalCharIdx]?.dialogue[entry.lineIdx];

                // Pre-load line 1 into swap buffer while line 0 plays
                if (state.globalDialogueQueue.length > 1) {
                    const ne = state.globalDialogueQueue[1];
                    const nl = sceneData.characters[ne.originalCharIdx]?.dialogue[ne.lineIdx];
                    if (nl?.audio) preloadVoice(nl.audio);
                }
                // Prefetch line 2 to warm CDN cache
                if (state.globalDialogueQueue.length > 2) {
                    const ne2 = state.globalDialogueQueue[2];
                    const nl2 = sceneData.characters[ne2.originalCharIdx]?.dialogue[ne2.lineIdx];
                    if (nl2?.audio) prefetchVoice(nl2.audio);
                }

                if (line) playLine(line.audio, line.line ?? "");
            } else {
                // Resuming from pause: resume audio and safety timer
                const audio = audioRef.current;
                if (audio && audio.src && audio.paused && !audio.ended) {
                    audio.play().catch(() => { });
                }
            }
        } else {
            // Pausing: stop audio, clear safety timer
            clearSafety();
            audioRef.current?.pause();
        }
    }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── rAF drawing loop ───────────────────────────────────
       ONLY draws — never modifies engine state or triggers audio.
       Stable: depends on nothing that changes at runtime.
    ─────────────────────────────────────────────────────── */
    const tick = useCallback((now: number) => {
        const state = stateRef.current;
        const canvas = canvasRef.current;
        if (!state || !canvas) { rafRef.current = requestAnimationFrame(tick); return; }
        const ctx = canvas.getContext("2d");
        if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

        /* —— Mouth animation ———————————————————————————————— */
        if (!state.done && !pausedRef.current && now - state.lastMouthSwap >= MOUTH_SWAP_MS) {
            state.lastMouthSwap = now;
            const isPlaying = audioRef.current && !audioRef.current.paused && !audioRef.current.ended;
            const entry = state.currentQueueIdx >= 0
                ? state.globalDialogueQueue[state.currentQueueIdx]
                : null;
            state.characters.forEach((cs) => {
                if (cs.isTalking) {
                    if (entry) {
                        const dl = sceneDataRef.current.characters[entry.originalCharIdx]?.dialogue[entry.lineIdx];
                        cs.currentMouthShape = dl?.mouthShape || "talking";
                    }
                    cs.mouthOpen = !!isPlaying && !cs.mouthOpen;
                } else {
                    cs.mouthOpen = false;
                }
            });
        }

        /* —— Draw ——————————————————————————————————————————— */
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        if (state.bg.img) {
            ctx.drawImage(state.bg.img, 0, 0, CANVAS_W, CANVAS_H);
        } else {
            drawPlaceholderBg(ctx, CANVAS_W, CANVAS_H);
        }
        state.characters.forEach((cs) =>
            drawCharacter(ctx, cs, CANVAS_W, CANVAS_H, state.totalBaseScale)
        );

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

        /* —— Progress reporting ————————————————————————————— */
        if (!state.done && state.currentQueueIdx >= 0) {
            const audio = audioRef.current;
            const lineOffset = (audio && !audio.paused && !isNaN(audio.currentTime))
                ? audio.currentTime
                : 0;
            const lineDuration = NO_AUDIO_LINE_MS / 1000;
            onTimeUpdateRef.current?.(state.currentQueueIdx * lineDuration + lineOffset);
        }

        rafRef.current = requestAnimationFrame(tick);
    }, []); // ← NO deps: tick is stable. Uses refs for everything that changes.

    /* ── Bootstrap: only re-runs when the scene changes ────
       NEVER depends on `tick` or `paused` — that was the bug.
       If already playing (paused=false) when scene mounts — e.g. scene
       transitions — start audio immediately here instead of waiting for
       useEffect([paused]) which already fired with null state.
    ─────────────────────────────────────────────────────── */
    /* ── Mute / unmute ─────────────────────────────────────── */
    useEffect(() => {
        if (audioRef.current) audioRef.current.muted = muted;
        if (preloadRef.current) preloadRef.current.muted = muted;
    }, [muted]);

    useEffect(() => {
        audioUnlockedRef.current = false;
        lastPlayedUrlRef.current = "";
        clearSafety();
        audioRef.current?.pause();

        const state = buildState(sceneData);
        stateRef.current = state;

        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tick);

        // If we mounted while already playing (scene transition or replay),
        // kick off the first line right now — useEffect([paused]) already ran
        // with null state so it returned early.
        if (!pausedRef.current && !state.done && state.globalDialogueQueue.length > 0) {
            audioUnlockedRef.current = true;
            state.currentQueueIdx = 0;

            const entry = state.globalDialogueQueue[0];
            const cs = state.characters[entry.charIdx];
            if (cs) cs.isTalking = true;

            const line = sceneData.characters[entry.originalCharIdx]?.dialogue[entry.lineIdx];

            // Pre-load line 1 into swap buffer
            if (state.globalDialogueQueue.length > 1) {
                const ne = state.globalDialogueQueue[1];
                const nl = sceneData.characters[ne.originalCharIdx]?.dialogue[ne.lineIdx];
                if (nl?.audio) preloadVoice(nl.audio);
            }
            // Prefetch line 2 to warm CDN cache
            if (state.globalDialogueQueue.length > 2) {
                const ne2 = state.globalDialogueQueue[2];
                const nl2 = sceneData.characters[ne2.originalCharIdx]?.dialogue[ne2.lineIdx];
                if (nl2?.audio) prefetchVoice(nl2.audio);
            }

            if (line) playLine(line.audio, line.line ?? "");
        }

        return () => {
            cancelAnimationFrame(rafRef.current);
            clearSafety();
        };
    }, [sceneData, tick, clearSafety, prefetchVoice]); // tick is stable ([] deps), so this only fires on sceneData change

    return (
        <div
            className="relative w-full overflow-hidden rounded-lg border border-sk-border bg-black cursor-pointer"
            onClick={() => {
                // iOS: tap to recover if audio stalled
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
}
