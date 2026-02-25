"use client";

import React from "react";
import {
    Clock,
    Pen,
    Target,
    BookOpen,
    Radio,
    ShieldCheck,
} from "lucide-react";
import { Sparkles } from "lucide-react";

const BENEFITS = [
    {
        icon: Clock,
        title: "Hours Saved",
        description:
            "Skip the production pipeline. What takes studios weeks is done in seconds.",
    },
    {
        icon: Pen,
        title: "Consistent Quality",
        description:
            "Every episode matches your style guide. No off-model frames, ever.",
    },
    {
        icon: Target,
        title: "Zero Learning Curve",
        description:
            "Upload a script, hit generate. No animation experience needed.",
    },
    {
        icon: BookOpen,
        title: "Unlimited Iterations",
        description:
            "Tweak dialogue, swap characters, re-render — as many times as you want.",
    },
    {
        icon: Radio,
        title: "Always On",
        description:
            "Your studio never sleeps. Generate episodes at 3 AM or 3 PM.",
    },
    {
        icon: ShieldCheck,
        title: "Your IP, Your Data",
        description:
            "Characters, scripts, and exports stay yours. Private and secure by default.",
    },
];

export function Benefits() {
    return (
        <section className="relative overflow-hidden bg-black">
            <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
                {/* Tagline */}
                <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-text-2">
                        Benefits
                    </span>
                </div>

                {/* Split-weight headline */}
                <h2 className="max-w-2xl text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.15] tracking-tight mb-14">
                    <span className="font-semibold text-white">
                        Invisible power at your side
                    </span>{" "}
                    <span className="font-normal text-muted-text-2">
                        delivering tangible benefits every day.
                    </span>
                </h2>

                {/* 3x2 card grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {BENEFITS.map((benefit) => {
                        const Icon = benefit.icon;
                        return (
                            <div
                                key={benefit.title}
                                className="group rounded-2xl border border-sk-border bg-surface-1/30 p-6 transition-all duration-300 hover:border-sk-border-hover hover:bg-surface-1/50"
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors duration-300 group-hover:border-white/20 group-hover:text-white/80">
                                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                                </div>
                                <h3 className="mt-5 text-[0.95rem] font-semibold text-white">
                                    {benefit.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-muted-text-1">
                                    {benefit.description}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
