import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CursorAnimation } from "./CursorAnimation";

export const Scene2_GenerateClick: React.FC<{ startFrame: number }> = ({ startFrame }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const localFrame = frame - startFrame;

    // Cursor moves to button — slower
    const cursorMoveEnd = 45;

    // Button click at frame 50
    const clickFrame = 50;

    // Button pulse / press animation
    const buttonScale = interpolate(
        localFrame,
        [clickFrame - 2, clickFrame, clickFrame + 4, clickFrame + 14],
        [1, 0.93, 1.04, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Button border glow after click
    const buttonGlow = interpolate(localFrame, [clickFrame, clickFrame + 12, clickFrame + 35], [0, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    // Progress bar fill — starts after click, fills to 100% over 100 frames (~3.3s)
    const barFill = interpolate(localFrame, [clickFrame + 8, clickFrame + 110], [0, 100], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    // Progress bar pulse opacity
    const barPulse = interpolate(
        localFrame,
        [clickFrame + 8, clickFrame + 35, clickFrame + 60, clickFrame + 85, clickFrame + 115],
        [0.7, 1, 0.85, 1, 0.9],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    // Stage labels appear — spaced out more
    const stagesOpacity = [
        interpolate(localFrame, [clickFrame + 15, clickFrame + 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        interpolate(localFrame, [clickFrame + 38, clickFrame + 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        interpolate(localFrame, [clickFrame + 62, clickFrame + 74], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        interpolate(localFrame, [clickFrame + 88, clickFrame + 100], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    ];

    const stages = ["Parsing script...", "Resolving assets...", "Synthesizing voices...", "Building episode..."];

    // Panel entrance
    const panelY = spring({
        frame: localFrame,
        fps,
        config: { damping: 18, stiffness: 130 },
        from: 50,
        to: 0,
    });

    // Panel fade out at end
    const panelOpacity = interpolate(localFrame, [170, 195], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
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
                opacity: panelOpacity,
            }}
        >
            {/* Particle dots decoration */}
            {Array.from({ length: 20 }).map((_, i) => {
                const px = ((i * 137.5) % 100);
                const py = ((i * 97.3) % 100);
                const blink = Math.sin((localFrame / 25 + i * 0.4) * Math.PI) * 0.5 + 0.5;
                return (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            left: `${px}%`,
                            top: `${py}%`,
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: "#8b5cf6",
                            opacity: blink * 0.2,
                        }}
                    />
                );
            })}

            <div
                style={{
                    transform: `translateY(${panelY}px)`,
                    width: 640,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 36,
                }}
            >
                {/* Generate button */}
                <div style={{ position: "relative" }}>
                    {/* Glow ring */}
                    {buttonGlow > 0 && (
                        <div
                            style={{
                                position: "absolute",
                                inset: -12,
                                borderRadius: 28,
                                border: `3px solid rgba(139, 92, 246, ${buttonGlow})`,
                                boxShadow: `0 0 ${40 * buttonGlow}px rgba(139, 92, 246, ${buttonGlow * 0.6})`,
                                pointerEvents: "none",
                            }}
                        />
                    )}
                    <button
                        style={{
                            transform: `scale(${buttonScale})`,
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                            border: "2px solid #9d65f5",
                            borderRadius: 18,
                            padding: "22px 48px",
                            cursor: "pointer",
                            boxShadow: `0 8px 30px rgba(124, 58, 237, 0.5), 0 0 ${20 * buttonGlow}px rgba(139,92,246,${buttonGlow * 0.8})`,
                        }}
                    >
                        {/* Wand icon */}
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M15 4l5 5L8 21l-5-1 -1-5L15 4z" fill="white" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
                            <circle cx="19" cy="4" r="1.5" fill="#c4b5fd" />
                            <circle cx="4" cy="19" r="1" fill="#c4b5fd" />
                            <circle cx="20" cy="9" r="1" fill="#a78bfa" />
                        </svg>
                        <span
                            style={{
                                color: "white",
                                fontFamily: "'Arial Black', sans-serif",
                                fontWeight: 900,
                                fontSize: 22,
                                letterSpacing: "0.02em",
                                textShadow: "0 2px 4px rgba(0,0,0,0.4)",
                            }}
                        >
                            Generate Episode
                        </span>
                    </button>
                </div>

                {/* Progress container */}
                {localFrame >= clickFrame + 6 && (
                    <div style={{ width: "100%" }}>
                        {/* Stages */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                            {stages.map((stage, i) => (
                                <div
                                    key={stage}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        opacity: stagesOpacity[i],
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: "50%",
                                            background: stagesOpacity[i] > 0.9 ? "#7c3aed" : "transparent",
                                            border: `2.5px solid ${stagesOpacity[i] > 0.5 ? "#8b5cf6" : "#2a2a50"}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {stagesOpacity[i] > 0.9 && (
                                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                                <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                            </svg>
                                        )}
                                    </div>
                                    <span style={{ color: stagesOpacity[i] > 0.9 ? "#c4b5fd" : "#4a4a6a", fontFamily: "monospace", fontSize: 14 }}>
                                        {stage}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Progress bar track */}
                        <div
                            style={{
                                width: "100%",
                                height: 16,
                                background: "#0c0c1e",
                                borderRadius: 9,
                                border: "2px solid #1e1e3a",
                                overflow: "hidden",
                                position: "relative",
                            }}
                        >
                            {/* Fill */}
                            <div
                                style={{
                                    width: `${barFill}%`,
                                    height: "100%",
                                    background: "linear-gradient(90deg, #6d28d9, #7c3aed, #a855f7)",
                                    borderRadius: 9,
                                    opacity: barPulse,
                                    boxShadow: "2px 0 12px rgba(167, 85, 247, 0.8)",
                                    position: "relative",
                                    transition: "width 0.05s linear",
                                }}
                            >
                                {/* Shimmer effect */}
                                <div
                                    style={{
                                        position: "absolute",
                                        right: 0,
                                        top: 0,
                                        width: 20,
                                        height: "100%",
                                        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                                        borderRadius: 9,
                                    }}
                                />
                            </div>
                        </div>
                        {/* Percentage label */}
                        <div style={{ textAlign: "right", marginTop: 8 }}>
                            <span style={{ color: "#8b5cf6", fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>
                                {Math.round(barFill)}%
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Cursor */}
            <CursorAnimation
                xFrames={[0, 8, cursorMoveEnd, 180, 195]}
                xValues={[200, 200, 960, 960, 960]}
                yFrames={[0, 8, cursorMoveEnd, 180, 195]}
                yValues={[400, 400, 540, 540, 540]}
                visibleFrames={[8, 60]}
            />
        </div>
    );
};
