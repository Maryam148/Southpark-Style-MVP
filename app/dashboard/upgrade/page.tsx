"use client";

import { useState } from "react";
import { Check, Sparkles, Zap, Lock } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useUser } from "@/hooks/useUser";
import Link from "next/link";

const PLANS = [
    {
        id: "free",
        name: "Free",
        price: "$0",
        period: "/month",
        description: "Explore AI animation with essential tools.",
        features: [
            "1 minute of video per month",
            "SkunkStudio watermark",
            "No MP4 export",
            "Community support",
        ],
    },
    {
        id: "pro",
        name: "Pro",
        price: "$99",
        period: "/month",
        description: "Advanced features for bigger workloads.",
        popular: true,
        features: [
            "10 minutes of video per month",
            "MP4 export",
            "No watermark",
            "Priority support",
        ],
    },
    {
        id: "creator_plus",
        name: "Creator+",
        price: "$249",
        period: "/month",
        description: "Full power for high-volume creators and studios.",
        features: [
            "30 minutes of video per month",
            "Priority rendering",
            "Expanded asset storage",
            "Dedicated support",
        ],
    },
] as const;

type PlanId = "free" | "pro" | "creator_plus";

const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, creator_plus: 2 };

export default function UpgradePage() {
    const { user, loading } = useUser();
    const [checkingOut, setCheckingOut] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const currentPlan = (user?.plan ?? "free") as PlanId;

    const handleUpgrade = async (planId: string) => {
        setCheckingOut(planId);
        setError(null);
        try {
            const res = await fetch("/api/stripe/create-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plan: planId }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setError(data.error ?? "Something went wrong. Please try again.");
                setCheckingOut(null);
            }
        } catch {
            setError("Network error. Please try again.");
            setCheckingOut(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-3.5 w-3.5 text-violet-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-text-3">
                        Plans &amp; Billing
                    </span>
                </div>
                <h1 className="text-2xl font-bold text-white">Upgrade your plan</h1>
                <p className="mt-1 text-sm text-muted-text-2">
                    More minutes, no watermarks, priority rendering. Cancel anytime.
                </p>
            </div>

            {error && (
                <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {error}
                </div>
            )}

            {/* Plan cards */}
            <div className="grid gap-5 sm:grid-cols-3">
                {PLANS.map((plan) => {
                    const isCurrent = currentPlan === plan.id;
                    const planRank = PLAN_RANK[plan.id as PlanId] ?? 0;
                    const currentRank = PLAN_RANK[currentPlan] ?? 0;
                    const isUpgrade = planRank > currentRank;
                    const isDowngrade = planRank < currentRank && plan.id !== "free";

                    return (
                        <div
                            key={plan.id}
                            className={`relative flex flex-col rounded-xl border p-6 transition-all ${
                                isCurrent
                                    ? "border-violet-primary/40 bg-violet-primary/5"
                                    : "border-sk-border bg-surface-1 hover:border-sk-border-hover"
                            }`}
                        >
                            {"popular" in plan && plan.popular && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-primary px-3 py-0.5 text-[11px] font-semibold text-white shadow">
                                    Popular
                                </span>
                            )}

                            {/* Plan name + badge */}
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-white">{plan.name}</h3>
                                {isCurrent && (
                                    <span className="rounded-full bg-violet-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-primary">
                                        Current
                                    </span>
                                )}
                            </div>

                            {/* Price */}
                            <div className="mt-4 flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-white">{plan.price}</span>
                                <span className="text-sm text-muted-text-3">{plan.period}</span>
                            </div>

                            <p className="mt-2 text-sm text-muted-text-2">{plan.description}</p>

                            {/* CTA */}
                            <div className="mt-5">
                                {isCurrent ? (
                                    <div className="w-full rounded-lg border border-sk-border py-2.5 text-center text-sm font-medium text-muted-text-2">
                                        Your current plan
                                    </div>
                                ) : plan.id === "free" ? (
                                    <div className="w-full rounded-lg border border-sk-border py-2.5 text-center text-sm font-medium text-muted-text-3">
                                        Free tier
                                    </div>
                                ) : isDowngrade ? (
                                    <button
                                        disabled
                                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-sk-border py-2.5 text-sm font-medium text-muted-text-3 cursor-not-allowed"
                                    >
                                        <Lock className="h-3.5 w-3.5" />
                                        Contact support to downgrade
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleUpgrade(plan.id)}
                                        disabled={checkingOut !== null}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-violet-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-hover disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {checkingOut === plan.id ? (
                                            <>
                                                <LoadingSpinner size="sm" className="text-white" />
                                                Redirecting…
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="h-3.5 w-3.5" />
                                                Upgrade to {plan.name}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Features */}
                            <ul className="mt-5 space-y-2.5 border-t border-sk-border/50 pt-5">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-start gap-2 text-sm text-muted-text-1">
                                        <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-primary" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </div>

            {/* Billing note */}
            <p className="mt-8 text-center text-xs text-muted-text-3">
                Secure payment via Stripe. Subscriptions renew monthly.{" "}
                <Link href="/dashboard" className="underline underline-offset-2 hover:text-muted-text-1">
                    Back to dashboard
                </Link>
            </p>
        </div>
    );
}
