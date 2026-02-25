"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMousePosition } from "../use-mouse-position";

interface FaceProps {
    className?: string;
    style?: React.CSSProperties;
}

export function FaceMessyBoy({ className, style }: FaceProps) {
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
            {/* Head Shape */}
            <circle cx="50" cy="50" r="40" fill="white" stroke="black" strokeWidth="4" />

            {/* Hair - Messy Spikes - Solid Black */}
            <path d="M10 50 L 15 30 L 25 20 L 40 10 L 60 10 L 75 20 L 85 30 L 90 50 L 85 45 Q 80 25, 50 25 Q 20 25, 15 45 Z" fill="black" />

            {/* Eyes */}
            <g transform="translate(35, 55)">
                <motion.circle r="3" fill="black" animate={{ x: pupilPos.x, y: pupilPos.y }} />
            </g>
            <g transform="translate(65, 55)">
                <motion.circle r="3" fill="black" animate={{ x: pupilPos.x, y: pupilPos.y }} />
            </g>

            {/* Mouth */}
            <motion.path
                d="M40 75 Q50 78, 60 75"
                stroke="black" strokeWidth="3" strokeLinecap="round" fill="none"
                animate={isHovered ? { d: "M40 75 Q50 82, 60 75" } : { d: "M40 75 Q50 78, 60 75" }}
            />
        </motion.svg>
    );
}
