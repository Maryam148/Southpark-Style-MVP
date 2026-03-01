"use client";

import React, { useState } from "react";
import { Sparkles, Plus, Minus } from "lucide-react";

const FAQS = [
    {
        question: "What is SkunkStudio designed for?",
        answer: "SkunkStudio is an AI-powered animation studio that turns your scripts into fully voiced, South Park style animated episodes. It handles character animation, voice synthesis, lip-sync, and scene composition — all from a single script upload.",
    },
    {
        question: "Is there a free plan available?",
        answer: "Yes. The Starter plan is completely free and lets you create 1 episode per month with up to 3 scenes. It includes the default character library and community support — no credit card required.",
    },
    {
        question: "Do I need animation experience to use it?",
        answer: "Not at all. SkunkStudio is built for writers, creators, and storytellers — not animators. You write the script, and the engine handles character placement, movement, voice acting, and scene transitions automatically.",
    },
    {
        question: "Can I use this for commercial projects?",
        answer: "Absolutely. All paid plans include full commercial usage rights for the episodes you generate. You own the content you create and can publish, monetize, or distribute it however you like.",
    },
    {
        question: "What powers the voice synthesis?",
        answer: "SkunkStudio runs on a multi-provider AI voice stack optimized for animated character performance. Our engine dynamically processes dialogue for natural timing, expressive delivery, and automatic lip-sync alignment.",
    },
    {
        question: "How can I get support if I have issues?",
        answer: "Starter users get access to our community forum. Pro subscribers receive priority response times, and Custom plan members get a dedicated support channel with SLA guarantees.",
    },
];

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section id="faq" className="relative overflow-hidden bg-black">
            <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
                {/* Tagline */}
                <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-text-2">
                        FAQ
                    </span>
                </div>

                {/* Split-weight headline */}
                <h2 className="max-w-2xl text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.15] tracking-tight mb-14">
                    <span className="font-semibold text-white">
                        Your questions,
                    </span>{" "}
                    <span className="font-normal text-muted-text-2">
                        answered with clarity
                    </span>
                </h2>

                {/* Accordion */}
                <div className="divide-y divide-sk-border border-t border-sk-border">
                    {FAQS.map((faq, i) => {
                        const isOpen = openIndex === i;
                        return (
                            <div key={i}>
                                <button
                                    onClick={() =>
                                        setOpenIndex(isOpen ? null : i)
                                    }
                                    className="flex w-full items-center justify-between py-5 text-left transition-colors duration-200 group"
                                >
                                    <span className="text-[0.95rem] font-medium text-white group-hover:text-white/80 pr-4">
                                        {faq.question}
                                    </span>
                                    <span className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full border border-sk-border text-white/50 transition-all duration-200 group-hover:border-sk-border-hover group-hover:text-white">
                                        {isOpen ? (
                                            <Minus className="h-3.5 w-3.5" />
                                        ) : (
                                            <Plus className="h-3.5 w-3.5" />
                                        )}
                                    </span>
                                </button>
                                <div
                                    className={`overflow-hidden transition-all duration-300 ${isOpen
                                            ? "max-h-60 pb-5 opacity-100"
                                            : "max-h-0 pb-0 opacity-0"
                                        }`}
                                >
                                    <p className="text-sm leading-relaxed text-muted-text-1 pr-12">
                                        {faq.answer}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
