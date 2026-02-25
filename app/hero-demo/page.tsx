"use client";

import React from "react";
import { CinematicHero } from "@/components/ui/hero-3";

export default function HeroDemoPage() {
    return (
        <main className="min-h-screen bg-background">
            <CinematicHero
                title={
                    <>
                        Where scripts become
                        <br />
                        animated episodes.
                    </>
                }
                description="An AI animation studio that transforms your writing into fully voiced, South Park style episodes — in seconds."
                ctaText="Begin Creating"
                ctaHref="/register"
            />
        </main>
    );
}
