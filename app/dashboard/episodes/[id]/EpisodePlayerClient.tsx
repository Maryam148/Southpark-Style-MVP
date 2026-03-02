"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import type { SceneData } from "@/components/AnimationEngine/types";
import ScenePlayer, { type ScenePlayerHandle } from "@/components/AnimationEngine/ScenePlayer";
import {
  AlertTriangle, ArrowLeft, Link2, Download, Lock,
  Loader2, CheckCircle2,
} from "lucide-react";

// NOTE: CANVAS_W / CANVAS_H are no longer needed for export (server-side MP4),
// but kept here in case you reintroduce client-side recording later.
const CANVAS_W = 1280;
const CANVAS_H = 720;

interface PlayableEpisode { episodeTitle: string; scenes: SceneData[]; }

interface EpisodePlayerClientProps {
  episodeId: string;
  title: string;
  createdAt: string;
  playable: PlayableEpisode | null;
  error?: string | null;
}

type ExportPhase = "idle" | "server-render" | "done";

export default function EpisodePlayerClient({
  episodeId, title, createdAt, playable, error,
}: EpisodePlayerClientProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState<ExportPhase>("idle");
  const [progress, setProgress] = useState(0);

  const playerWrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ScenePlayerHandle>(null);

  const [exportAudioCtx] = useState<AudioContext | undefined>(undefined);
  const [exportAudioDest] = useState<MediaStreamAudioDestinationNode | undefined>(undefined);

  useEffect(() => { setIsMounted(true); }, []);

  const canExport = true || user?.plan === "pro" || user?.plan === "creator_plus";

  /* ══════════════════════════════════════════════════════════
     START EXPORT — Server-side Remotion MP4 via /api/export/local
     ══════════════════════════════════════════════════════════ */
  const startExport = useCallback(async () => {
    if (!playable) return;

    try {
      setPhase("server-render");
      setProgress(0);
      // If the render is slow, show an indeterminate "working" state.
      // (The local render endpoint does not currently provide granular progress.)
      const pulse = setInterval(() => {
        setProgress((p) => (p >= 95 ? 95 : p + 1));
      }, 2500);

      const res = await fetch("/api/export/local", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episode_id: episodeId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start export");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Response is always video/mp4 from /api/export/local
      a.download = `${title || "episode"}.mp4`;
      a.click();
      URL.revokeObjectURL(url);

      clearInterval(pulse);
      setProgress(100);
      setPhase("done");
    } catch (e: unknown) {
      console.error("[EpisodePlayer] Export failed", e);
      // Ensure any progress pulse stops on errors.
      setProgress(0);
      toast({
        variant: "destructive",
        title: "Export failed",
        description: e instanceof Error ? e.message : "Something went wrong while exporting.",
      });
      setPhase("idle");
    }
  }, [episodeId, playable, toast]);

  /* ══════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════ */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="h-10 w-10 text-muted-text-3" />
        <p className="mt-4 text-sm text-muted-text-1">{error}</p>
        <Link href="/dashboard/episodes"
          className="mt-4 rounded-md bg-violet-primary px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-hover">
          Back to Episodes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">{title || "Episode"}</h1>
          <p className="mt-0.5 text-sm text-muted-text-2">
            {playable ? `${playable.scenes.length} scene${playable.scenes.length === 1 ? "" : "s"}` : ""}
            {isMounted && ` · Created ${new Date(createdAt).toLocaleDateString()}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/episodes"
            className="inline-flex items-center gap-1.5 rounded-md border border-sk-border px-3 py-2 text-sm text-muted-text-1 transition-colors duration-150 hover:bg-surface-2 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> All Episodes
          </Link>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast({ title: "Link copied!", description: "The episode link is now in your clipboard." });
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-sk-border px-3 py-2 text-sm text-muted-text-1 transition-colors duration-150 hover:bg-surface-2 hover:text-white">
            <Link2 className="h-4 w-4" /> Share
          </button>

          {phase === "idle" && (
            <button onClick={startExport} disabled={!playable}
              className="inline-flex items-center gap-1.5 rounded-md border border-sk-border px-3 py-2 text-sm text-muted-text-1 transition-colors duration-150 hover:bg-surface-2 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">
              <Download className="h-4 w-4" /> Export Video
            </button>
          )}
          {phase === "server-render" && (
            <button
              disabled
              className="inline-flex items-center gap-1.5 rounded-md border border-violet-primary/40 bg-violet-primary/10 px-3 py-2 text-sm font-medium text-violet-300"
            >
              <Loader2 className="h-4 w-4 animate-spin" /> Rendering MP4{progress ? ` ${progress}%` : ""}
            </button>
          )}
          {phase === "done" && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm font-medium text-green-300">
              <CheckCircle2 className="h-4 w-4" /> Exported!
            </span>
          )}
        </div>
      </div>

      {/* Player */}
      <div ref={playerWrapRef} className="relative">
        {playable && (
          <ScenePlayer
            ref={playerRef}
            scenes={playable.scenes}
          />
        )}
      </div>
    </div>
  );
}
