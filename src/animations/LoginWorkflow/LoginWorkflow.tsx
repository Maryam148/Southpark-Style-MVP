import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Composition } from "remotion";
import { Scene1_ScriptUpload } from "./components/Scene1_ScriptUpload";
import { Scene2_GenerateClick } from "./components/Scene2_GenerateClick";
import { Scene3_EpisodePreview } from "./components/Scene3_EpisodePreview";

// Scene boundaries (in frames at 30fps) — 600 total = 20 seconds
// Scene 1: 0–179   (6 seconds — script upload)
// Scene 2: 180–379 (6.7 seconds — generate click + progress bar)
// Scene 3: 380–599 (7.3 seconds — episode preview / idle, loops)

export const LoginWorkflow: React.FC = () => {
    const frame = useCurrentFrame();

    // Scene 1 → Scene 2 crossfade
    const scene1Opacity = interpolate(frame, [165, 180], [1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    const scene2Opacity = interpolate(frame, [175, 188, 365, 380], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });
    const scene3Opacity = interpolate(frame, [375, 390], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    return (
        <AbsoluteFill style={{ background: "#000000" }}>
            {/* Scene 1 — Script Upload */}
            {frame < 185 && (
                <AbsoluteFill style={{ opacity: scene1Opacity }}>
                    <Scene1_ScriptUpload startFrame={0} />
                </AbsoluteFill>
            )}

            {/* Scene 2 — Generate Click */}
            {frame >= 173 && frame < 385 && (
                <AbsoluteFill style={{ opacity: scene2Opacity }}>
                    <Scene2_GenerateClick startFrame={180} />
                </AbsoluteFill>
            )}

            {/* Scene 3 — Episode Preview (idle loop) */}
            {frame >= 373 && (
                <AbsoluteFill style={{ opacity: scene3Opacity }}>
                    <Scene3_EpisodePreview startFrame={380} />
                </AbsoluteFill>
            )}
        </AbsoluteFill>
    );
};

// Remotion composition registration (used by root.tsx for npx remotion preview)
export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="LoginWorkflow"
                component={LoginWorkflow}
                durationInFrames={600}
                fps={30}
                width={1920}
                height={1080}
            />
        </>
    );
};
