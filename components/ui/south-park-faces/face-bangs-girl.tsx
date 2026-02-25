"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMousePosition } from "../use-mouse-position";

interface FaceProps {
    className?: string;
    style?: React.CSSProperties;
}

export function FaceBangsGirl({ className, style }: FaceProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const mousePos = useMousePosition();
    const [isHovered, setIsHovered] = useState(false);
    const [pupilPos, setPupilPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = mousePos.x - centerX;
        const dy = mousePos.y - centerY;
        const maxR = 3;
        const angle = Math.atan2(dy, dx);
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy) / 15, maxR);
        setPupilPos({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
    }, [mousePos]);

    return (
        <motion.svg
            ref={svgRef}
            viewBox="0 0 100 100"
            className={`character-face ${className}`}
            style={style}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            {/* Hair - Behind head, long sides */}
            <path d="M10 45 Q 10 10, 50 10 Q 90 10, 90 45 L 90 80 Q 85 88, 78 80 L 78 50 Q 50 25, 22 50 L 22 80 Q 15 88, 10 80 Z" fill="black" />

            {/* Head Shape - ON TOP of long hair */}
            <circle cx="50" cy="50" r="35" fill="white" stroke="black" strokeWidth="4" />

            {/* Bangs - on top of forehead only */}
            <path d="M18 42 Q 20 22, 50 18 Q 80 22, 82 42 L 78 38 Q 70 28, 50 26 Q 30 28, 22 38 Z" fill="black" />

            {/* Eyes — white sclera + pupils */}
            <circle cx="37" cy="52" r="7" fill="white" stroke="black" strokeWidth="2" />
            <g transform="translate(37, 52)">
                <motion.circle r="3" fill="black" animate={{ x: pupilPos.x, y: pupilPos.y }} />
            </g>
            <circle cx="63" cy="52" r="7" fill="white" stroke="black" strokeWidth="2" />
            <g transform="translate(63, 52)">
                <motion.circle r="3" fill="black" animate={{ x: pupilPos.x, y: pupilPos.y }} />
            </g>

            {/* Nose */}
            <path d="M50 58 L 47 65 Q50 67, 53 65 Z" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" />

            {/* Mouth / Lips */}
            <motion.path
                d="M42 72 Q50 76, 58 72"
                stroke="black" strokeWidth="3" strokeLinecap="round" fill="none"
                animate={isHovered ? { d: "M42 72 Q50 80, 58 72" } : { d: "M42 72 Q50 76, 58 72" }}
            />
        </motion.svg>
    );
}
