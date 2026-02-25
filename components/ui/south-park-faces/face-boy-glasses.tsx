"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMousePosition } from "../use-mouse-position";

interface FaceProps {
    className?: string;
    style?: React.CSSProperties;
}

export function FaceBoyGlasses({ className, style }: FaceProps) {
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
            viewBox="0 0 100 100" // Adjusted viewbox for simpler square/circle
            className={`character-face ${className}`}
            style={style}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
            {/* Head Shape - White circle with thick black stroke */}
            <circle cx="50" cy="50" r="40" fill="white" stroke="black" strokeWidth="4" />

            {/* Hair - Solid Black Shape */}
            {/* Side part style */}
            <path d="M14 40 Q 10 20, 50 10 Q 90 20, 86 40 Q 86 50, 82 45 Q 80 20, 50 20 Q 20 20, 18 45 Q 14 50, 14 40 Z" fill="black" />

            {/* Glasses - Thick black frames */}
            <circle cx="35" cy="55" r="12" fill="none" stroke="black" strokeWidth="3" />
            <circle cx="65" cy="55" r="12" fill="none" stroke="black" strokeWidth="3" />
            <line x1="47" y1="55" x2="53" y2="55" stroke="black" strokeWidth="3" />

            {/* Eyes - Black dots inside glasses */}
            <g transform="translate(35, 55)">
                <motion.circle r="3" fill="black" animate={{ x: pupilPos.x, y: pupilPos.y }} />
            </g>
            <g transform="translate(65, 55)">
                <motion.circle r="3" fill="black" animate={{ x: pupilPos.x, y: pupilPos.y }} />
            </g>

            {/* Mouth - Simple curve */}
            <motion.path
                d="M40 75 Q50 80, 60 75"
                stroke="black" strokeWidth="3" strokeLinecap="round" fill="none"
                animate={isHovered ? { d: "M40 75 Q50 85, 60 75" } : { d: "M40 75 Q50 80, 60 75" }}
            />
        </motion.svg>
    );
}
