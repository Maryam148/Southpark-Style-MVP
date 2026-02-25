"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMousePosition } from "../use-mouse-position";

interface FaceProps {
    className?: string;
    style?: React.CSSProperties;
}

export function FaceBunGirl({ className, style }: FaceProps) {
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
            {/* Hair behind head */}
            <path d="M15 50 Q 15 15, 50 12 Q 85 15, 85 50 L 85 75 Q 80 82, 75 75 L 75 50 Q 50 30, 25 50 L 25 75 Q 20 82, 15 75 Z" fill="black" />

            {/* Head Shape - on top of hair */}
            <circle cx="50" cy="52" r="34" fill="white" stroke="black" strokeWidth="4" />

            {/* Buns on top */}
            <circle cx="25" cy="28" r="11" fill="black" stroke="black" strokeWidth="2" />
            <circle cx="75" cy="28" r="11" fill="black" stroke="black" strokeWidth="2" />

            {/* Bangs on forehead */}
            <path d="M20 40 Q 25 25, 50 22 Q 75 25, 80 40 L 75 36 Q 65 28, 50 28 Q 35 28, 25 36 Z" fill="black" />

            {/* Eyes — white sclera + pupils */}
            <circle cx="38" cy="52" r="7" fill="white" stroke="black" strokeWidth="2" />
            <g transform="translate(38, 52)">
                <motion.circle r="3" fill="black" animate={{ x: pupilPos.x, y: pupilPos.y }} />
            </g>
            <circle cx="62" cy="52" r="7" fill="white" stroke="black" strokeWidth="2" />
            <g transform="translate(62, 52)">
                <motion.circle r="3" fill="black" animate={{ x: pupilPos.x, y: pupilPos.y }} />
            </g>

            {/* Nose */}
            <path d="M50 58 L 48 64 Q50 66, 52 64 Z" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" />

            {/* Mouth */}
            <motion.path
                d="M42 72 Q50 78, 58 72"
                stroke="black" strokeWidth="3" strokeLinecap="round" fill="none"
                animate={isHovered ? { d: "M42 72 Q50 72, 58 72" } : { d: "M42 72 Q50 78, 58 72" }}
            />
        </motion.svg>
    );
}
