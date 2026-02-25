"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

const PLANS = [
    {
        name: "Starter",
        monthlyPrice: "$0",
        yearlyPrice: "$0",
        period: "/month",
        description:
            "Perfect to explore AI animation with essential tools for individuals and small projects.",
        cta: "Start for Free",
        ctaStyle: "text" as const,
        popular: false,
        features: [
            "Basic access to AI core",
            "Limited prompts per month",
            "Community support",
        ],
    },
    {
        name: "Pro",
        monthlyPrice: "$29",
        yearlyPrice: "$23",
        period: "/month",
        description:
            "Advanced features and flexibility to scale productivity and handle bigger workloads.",
        cta: "Upgrade to Pro",
        ctaStyle: "outlined" as const,
        popular: true,
        features: [
            "Unlimited AI prompts",
            "Priority response time",
            "Early access to new models",
        ],
    },
    {
        name: "Lifetime",
        monthlyPrice: "Custom",
        yearlyPrice: "Custom",
        period: "",
        description:
            "Full power with custom options, priority support, and team-ready collaboration.",
        cta: "Contact Sales",
        ctaStyle: "text" as const,
        popular: false,
        features: [
            "Dedicated workspace",
            "Advanced model tuning",
            "Premium support & SLA",
        ],
    },
];

export function Pricing() {
    const [yearly, setYearly] = useState(false);

    return (
        <section id="pricing" className="relative overflow-hidden bg-white">
            <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
                {/* Tagline */}
                <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Pricing
                    </span>
                </div>

                {/* Split-weight headline */}
                <h2 className="max-w-2xl text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.15] tracking-tight mb-10">
                    <span className="font-semibold text-gray-900">
                        Choose the plan
                    </span>{" "}
                    <span className="font-normal text-gray-400">
                        that matches your ambition
                    </span>
                </h2>

                {/* Monthly / Yearly toggle */}
                <div className="flex items-center gap-3 mb-14">
                    <span
                        className={`text-sm font-medium transition-colors ${!yearly ? "text-gray-900" : "text-gray-400"
                            }`}
                    >
                        Monthly
                    </span>
                    <button
                        onClick={() => setYearly(!yearly)}
                        className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${yearly ? "bg-gray-800" : "bg-gray-300"
                            }`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${yearly ? "translate-x-5" : "translate-x-0"
                                }`}
                        />
                    </button>
                    <span
                        className={`text-sm font-medium transition-colors ${yearly ? "text-gray-900" : "text-gray-400"
                            }`}
                    >
                        Yearly
                    </span>
                    <span className="ml-1 rounded-full border border-gray-300 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                        20% OFF
                    </span>
                </div>

                {/* 3-column pricing cards */}
                <div className="grid gap-5 sm:grid-cols-3">
                    {PLANS.map((plan) => (
                        <div
                            key={plan.name}
                            className="relative flex flex-col rounded-2xl border border-gray-800 bg-gray-950 p-7 transition-all duration-300 hover:border-gray-600 hover:shadow-lg"
                        >
                            {/* Header row */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-semibold text-white">
                                    {plan.name}
                                </h3>
                                {plan.popular && (
                                    <span className="text-xs font-medium text-gray-400">
                                        Popular
                                    </span>
                                )}
                            </div>

                            {/* Price */}
                            <div className="mt-5 flex items-baseline gap-1">
                                <span className="text-4xl font-bold tracking-tight text-white">
                                    {yearly
                                        ? plan.yearlyPrice
                                        : plan.monthlyPrice}
                                </span>
                                {plan.period && (
                                    <span className="text-sm text-gray-500">
                                        {plan.period}
                                    </span>
                                )}
                            </div>

                            {/* Description */}
                            <p className="mt-3 text-sm leading-relaxed text-gray-400">
                                {plan.description}
                            </p>

                            {/* CTA */}
                            {plan.ctaStyle === "outlined" ? (
                                <Link
                                    href="/register"
                                    className="mt-6 block w-full rounded-lg border border-white/20 bg-white py-2.5 text-center text-sm font-semibold text-black transition-colors duration-200 hover:bg-gray-100"
                                >
                                    {plan.cta}
                                </Link>
                            ) : (
                                <Link
                                    href="/register"
                                    className="mt-6 block w-full py-2.5 text-sm font-semibold text-gray-300 transition-colors duration-200 hover:text-white"
                                >
                                    {plan.cta}
                                </Link>
                            )}

                            {/* Features */}
                            <div className="mt-7 pt-6 border-t border-gray-800">
                                <p className="text-xs font-medium text-gray-500 mb-4 text-center">
                                    Features
                                </p>
                                <ul className="space-y-3">
                                    {plan.features.map((f) => (
                                        <li
                                            key={f}
                                            className="flex items-start gap-2.5 text-sm text-gray-400"
                                        >
                                            <span className="mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-gray-600">
                                                <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                                            </span>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
