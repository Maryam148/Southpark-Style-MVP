/**
 * drawHelpers — pure Canvas 2D draw functions shared between:
 *   - AnimationEngine.tsx  (browser real-time player)
 *   - EpisodeComposition.tsx  (Remotion / Lambda frame renderer)
 *
 * No React hooks, no audio, no side effects.
 * Works in both browser and Puppeteer/Node environments.
 */

import type { SceneCharacter } from "./types";

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

export const SUBTITLE_PAD_X = 32;
export const SUBTITLE_PAD_Y = 16;
export const SUBTITLE_BOTTOM = 50;

export const DEFAULT_SUBTITLE_FONT = 'bold 22px "Inter", "Segoe UI", system-ui, sans-serif';

export interface LayerImage {
    img: HTMLImageElement | null;
    loaded: boolean;
    color: string;
}

export interface CharacterState {
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

export function drawLayer(
    ctx: CanvasRenderingContext2D,
    layer: LayerImage,
    x: number, y: number, w: number, h: number,
) {
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
export function drawPlaceholderBg(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
) {
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
export function drawSPCharacter(
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

export function drawCharacter(
    ctx: CanvasRenderingContext2D,
    cs: CharacterState,
    canvasW: number,
    canvasH: number,
    scale: number,
) {
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
export function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
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
export function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
): string[] {
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

/**
 * Draw a subtitle box with the character name and dialogue line.
 * @param subtitleFont - Optional CSS font string override. Defaults to DEFAULT_SUBTITLE_FONT.
 *   Pass the fontFamily from @remotion/google-fonts in the Lambda composition to ensure
 *   the loaded Inter is used rather than the system-font fallback.
 */
export function drawSubtitle(
    ctx: CanvasRenderingContext2D,
    name: string,
    line: string,
    canvasW: number,
    canvasH: number,
    subtitleFont = DEFAULT_SUBTITLE_FONT,
) {
    const fullText = `${name}: "${line}"`;
    ctx.font = subtitleFont;
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
