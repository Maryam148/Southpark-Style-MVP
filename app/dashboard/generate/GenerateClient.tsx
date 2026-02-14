"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Episode } from "@/types";
import { Lock, Wand2, AlertTriangle, Check } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

interface GenerateClientProps {
  drafts: Episode[];
  isPaid: boolean;
}

const GENERATION_STEPS = [
  "Parsing script JSON...",
  "Resolving character assets...",
  "Synthesizing voices...",
  "Building episode...",
];

export default function GenerateClient({ drafts, isPaid }: GenerateClientProps) {
  const [selectedId, setSelectedId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCheckout = async () => {
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
    }
  };

  const handleBypass = async () => {
    // In dev, confirm is still okay but let's add feedback
    const res = await fetch("/api/dev/bypass-payment", { method: "POST" });
    if (res.ok) {
      toast({ title: "Bypass triggered", description: "Payment status updated." });
      window.location.reload();
    } else {
      toast({ variant: "destructive", title: "Bypass failed" });
    }
  };

  const handleGenerate = async () => {
    if (!selectedId) return;
    setGenerating(true);
    setError(null);
    setCurrentStep(0);

    // Simulate step progress
    const interval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, GENERATION_STEPS.length - 1));
    }, 3000);

    try {
      const res = await fetch("/api/generate/episode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episode_id: selectedId }),
      });

      clearInterval(interval);
      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error || "Generation failed";

        // Custom handling for quota or other known status codes
        if (res.status === 402) {
          toast({
            variant: "destructive",
            title: "Quota Exceeded",
            description: "Your ElevenLabs character limit has been reached.",
          });
        }

        setError(errorMsg);
        setGenerating(false);
        return;
      }

      router.push(`/dashboard/episodes/${data.episode_id}`);
    } catch (err: unknown) {
      clearInterval(interval);
      console.error("Generation fetch error:", err);
      setError("Network error — please try again.");
      setGenerating(false);
    }
  };

  const canGenerate = selectedId && isPaid && !generating;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">Generate Episode</h1>
        <p className="mt-1 text-sm text-muted-text-1">
          Select a draft script and generate your animated episode.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-5 rounded-lg border border-sk-border bg-surface-1 p-4 sm:p-6">
        {/* Episode selector */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-text-1">
            Choose Draft Episode
          </label>

          {drafts.length === 0 ? (
            <p className="py-2 text-sm text-muted-text-3">
              No draft episodes.{" "}
              <a
                href="/dashboard/upload-script"
                className="text-violet-primary hover:underline"
              >
                Upload a script
              </a>{" "}
              first.
            </p>
          ) : (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-md border border-sk-border bg-surface-2 px-3 py-2 text-sm text-white outline-none transition-colors duration-150 focus:border-violet-primary focus:ring-1 focus:ring-violet-primary/50"
            >
              <option value="">Select a draft...</option>
              {drafts.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.title}
                  {isMounted && ` — ${new Date(ep.created_at).toLocaleDateString()}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Selected episode info */}
        {selectedId &&
          (() => {
            const ep = drafts.find((d) => d.id === selectedId);
            if (!ep) return null;
            const meta = ep.metadata as Record<string, unknown> | null;
            const sceneCount = (meta?.scene_count as number) ?? "—";
            const chars = (meta?.characters as string[]) ?? [];
            return (
              <div className="rounded-md border border-sk-border bg-surface-2 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-text-2">
                      Scenes
                    </p>
                    <p className="mt-0.5 text-lg font-bold text-white">
                      {sceneCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-text-2">
                      Characters
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {chars.length > 0 ? (
                        chars.map((c) => (
                          <span
                            key={c}
                            className="rounded-full bg-surface-3 px-2.5 py-0.5 text-xs text-muted-text-1"
                          >
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-text-3">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* Payment gate */}
        {!isPaid && (
          <div className="rounded-md border border-amber-800/50 bg-amber-950/20 px-4 py-4 text-sm">
            <div className="flex items-start gap-2 text-amber-400">
              <Lock className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                <span className="font-semibold text-amber-300">
                  Pro Required.
                </span>{" "}
                Upgrade to generate playable episodes.
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handleCheckout}
                className="rounded-md bg-violet-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-violet-hover"
              >
                Upgrade Now — $9.99
              </button>
              {process.env.NODE_ENV === "development" && (
                <button
                  onClick={handleBypass}
                  className="rounded-md border border-amber-700/50 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors duration-150 hover:bg-amber-900/30"
                >
                  Dev Bypass
                </button>
              )}
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-violet-primary py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? (
            <LoadingSpinner size="sm" className="text-white" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          {generating ? "Generating episode..." : "Generate Episode"}
        </button>

        {/* Step indicator */}
        {generating && (
          <div className="space-y-2">
            <div className="h-1 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-violet-primary transition-all duration-500"
                style={{
                  width: `${((currentStep + 1) / GENERATION_STEPS.length) * 100}%`,
                }}
              />
            </div>
            <div className="space-y-1">
              {GENERATION_STEPS.map((step, i) => (
                <p
                  key={i}
                  className={`text-xs ${i < currentStep
                    ? "text-muted-text-2"
                    : i === currentStep
                      ? "text-violet-primary"
                      : "text-muted-text-3"
                    }`}
                >
                  {i < currentStep ? (
                    <Check className="mr-1 inline h-3 w-3" />
                  ) : i === currentStep ? (
                    <LoadingSpinner
                      size="sm"
                      className="mr-1 inline h-3 w-3"
                    />
                  ) : null}
                  {step}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
