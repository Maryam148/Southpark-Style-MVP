"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMousePosition } from "../use-mouse-position";

interface FaceProps {
    className?: string;
    style?: React.CSSProperties;
}

export function FaceCurlyGirl({ className, style }: FaceProps) {
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
            {/* Hair - Curly Afro Style - Solid Black - MOVED BEHIND HEAD */}
            <path d="M15 50 Q 10 20, 50 10 Q 90 20, 85 50 Q 95 60, 90 80 Q 80 90, 70 85 Q 70 70, 50 70 Q 30 70, 30 85 Q 20 90, 10 80 Q 5 60, 15 50 Z" fill="black" />

            {/* Head Shape */}
            <circle cx="50" cy="50" r="40" fill="white" stroke="black" strokeWidth="4" />

            {/* Curl detail (on top of hair/head) */}
            <path d="M50 15 Q 55 25, 50 30" stroke="black" strokeWidth="2" fill="none" />

            {/* Eyes */}
            <g transform="translate(35, 55)">
                <motion.circle r="3" fill="black" animate={{ x: pupilPos.x, y: pupilPos.y }} />
            </g>
            <g transform="translate(65, 55)">
                <motion.circle r="3" fill="black" animate={{ x: pupilPos.x, y: pupilPos.y }} />
            </g>

            {/* Mouth */}
            <motion.path
                d="M40 75 Q50 80, 60 75"
                stroke="black" strokeWidth="3" strokeLinecap="round" fill="none"
                animate={isHovered ? { d: "M40 75 Q50 85, 60 75" } : { d: "M40 75 Q50 80, 60 75" }}
            />
        </motion.svg>
    );
}
