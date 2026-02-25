import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

// --- Character component ---
interface CharacterProps {
    x: number;
    y: number;
    bodyColor: string;
    headColor: string;
    hatColor?: string;
    isTalking?: boolean;
    bounceOffset: number;
    label?: string;
}

const Character: React.FC<CharacterProps> = ({
    x, y, bodyColor, headColor, hatColor, isTalking, bounceOffset, label,
}) => {
    return (
        <g transform={`translate(${x}, ${y + bounceOffset})`}>
            {/* Shadow */}
            <ellipse cx="0" cy="92" rx="28" ry="7" fill="rgba(0,0,0,0.3)" />

            {/* Body */}
            <rect x="-22" y="44" width="44" height="48" rx="6" fill={bodyColor} stroke="#1a1a2e" strokeWidth="3" />
            {/* Arms */}
            <rect x="-38" y="48" width="18" height="12" rx="5" fill={bodyColor} stroke="#1a1a2e" strokeWidth="2.5" />
            <rect x="20" y="48" width="18" height="12" rx="5" fill={bodyColor} stroke="#1a1a2e" strokeWidth="2.5" />
            {/* Legs */}
            <rect x="-16" y="86" width="13" height="20" rx="4" fill="#1a1a2e" />
            <rect x="3" y="86" width="13" height="20" rx="4" fill="#1a1a2e" />
            {/* Shoes */}
            <rect x="-20" y="100" width="17" height="10" rx="4" fill="#0f0f1e" />
            <rect x="3" y="100" width="17" height="10" rx="4" fill="#0f0f1e" />

            {/* Head */}
            <circle cx="0" cy="26" r="26" fill={headColor} stroke="#1a1a2e" strokeWidth="3" />

            {/* Eyes */}
            <circle cx="-9" cy="22" r="5" fill="white" stroke="#1a1a2e" strokeWidth="1.5" />
            <circle cx="9" cy="22" r="5" fill="white" stroke="#1a1a2e" strokeWidth="1.5" />
            <circle cx="-9" cy="23" r="2.5" fill="#1a1a2e" />
            <circle cx="9" cy="23" r="2.5" fill="#1a1a2e" />
            {/* Eye shine */}
            <circle cx="-8" cy="21" r="1" fill="white" />
            <circle cx="10" cy="21" r="1" fill="white" />

            {/* Mouth — open/close based on isTalking */}
            {isTalking ? (
                <ellipse cx="0" cy="36" rx="7" ry="5" fill="#1a1a2e" />
            ) : (
                <path d="M-6 36 Q0 40 6 36" stroke="#1a1a2e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            )}

            {/* Hat / hair */}
            {hatColor && (
                <>
                    <rect x="-20" y="2" width="40" height="14" rx="4" fill={hatColor} stroke="#1a1a2e" strokeWidth="2.5" />
                    <rect x="-15" y="-8" width="30" height="14" rx="4" fill={hatColor} stroke="#1a1a2e" strokeWidth="2.5" />
                </>
            )}

            {/* Name label */}
            {label && (
                <>
                    <rect x="-28" y="112" width="56" height="18" rx="5" fill="rgba(0,0,0,0.6)" stroke="#3d3d6e" strokeWidth="1.5" />
                    <text x="0" y="125" textAnchor="middle" fill="#c4b5fd" fontSize="11" fontFamily="Arial" fontWeight="bold">{label}</text>
                </>
            )}
        </g>
    );
};

// --- Snowflake ---
const Snowflake: React.FC<{ x: number; y: number; size: number; opacity: number }> = ({ x, y, size, opacity }) => (
    <text x={x} y={y} fontSize={size} opacity={opacity} fill="white" fontFamily="Arial">❄</text>
);

export const Scene3_EpisodePreview: React.FC<{ startFrame: number }> = ({ startFrame }) => {
    const frame = useCurrentFrame();
    const localFrame = frame - startFrame;

    // Camera pan — subtle rightward drift (220 frames for scene 3)
    const camX = interpolate(localFrame, [0, 219], [0, -30], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    const camScale = interpolate(localFrame, [0, 219], [1, 1.04], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    // Scene fade in
    const fadeIn = interpolate(localFrame, [0, 15], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    // Character bounces — sinusoidal idle (slower)
    const bounce1 = Math.sin((localFrame / 24) * Math.PI) * 4;
    const bounce2 = Math.sin((localFrame / 30 + 1) * Math.PI) * 3.5;
    const bounce3 = Math.sin((localFrame / 22 + 2.2) * Math.PI) * 4.5;

    // Talking — alternating characters (longer cycles)
    const talkCycle = Math.floor(localFrame / 35) % 4;
    const isTalking1 = talkCycle === 0;
    const isTalking2 = talkCycle === 2;
    const isTalking3 = talkCycle === 3;

    // Snowflake drift — 16 flakes (slower drift)
    const snowflakes = Array.from({ length: 16 }).map((_, i) => ({
        x: ((i * 137.5 + localFrame * (0.5 + i * 0.03)) % 960),
        y: ((i * 83.2 + localFrame * (0.7 + i * 0.05)) % 540),
        size: 10 + (i % 3) * 5,
        opacity: 0.3 + (i % 4) * 0.1,
    }));

    // Speech bubble opacity — simple fade based on cycle position
    const bubbleOpacity = isTalking2 ? 1 : 0;

    // "Generated Episode" banner fade in
    const bannerOpacity = interpolate(localFrame, [5, 20], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                opacity: fadeIn,
            }}
        >
            <svg
                viewBox="0 0 960 540"
                width="100%"
                height="100%"
                style={{ position: "absolute", inset: 0 }}
            >
                {/* Camera pan group */}
                <g transform={`translate(${camX}, 0) scale(${camScale})`} style={{ transformOrigin: "480px 270px" }}>

                    {/* Sky gradient */}
                    <defs>
                        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0a0a1f" />
                            <stop offset="60%" stopColor="#1a1a4e" />
                            <stop offset="100%" stopColor="#2d2d7a" />
                        </linearGradient>
                        <linearGradient id="snowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#e8eefa" />
                            <stop offset="100%" stopColor="#c8d4f0" />
                        </linearGradient>
                        <filter id="buildingGlow">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Sky */}
                    <rect x="-50" y="0" width="1060" height="400" fill="url(#skyGrad)" />

                    {/* Stars */}
                    {[{ x: 80, y: 40 }, { x: 200, y: 70 }, { x: 340, y: 30 }, { x: 500, y: 55 }, { x: 650, y: 25 }, { x: 780, y: 65 }, { x: 880, y: 45 }].map((s, i) => (
                        <circle key={i} cx={s.x} cy={s.y} r={1.5} fill="white" opacity={0.5 + Math.sin(localFrame / 30 + i) * 0.3} />
                    ))}

                    {/* Moon */}
                    <circle cx="820" cy="60" r="36" fill="#f0f0e0" stroke="#d0d0c0" strokeWidth="2" />
                    <circle cx="835" cy="52" r="28" fill="#1a1a4e" />

                    {/* Background hills / snow mounds */}
                    <path d="M-50 380 Q100 300 250 340 Q400 280 550 330 Q700 260 860 310 L1010 360 L1010 540 L-50 540Z" fill="url(#snowGrad)" stroke="#b0bce8" strokeWidth="2" />

                    {/* Background buildings */}
                    {/* Building 1 */}
                    <rect x="60" y="200" width="90" height="190" fill="#1e1e3a" stroke="#1a1a2e" strokeWidth="3" rx="2" />
                    <rect x="55" y="190" width="100" height="18" fill="#2a2a5a" stroke="#1a1a2e" strokeWidth="2" rx="2" />
                    {[0, 1, 2].map(r => [0, 1, 2].map(c => (
                        <rect key={`${r}${c}`} x={75 + c * 24} y={220 + r * 32} width="14" height="16" rx="2"
                            fill={Math.sin(localFrame / 40 + r * 1.3 + c * 0.7) > 0.3 ? "#f59e0b" : "#3d3d6e"} stroke="#1a1a2e" strokeWidth="1.5" />
                    )))}
                    {/* Building 2 */}
                    <rect x="750" y="160" width="80" height="230" fill="#1e1e3a" stroke="#1a1a2e" strokeWidth="3" rx="2" />
                    <rect x="746" y="152" width="88" height="16" fill="#2a2a5a" stroke="#1a1a2e" strokeWidth="2" rx="2" />
                    {[0, 1, 2, 3].map(r => [0, 1].map(c => (
                        <rect key={`bg2${r}${c}`} x={767 + c * 28} y={178 + r * 30} width="14" height="16" rx="2"
                            fill={Math.sin(localFrame / 35 + r * 0.9 + c * 1.4 + 2) > 0.2 ? "#7c3aed" : "#3d3d6e"} stroke="#1a1a2e" strokeWidth="1.5" />
                    )))}

                    {/* Mid-ground snow ground */}
                    <path d="M-50 420 Q150 400 320 410 Q500 395 680 408 Q800 398 1010 415 L1010 540 L-50 540Z" fill="white" stroke="#c8d4f0" strokeWidth="2" />
                    <path d="M-50 425 Q150 410 320 418 Q500 404 680 415 Q800 405 1010 422" fill="none" stroke="#a0b0d8" strokeWidth="1.5" opacity="0.5" />

                    {/* Foreground building — left */}
                    <rect x="100" y="270" width="120" height="195" fill="#16162a" stroke="#1a1a2e" strokeWidth="4" rx="3" />
                    <rect x="94" y="258" width="132" height="20" fill="#1e1e40" stroke="#1a1a2e" strokeWidth="3" rx="3" />
                    {/* Windows */}
                    {[0, 1, 2, 3].map(r => [0, 1, 2].map(c => (
                        <rect key={`fw${r}${c}`} x={115 + c * 32} y={282 + r * 38} width="18" height="20" rx="3"
                            fill={Math.sin(localFrame / 25 + r * 1.1 + c * 0.8 + 1) > 0 ? "#fbbf24" : "#1a1a3a"} stroke="#3d3d6e" strokeWidth="1.5" />
                    )))}
                    {/* Door */}
                    <rect x="148" y="420" width="24" height="45" rx="3" fill="#2a2a5a" stroke="#3d3d6e" strokeWidth="2" />

                    {/* Foreground building — right */}
                    <rect x="740" y="260" width="110" height="205" fill="#16162a" stroke="#1a1a2e" strokeWidth="4" rx="3" />
                    <rect x="734" y="248" width="122" height="20" fill="#1e1e40" stroke="#1a1a2e" strokeWidth="3" rx="3" />
                    {[0, 1, 2, 3].map(r => [0, 1].map(c => (
                        <rect key={`rw${r}${c}`} x={758 + c * 40} y={274 + r * 38} width="22" height="22" rx="3"
                            fill={Math.sin(localFrame / 28 + r * 0.7 + c * 1.2 + 3) > 0 ? "#a855f7" : "#1a1a3a"} stroke="#3d3d6e" strokeWidth="1.5" />
                    )))}
                    <rect x="760" y="428" width="24" height="37" rx="3" fill="#2a2a5a" stroke="#3d3d6e" strokeWidth="2" />

                    {/* Street / sidewalk */}
                    <rect x="-50" y="460" width="1060" height="80" fill="#0f0f1e" stroke="#1a1a2e" strokeWidth="2" />
                    {/* Street markings */}
                    {[0, 1, 2, 3, 4, 5, 6].map(i => (
                        <rect key={i} x={80 + i * 120} y="480" width="60" height="6" rx="2" fill="#2a2a4a" />
                    ))}

                    {/* Snow on ground + buildings */}
                    <rect x="100" y="241" width="120" height="19" rx="3" fill="white" opacity="0.9" />
                    <rect x="740" y="232" width="110" height="17" rx="3" fill="white" opacity="0.9" />

                    {/* ===== CHARACTERS ===== */}
                    {/* Character 1 — Cartman-style (purple jacket) */}
                    <Character
                        x={360}
                        y={360}
                        bodyColor="#6d28d9"
                        headColor="#f5cba7"
                        hatColor="#2c3e50"
                        bounceOffset={bounce1}
                        isTalking={isTalking1}
                        label="Cartman"
                    />

                    {/* Character 2 — Kyle-style (green jacket) */}
                    <Character
                        x={480}
                        y={350}
                        bodyColor="#1e8449"
                        headColor="#f0b27a"
                        bounceOffset={bounce2}
                        isTalking={isTalking2}
                        label="Kyle"
                    />

                    {/* Character 3 — Stan-style (blue/violet jacket) */}
                    <Character
                        x={600}
                        y={360}
                        bodyColor="#2980b9"
                        headColor="#f5cba7"
                        hatColor="#7c3aed"
                        bounceOffset={bounce3}
                        isTalking={isTalking3}
                        label="Stan"
                    />

                    {/* Speech bubble for Kyle when talking */}
                    {isTalking2 && (
                        <g opacity={Math.min(1, localFrame % 20 / 5)}>
                            <rect x="420" y="290" width="120" height="36" rx="10" fill="white" stroke="#1a1a2e" strokeWidth="2.5" />
                            <path d="M480 326 L476 342 L485 326Z" fill="white" stroke="#1a1a2e" strokeWidth="2" />
                            <text x="480" y="314" textAnchor="middle" fill="#1a1a2e" fontSize="13" fontFamily="Arial" fontWeight="bold">Dude!</text>
                        </g>
                    )}
                    {isTalking1 && (
                        <g opacity={Math.min(1, localFrame % 20 / 5)}>
                            <rect x="280" y="290" width="140" height="36" rx="10" fill="white" stroke="#1a1a2e" strokeWidth="2.5" />
                            <path d="M350 326 L346 342 L356 326Z" fill="white" stroke="#1a1a2e" strokeWidth="2" />
                            <text x="350" y="314" textAnchor="middle" fill="#1a1a2e" fontSize="12" fontFamily="Arial" fontWeight="bold">Respect my...</text>
                        </g>
                    )}

                    {/* Snowflakes */}
                    {snowflakes.map((s, i) => (
                        <Snowflake key={i} x={s.x} y={s.y} size={s.size} opacity={s.opacity} />
                    ))}

                    {/* "Episode Preview" floating badge */}
                    <g opacity={bannerOpacity}>
                        <rect x="352" y="14" width="256" height="36" rx="10" fill="rgba(124,58,237,0.9)" stroke="#9d65f5" strokeWidth="2.5" />
                        <circle cx="376" cy="32" r="7" fill="#22c55e" />
                        <text x="420" y="37" fill="white" fontSize="15" fontFamily="Arial" fontWeight="bold" letterSpacing="0.5">● Episode Preview</text>
                    </g>

                </g>
            </svg>
        </div>
    );
};
