import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CursorAnimation } from "./CursorAnimation";

// --- Line data for script text that fills in ---
const SCRIPT_LINES = [
    "EXT. SOUTH PARK STREET - DAY",
    "",
    "CARTMAN walks up to KYLE, grinning.",
    "",
    "CARTMAN",
    '  "Dude, I have the best idea..."',
    "",
    "KYLE",
    '  "No. Absolutely not."',
    "",
    "[SCENE: Snowy town square]",
];

export const Scene1_ScriptUpload: React.FC<{ startFrame: number }> = ({ startFrame }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const localFrame = frame - startFrame;

    // File icon drag path: starts top-right, lands in textarea — slower
    const fileX = interpolate(localFrame, [0, 60, 100], [680, 680, 460], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    const fileY = interpolate(localFrame, [0, 60, 100], [80, 80, 220], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    const fileOpacity = interpolate(localFrame, [0, 8, 105, 120], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    // Textarea glow when file drops
    const glowOpacity = interpolate(localFrame, [100, 108, 118, 140], [0, 1, 0.6, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    // Each text line fades in sequentially after frame 120 — slower pace
    const linesVisible = SCRIPT_LINES.map((_, i) => {
        const lineStart = 122 + i * 5;
        return interpolate(localFrame, [lineStart, lineStart + 5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
        });
    });

    // Panel slide up spring
    const panelY = spring({
        frame: localFrame,
        fps,
        config: { damping: 18, stiffness: 120 },
        from: 60,
        to: 0,
    });

    // Upload label spring
    const labelScale = spring({
        frame: localFrame,
        fps,
        config: { damping: 15, stiffness: 200 },
        from: 0.6,
        to: 1,
    });

    return (
        <div
            style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#000000",
                overflow: "hidden",
            }}
        >
            {/* Background grid lines — techy feel */}
            <svg
                style={{ position: "absolute", inset: 0, opacity: 0.04 }}
                width="100%"
                height="100%"
            >
                {Array.from({ length: 20 }).map((_, i) => (
                    <line key={`v${i}`} x1={`${i * 5}%`} y1="0" x2={`${i * 5}%`} y2="100%" stroke="#8b5cf6" strokeWidth="1" />
                ))}
                {Array.from({ length: 12 }).map((_, i) => (
                    <line key={`h${i}`} x1="0" y1={`${i * 8.5}%`} x2="100%" y2={`${i * 8.5}%`} stroke="#8b5cf6" strokeWidth="1" />
                ))}
            </svg>

            {/* Main panel */}
            <div
                style={{
                    transform: `translateY(${panelY}px)`,
                    width: 760,
                    background: "#0c0c1e",
                    border: "2px solid #2a2a50",
                    borderRadius: 20,
                    padding: 36,
                    boxShadow: "0 30px 80px rgba(0,0,0,0.8), 0 0 60px rgba(139,92,246,0.08)",
                    position: "relative",
                }}
            >
                {/* Title bar dots */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {["#8b5cf6", "#a78bfa", "#c4b5fd"].map((c) => (
                        <div key={c} style={{ width: 14, height: 14, borderRadius: "50%", background: c, border: "2px solid rgba(0,0,0,0.3)" }} />
                    ))}
                    <div style={{ flex: 1, height: 14, background: "#080814", borderRadius: 6, marginLeft: 8 }} />
                </div>

                {/* Upload label badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <div
                        style={{
                            transform: `scale(${labelScale})`,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            background: "#7c3aed",
                            borderRadius: 10,
                            padding: "6px 14px",
                            border: "2px solid #9d65f5",
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="white" stroke="#fff" strokeWidth="0.5" />
                            <polyline points="14 2 14 8 20 8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                        </svg>
                        <span style={{ color: "white", fontFamily: "monospace", fontWeight: 700, fontSize: 14 }}>
                            Upload Script
                        </span>
                    </div>
                </div>

                {/* Script textarea */}
                <div
                    style={{
                        background: "#060612",
                        border: `2px solid ${glowOpacity > 0 ? "#8b5cf6" : "#1e1e3a"}`,
                        borderRadius: 12,
                        padding: "16px 20px",
                        minHeight: 260,
                        boxShadow: glowOpacity > 0
                            ? `0 0 ${30 * glowOpacity}px rgba(139, 92, 246, ${glowOpacity * 0.8}), inset 0 0 ${20 * glowOpacity}px rgba(139,92,246,${glowOpacity * 0.15})`
                            : "none",
                        transition: "border-color 0.1s, box-shadow 0.1s",
                    }}
                >
                    {/* Line numbers + text */}
                    {SCRIPT_LINES.map((line, i) => (
                        <div
                            key={i}
                            style={{
                                display: "flex",
                                gap: 16,
                                opacity: linesVisible[i],
                                marginBottom: 4,
                            }}
                        >
                            <span style={{ color: "#2a2a50", fontFamily: "monospace", fontSize: 13, minWidth: 24, textAlign: "right" }}>
                                {line ? i + 1 : ""}
                            </span>
                            <span
                                style={{
                                    color: line.startsWith("EXT.") || line.startsWith("[")
                                        ? "#a78bfa"
                                        : line === line.toUpperCase() && line.trim().length > 0 && !line.includes('"')
                                            ? "#f59e0b"
                                            : "#c8cee0",
                                    fontFamily: "monospace",
                                    fontSize: 13,
                                    lineHeight: 1.6,
                                    textShadow: linesVisible[i] > 0.5 ? "0 0 8px rgba(139,92,246,0.4)" : "none",
                                }}
                            >
                                {line || " "}
                            </span>
                        </div>
                    ))}

                    {/* Blinking cursor at end */}
                    {localFrame > 122 && (
                        <div
                            style={{
                                display: "inline-block",
                                width: 2,
                                height: 16,
                                background: "#8b5cf6",
                                marginLeft: 40,
                                opacity: Math.floor((localFrame - 122) / 15) % 2 === 0 ? 1 : 0,
                            }}
                        />
                    )}
                </div>
            </div>

            {/* Animated file icon being dragged */}
            <div
                style={{
                    position: "absolute",
                    left: fileX + 380 - 760 / 2,
                    top: fileY + 540 / 2 - 200,
                    opacity: fileOpacity,
                    pointerEvents: "none",
                    zIndex: 50,
                    filter: "drop-shadow(4px 6px 8px rgba(0,0,0,0.7))",
                }}
            >
                <svg width="52" height="62" viewBox="0 0 52 62" fill="none">
                    <rect x="2" y="2" width="36" height="46" rx="5" fill="#7c3aed" stroke="#1a1a2e" strokeWidth="3" />
                    <rect x="2" y="2" width="36" height="46" rx="5" fill="url(#fileGrad)" />
                    <path d="M26 2 L38 14 L26 14 Z" fill="#a78bfa" stroke="#1a1a2e" strokeWidth="2" />
                    <line x1="10" y1="24" x2="30" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.7" />
                    <line x1="10" y1="32" x2="26" y2="32" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.5" />
                    <line x1="10" y1="40" x2="22" y2="40" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.35" />
                    <defs>
                        <linearGradient id="fileGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#9d65f5" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.1" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            {/* Mouse cursor */}
            <CursorAnimation
                xFrames={[0, 8, 60, 100, 175]}
                xValues={[700, 700, 700, 470, 470]}
                yFrames={[0, 8, 60, 100, 175]}
                yValues={[100, 100, 100, 260, 260]}
                visibleFrames={[8, 170]}
            />
        </div>
    );
};
