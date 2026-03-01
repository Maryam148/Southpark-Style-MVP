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
  "Parsing script content",
  "Resolving character and background assets",
  "Synthesizing high-fidelity voices",
  "Uploading audio streams",
  "Saving episode",
];

export default function GenerateClient({ drafts, isPaid }: GenerateClientProps) {
  const [selectedId, setSelectedId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => { setIsMounted(true); }, []);

  const handleCheckout = async () => {
    try {
      const res = await fetch("/api/stripe/create-checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (e) { console.error("Checkout error:", e); }
  };

  const handleBypass = async () => {
    const res = await fetch("/api/dev/bypass-payment", { method: "POST" });
    if (res.ok) {
      toast({ title: "Bypass triggered", description: "Payment status updated." });
      window.location.reload();
    } else {
      toast({ variant: "destructive", title: "Bypass failed" });
    }
  };

  const handleGenerate = async () => {
    if (!selectedId || generating) return;
    setGenerating(true);
    setError(null);
    setCurrentStep(0);

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
        if (res.status === 402) {
          toast({ variant: "destructive", title: "API Error", description: "Could not synthesize speech via OpenAI. Please check your API key." });
        }
        setError(data.error || "Generation failed");
        setGenerating(false);
        return;
      }

      router.push(`/dashboard/episodes/${data.episode_id}`);
    } catch (err: unknown) {
      clearInterval(interval);
      console.error("Generation fetch error:", err);
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      setError(isAbort ? "Generation timed out — please try again." : "Network error — please try again.");
      setGenerating(false);
    }
  };

  const canGenerate = selectedId && !generating;
  const selectedEp = drafts.find((d) => d.id === selectedId);
  const meta = selectedEp ? (selectedEp.metadata as Record<string, unknown> | null) : null;
  const sceneCount = (meta?.scene_count as number) ?? null;
  const chars = (meta?.characters as string[]) ?? [];
  const progressPct = generating ? Math.round(((currentStep + 1) / GENERATION_STEPS.length) * 100) : 0;

  return (
    <div className="mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Generate Episode</h1>
        <p className="mt-1 text-sm text-muted-text-2">
          Select a draft and kick off the animation pipeline.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-5 rounded-lg border border-sk-border bg-surface-1 p-5">
        {/* Draft selector */}
        <div>
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-muted-text-3">
            Draft Episode
          </label>
          {drafts.length === 0 ? (
            <p className="text-sm text-muted-text-3">
              No drafts yet.{" "}
              <a href="/dashboard/upload-script" className="text-violet-primary hover:underline">Upload a script</a> first.
            </p>
          ) : (
            <div className="relative">
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full appearance-none rounded-md border border-sk-border bg-surface-2 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-sk-border-hover"
              >
                <option value="">Select a draft…</option>
                {drafts.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.title}{isMounted && ` — ${new Date(ep.created_at).toLocaleDateString()}`}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-text-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>

        {/* Episode metadata */}
        {selectedEp && (
          <div className="rounded-md border border-sk-border bg-surface-2 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-text-3">Scenes</p>
                <p className="mt-1 text-2xl font-bold text-white">{sceneCount ?? "—"}</p>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-text-3">Characters</p>
                <div className="flex flex-wrap gap-1">
                  {chars.length > 0 ? chars.map((c) => (
                    <span key={c} className="rounded-full border border-sk-border bg-surface-3 px-2 py-0.5 text-xs font-medium text-muted-text-1">
                      {c}
                    </span>
                  )) : <span className="text-xs text-muted-text-3">—</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment gate */}
        {!isPaid && (
          <div className="rounded-md border border-amber-900/40 bg-amber-950/20 p-4">
            <div className="flex items-start gap-3">
              <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-300">Pro required</p>
                <p className="mt-0.5 text-xs leading-relaxed text-amber-400/70">
                  Upgrade to generate playable episodes with character voices.
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleCheckout}
                className="rounded-md bg-violet-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-hover"
              >
                Upgrade — $9.99
              </button>
              {true && (
                <button
                  onClick={handleBypass}
                  className="rounded-md border border-sk-border px-3 py-1.5 text-xs font-medium text-muted-text-2 transition-colors hover:bg-surface-2 hover:text-white"
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
          className="flex w-full items-center justify-center gap-2 rounded-md bg-violet-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating ? <LoadingSpinner size="sm" className="text-white" /> : <Wand2 className="h-4 w-4" />}
          {generating ? "Generating…" : "Generate Episode"}
        </button>
      </div>

      {/* Progress */}
      {generating && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-violet-primary">{GENERATION_STEPS[currentStep]}…</p>
              <p className="text-xs text-muted-text-3">{progressPct}%</p>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-violet-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="space-y-2.5">
            {GENERATION_STEPS.map((step, i) => (
              <div key={i} className={`flex items-center gap-2.5 text-xs ${i < currentStep ? "text-muted-text-3" : i === currentStep ? "text-violet-primary" : "text-muted-text-3 opacity-30"}`}>
                {i < currentStep ? (
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-green-400" />
                ) : i === currentStep ? (
                  <LoadingSpinner size="sm" className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 flex-shrink-0 flex items-center justify-center">
                    <span className="h-1 w-1 rounded-full bg-current" />
                  </span>
                )}
                <span className={i < currentStep ? "line-through decoration-muted-text-3" : ""}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
