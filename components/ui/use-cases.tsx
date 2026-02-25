"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Youtube, PenLine, GraduationCap, Megaphone } from "lucide-react";

const USE_CASES = [
    {
        tab: "Content Creators",
        title: "Content Creators",
        description:
            "Produce full animated comedy series for YouTube and social media — weekly uploads without a production team.",
        image:
            "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=640&q=60&auto=format&fit=crop",
        mockup: (
            <div className="relative z-10 flex flex-col gap-3 p-5 pt-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <Youtube className="h-3 w-3 text-red-400" />
                    </div>
                    <span className="text-[0.7rem] font-semibold text-white/80">
                        Channel Dashboard
                    </span>
                </div>
                <div className="space-y-1.5">
                    <div className="rounded-lg bg-black/40 backdrop-blur-sm px-3 py-2 text-[0.6rem] text-white/60 flex items-center justify-between">
                        <span>Ep. 12 — &quot;The HOA Meeting&quot;</span>
                        <span className="text-green-400 text-[0.5rem]">Published</span>
                    </div>
                    <div className="rounded-lg bg-black/40 backdrop-blur-sm px-3 py-2 text-[0.6rem] text-white/60 flex items-center justify-between">
                        <span>Ep. 13 — &quot;Gym Bro Apocalypse&quot;</span>
                        <span className="text-yellow-400 text-[0.5rem]">Rendering</span>
                    </div>
                    <div className="rounded-lg bg-black/40 backdrop-blur-sm px-3 py-2 text-[0.6rem] text-white/60 flex items-center justify-between">
                        <span>Ep. 14 — &quot;Cancel Culture&quot;</span>
                        <span className="text-white/30 text-[0.5rem]">Draft</span>
                    </div>
                </div>
            </div>
        ),
    },
    {
        tab: "Screenwriters",
        title: "Screenwriters",
        description:
            "See your scripts come alive with full animation and voice acting — perfect for pitching ideas or building proof-of-concept pilots.",
        image:
            "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=640&q=60&auto=format&fit=crop",
        mockup: (
            <div className="relative z-10 flex flex-col gap-3 p-5 pt-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <PenLine className="h-3 w-3 text-red-400" />
                    </div>
                    <span className="text-[0.7rem] font-semibold text-white/80">
                        Script Preview
                    </span>
                </div>
                <div className="rounded-lg bg-black/40 backdrop-blur-sm p-3 text-[0.6rem] leading-relaxed text-white/50 font-mono">
                    <p className="text-white/70">INT. COFFEE SHOP — DAY</p>
                    <p className="mt-1.5 text-white/40 italic">Two friends sit at a table. A barista watches suspiciously.</p>
                    <p className="mt-1.5"><span className="text-red-400">MIKE:</span> I&apos;m telling you, the algorithm knows.</p>
                    <p><span className="text-blue-400">DAVE:</span> It&apos;s a coffee app, Mike.</p>
                </div>
            </div>
        ),
    },
    {
        tab: "Educators",
        title: "Educators",
        description:
            "Build engaging animated lessons and explainers that capture attention and make complex topics click instantly.",
        image:
            "https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?w=640&q=60&auto=format&fit=crop",
        mockup: (
            <div className="relative z-10 flex flex-col gap-3 p-5 pt-6">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center">
                        <GraduationCap className="h-3 w-3 text-red-400" />
                    </div>
                    <span className="text-[0.7rem] font-semibold text-white/80">
                        Lesson Builder
                    </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {["Intro Scene", "Key Concept", "Example", "Quiz Recap"].map(
                        (label) => (
                            <div
                                key={label}
                                className="rounded-lg bg-black/40 backdrop-blur-sm px-3 py-2.5 flex items-center justify-center text-[0.55rem] font-medium text-white/50 border border-white/5"
                            >
                                {label}
                            </div>
                        )
                    )}
                </div>
            </div>
        ),
    },
    {
        tab: "Marketing Teams",
        title: "Marketing Teams",
        description:
            "Create branded animated ads, product explainers, and social clips — no agency budget or production timeline required.",
        image:
            "https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=640&q=60&auto=format&fit=crop",
        mockup: (
            <div className="relative z-10 flex flex-col items-end gap-2.5 p-5 pt-8">
                <div className="flex items-center gap-2 rounded-lg bg-black/50 backdrop-blur-sm px-3 py-2 text-[0.65rem] text-white/70 shadow">
                    Product launch video
                    <span className="rounded bg-red-500/80 px-1.5 py-0.5 text-[0.55rem] font-bold text-white">
                        Go
                    </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-black/50 backdrop-blur-sm px-3 py-2 text-[0.65rem] text-white/70 shadow">
                    Social media cutdown
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[0.55rem] font-bold text-white/60">
                        Edit
                    </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-black/50 backdrop-blur-sm px-3 py-2 text-[0.65rem] text-white/70 shadow">
                    Share with client
                    <span className="rounded bg-red-500/80 px-1.5 py-0.5 text-[0.55rem] font-bold text-white">
                        Send
                    </span>
                </div>
            </div>
        ),
    },
];

export function UseCases() {
    const [activeIndex, setActiveIndex] = useState(0);
    const active = USE_CASES[activeIndex];

    return (
        <section id="features" className="relative overflow-hidden bg-white">
            <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
                {/* Tagline */}
                <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Use cases
                    </span>
                </div>

                {/* Split-weight headline */}
                <h2 className="max-w-2xl text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.15] tracking-tight mb-10">
                    <span className="font-semibold text-gray-900">
                        Different ways to create
                    </span>{" "}
                    <span className="font-normal text-gray-400">
                        all powered by one animation engine.
                    </span>
                </h2>

                {/* Tabs */}
                <div className="flex items-center gap-1 border-b border-gray-200 mb-10">
                    {USE_CASES.map((uc, i) => (
                        <button
                            key={uc.tab}
                            onClick={() => setActiveIndex(i)}
                            className={`px-4 py-2.5 text-sm font-medium transition-colors duration-200 relative ${i === activeIndex
                                ? "text-gray-900"
                                : "text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            {uc.tab}
                            {i === activeIndex && (
                                <span className="absolute inset-x-0 -bottom-px h-px bg-gray-900" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content: image left, text right */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
                    {/* Left — mockup image */}
                    <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
                        <img
                            src={active.image}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-30"
                            aria-hidden="true"
                        />
                        <div className="absolute inset-0 bg-black/50" />
                        {active.mockup}
                    </div>

                    {/* Right — text */}
                    <div>
                        <h3 className="text-sm font-medium text-gray-500 mb-3">
                            {active.title}
                        </h3>
                        <p className="text-xl sm:text-2xl font-normal leading-relaxed text-gray-700 italic">
                            {active.description}
                        </p>
                        <Link
                            href="/register"
                            className="mt-8 inline-flex items-center rounded-full border border-gray-300 bg-gray-900 px-6 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-gray-800"
                        >
                            Get started
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
