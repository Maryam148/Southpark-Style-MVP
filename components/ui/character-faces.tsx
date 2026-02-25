"use client";

import React from "react";

interface FaceProps {
    className?: string;
    style?: React.CSSProperties;
}

/* All faces use stroke-only bold line art */

import { FaceCurlyGirl } from "./south-park-faces/face-curly-girl";

import { FaceBoyGlasses } from "./south-park-faces/face-boy-glasses";
import { FaceBangsGirl } from "./south-park-faces/face-bangs-girl";
import { FaceMessyBoy } from "./south-park-faces/face-messy-boy";
import { FacePigtailGirl } from "./south-park-faces/face-pigtail-girl";
import { FaceSidePartBoy } from "./south-park-faces/face-side-part-boy";
import { FaceBunGirl } from "./south-park-faces/face-bun-girl";
import { FaceNerdBoy } from "./south-park-faces/face-nerd-boy";

/* ── Positioned around the EDGES only, avoiding center text ── */

const FACES = [
    // Top row — spread across top
    { Component: FaceCurlyGirl, x: "2%", y: "14%", size: "clamp(90px, 13vw, 160px)", rotate: -8 },
    { Component: FaceBunGirl, x: "30%", y: "14%", size: "clamp(80px, 11vw, 140px)", rotate: 5 },
    { Component: FaceNerdBoy, x: "62%", y: "15%", size: "clamp(75px, 11vw, 130px)", rotate: -3 },
    { Component: FaceBangsGirl, x: "86%", y: "18%", size: "clamp(80px, 11vw, 140px)", rotate: 6 },
    // Left & right sides — middle height but at edges
    { Component: FaceBoyGlasses, x: "4%", y: "42%", size: "clamp(85px, 12vw, 150px)", rotate: 4 },
    { Component: FaceSidePartBoy, x: "86%", y: "38%", size: "clamp(80px, 12vw, 145px)", rotate: -7 },
    // Bottom row — spread across bottom
    { Component: FacePigtailGirl, x: "4%", y: "72%", size: "clamp(80px, 11vw, 140px)", rotate: -4 },
    { Component: FaceMessyBoy, x: "30%", y: "76%", size: "clamp(75px, 10vw, 130px)", rotate: 3 },
    { Component: FaceCurlyGirl, x: "60%", y: "74%", size: "clamp(70px, 10vw, 125px)", rotate: -5 },
    { Component: FaceBoyGlasses, x: "84%", y: "70%", size: "clamp(75px, 11vw, 135px)", rotate: 8 },
];

export function CharacterFacesBackground() {
    return (
        <div className="absolute inset-0 z-[2] overflow-hidden">
            {FACES.map((face, i) => {
                const { Component } = face;
                return (
                    <div
                        key={i}
                        className="absolute cursor-pointer"
                        style={{
                            left: face.x,
                            top: face.y,
                            width: face.size,
                            height: face.size,
                            transform: `rotate(${face.rotate}deg)`,
                        }}
                    >
                        <Component className="w-full h-full" />
                    </div>
                );
            })}
        </div>
    );
}
