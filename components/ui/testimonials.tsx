"use client";

import React, { useState } from "react";
import { Sparkles, ChevronLeft, ChevronRight, Star } from "lucide-react";

const TESTIMONIALS = [
    {
        content:
            "I've tested countless AI tools, but this one feels different — less like software, more like a guide that clears the fog in my projects.",
        name: "Sophia M.",
        role: "Product Designer",
        rating: 5,
    },
    {
        content:
            "Within days, it streamlined my workflow. The balance of precision and inspiration it offers is unlike anything I've seen.",
        name: "David K.",
        role: "Indie Creator",
        rating: 3.8,
    },
    {
        content:
            "At first I was skeptical. But the clarity it brings into complex problems feels almost like working with a second brain.",
        name: "Aria L.",
        role: "Researcher",
        rating: 5,
    },
    {
        content:
            "Seeing my scene descriptions turn into active animation in seconds feels like magic. Best tool in my workflow, hands down.",
        name: "Stan M.",
        role: "Scriptwriter",
        rating: 4.5,
    },
    {
        content:
            "The voice synthesis and animation synchronization are surprisingly accurate. A total game changer for small studios.",
        name: "Chef J.",
        role: "Voice Actor",
        rating: 5,
    },
    {
        content:
            "I literally just pasted my script and had an entire episode ready. The animation style is spot on every single time.",
        name: "Eric T.",
        role: "Content Creator",
        rating: 4.8,
    },
];

const PAGE_SIZE = 3;

function StarRating({ rating }: { rating: number }) {
    const full = Math.floor(rating);
    const hasPartial = rating % 1 > 0;

    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${i < full
                            ? "fill-white/80 text-white/80"
                            : i === full && hasPartial
                                ? "fill-white/40 text-white/40"
                                : "text-white/15"
                        }`}
                />
            ))}
            <span className="ml-1 text-xs text-muted-text-2">
                {rating % 1 === 0 ? `${rating}/5` : `${rating}/5`}
            </span>
        </div>
    );
}

export const Testimonials = () => {
    const [page, setPage] = useState(0);
    const totalPages = Math.ceil(TESTIMONIALS.length / PAGE_SIZE);
    const visible = TESTIMONIALS.slice(
        page * PAGE_SIZE,
        page * PAGE_SIZE + PAGE_SIZE
    );

    return (
        <section
            id="testimonials"
            className="relative overflow-hidden bg-black"
        >
            <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
                {/* Tagline */}
                <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-text-2">
                        Testimonials
                    </span>
                </div>

                {/* Split-weight headline */}
                <h2 className="max-w-2xl text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.15] tracking-tight mb-14">
                    <span className="font-semibold text-white">
                        What others whisper
                    </span>{" "}
                    <span className="font-normal text-muted-text-2">
                        about the experience
                    </span>
                </h2>

                {/* 3-column testimonial cards */}
                <div className="grid gap-5 sm:grid-cols-3">
                    {visible.map((t) => (
                        <div
                            key={t.name}
                            className="flex flex-col rounded-2xl border border-sk-border bg-surface-1/30 p-6 transition-all duration-300 hover:border-sk-border-hover"
                        >
                            <p className="flex-1 text-[0.95rem] leading-relaxed text-white/80">
                                &ldquo;{t.content}&rdquo;
                            </p>

                            <div className="mt-6 pt-5 border-t border-sk-border">
                                <p className="text-sm font-semibold text-white">
                                    {t.name}
                                </p>
                                <p className="text-xs text-muted-text-2 mt-0.5">
                                    {t.role}
                                </p>
                                <div className="mt-2.5">
                                    <StarRating rating={t.rating} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Navigation arrows */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-end gap-2 mt-8">
                        <button
                            onClick={() =>
                                setPage((p) =>
                                    p === 0 ? totalPages - 1 : p - 1
                                )
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-sk-border text-white/50 transition-all duration-200 hover:border-sk-border-hover hover:text-white"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() =>
                                setPage((p) =>
                                    p === totalPages - 1 ? 0 : p + 1
                                )
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-sk-border text-white/50 transition-all duration-200 hover:border-sk-border-hover hover:text-white"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
};
