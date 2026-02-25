import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface CursorAnimationProps {
    /** Keyframe times (in frames) for x positions */
    xFrames: number[];
    /** Keyframe x positions (in pixels) */
    xValues: number[];
    /** Keyframe times (in frames) for y positions */
    yFrames: number[];
    /** Keyframe y positions (in pixels) */
    yValues: number[];
    /** Opacity keyframes [startFrame, endFrame] */
    visibleFrames?: [number, number];
    size?: number;
}

export const CursorAnimation: React.FC<CursorAnimationProps> = ({
    xFrames,
    xValues,
    yFrames,
    yValues,
    visibleFrames,
    size = 28,
}) => {
    const frame = useCurrentFrame();

    const x = interpolate(frame, xFrames, xValues, {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    const y = interpolate(frame, yFrames, yValues, {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
    });

    const opacity = visibleFrames
        ? interpolate(frame, [visibleFrames[0], visibleFrames[0] + 5, visibleFrames[1] - 5, visibleFrames[1]], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
        })
        : 1;

    // Subtle click animation — scale down briefly at key frames
    const clickScale = interpolate(
        frame,
        [xFrames[Math.floor(xFrames.length / 2)] - 2, xFrames[Math.floor(xFrames.length / 2)], xFrames[Math.floor(xFrames.length / 2)] + 4],
        [1, 0.8, 1],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    return (
        <div
            style={{
                position: "absolute",
                left: x,
                top: y,
                width: size,
                height: size,
                opacity,
                transform: `scale(${clickScale})`,
                pointerEvents: "none",
                zIndex: 100,
                filter: "drop-shadow(2px 3px 4px rgba(0,0,0,0.5))",
            }}
        >
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Bold outline cursor — South Park flat style */}
                <path
                    d="M5.5 3.5L5.5 18.5L9 15L11.5 20.5L13.5 19.5L11 14L15.5 14L5.5 3.5Z"
                    fill="white"
                    stroke="#1a1a2e"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
            </svg>
        </div>
    );
};
