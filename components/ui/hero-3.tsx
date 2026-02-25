"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Mouse, Sparkles } from "lucide-react";
import { CharacterFacesBackground } from "@/components/ui/character-faces";

const NAV_LINKS = [
    { label: "About", href: "#how-it-works" },
    { label: "Features", href: "#features" },
    { label: "Testimonials", href: "#testimonials" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
];

interface CinematicHeroProps {
    title: React.ReactNode;
    description: string;
    ctaText: string;
    ctaHref?: string;
    className?: string;
}

export const CinematicHero: React.FC<CinematicHeroProps> = ({
    title,
    description,
    ctaText,
    ctaHref = "/register",
    className,
}) => {
    return (
        <section
            className={cn(
                "relative w-full min-h-[100dvh] overflow-hidden flex flex-col bg-white",
                className
            )}
        >
            {/* ── Background: character faces ───────────── */}
            <CharacterFacesBackground />
            <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(255,255,255,0.9)_100%)] pointer-events-none" />

            {/* ── Navbar (inside hero) ──────────────────── */}
            <header className="relative z-20 w-full">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
                    <Link
                        href="/"
                        className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-neutral-950"
                    >
                        <Sparkles className="h-4 w-4 text-violet-primary" />
                        Skunk<span className="text-violet-primary">Studio</span>
                    </Link>

                    <nav className="hidden items-center gap-1 md:flex">
                        {NAV_LINKS.map((link) => (
                            <a
                                key={link.label}
                                href={link.href}
                                className="px-3 py-1.5 text-[0.8rem] text-neutral-600 transition-colors duration-200 hover:text-black font-medium"
                            >
                                {link.label}
                            </a>
                        ))}
                    </nav>

                    <Link
                        href="/register"
                        className="text-[0.8rem] font-medium text-neutral-900 transition-colors duration-200 hover:text-black underline-offset-4 hover:underline"
                    >
                        Get Started
                    </Link>
                </div>
            </header>

            {/* ── Hero content ──────────────────────────── */}
            <div className="relative z-[5] flex flex-1 flex-col items-center justify-center px-4 sm:px-6 max-w-3xl mx-auto text-center">
                <h1 className="text-[2.5rem] sm:text-[3.5rem] md:text-[4.25rem] font-semibold leading-[1.08] tracking-tight text-neutral-950 mb-6 animate-[fadeUp_0.6s_ease-out_0.2s_both]">
                    {title}
                </h1>

                <p className="max-w-lg text-[0.95rem] sm:text-base leading-relaxed text-neutral-600 mb-10 animate-[fadeUp_0.6s_ease-out_0.4s_both]">
                    {description}
                </p>

                <div className="animate-[fadeUp_0.6s_ease-out_0.6s_both]">
                    <Link
                        href={ctaHref}
                        className="inline-flex items-center gap-2 rounded-full border border-neutral-900 bg-neutral-900 px-7 py-2.5 text-sm font-medium text-white transition-all duration-300 hover:bg-neutral-800 hover:shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]"
                    >
                        {ctaText}
                    </Link>
                </div>
            </div>

            {/* ── Scroll indicator ──────────────────────── */}
            <div className="relative z-[5] pb-8 flex flex-col items-center gap-2 animate-[fadeUp_0.6s_ease-out_1.2s_both]">
                <Mouse size={16} className="text-neutral-400" />
                <span className="text-[0.7rem] tracking-widest uppercase text-neutral-400">
                    Scroll to explore
                </span>
            </div>
        </section>
    );
};

export const AnimatedMarqueeHero = CinematicHero;
