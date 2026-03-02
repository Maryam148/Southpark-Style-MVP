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

interface PlayableEpisode { episodeTitle: string; scenes: SceneData[]; }

interface EpisodePlayerClientProps {
  episodeId: string;
  title: string;
  createdAt: string;
  playable: PlayableEpisode | null;
  error?: string | null;
}

type ExportPhase = "idle" | "recording" | "done";

export default function EpisodePlayerClient({
  episodeId: _episodeId, title, createdAt, playable, error,
}: EpisodePlayerClientProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [isMounted, setIsMounted] = useState(false);
  const [phase, setPhase] = useState<ExportPhase>("idle");
  const [progress, setProgress] = useState(0);

  const playerWrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ScenePlayerHandle | null>(null);

  const [exportAudioCtx, setExportAudioCtx] = useState<AudioContext | undefined>(undefined);
  const [exportAudioDest, setExportAudioDest] = useState<MediaStreamAudioDestinationNode | undefined>(undefined);
  const exportRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  // Stop any in-progress recording if the component unmounts mid-export
  useEffect(() => {
    return () => {
      const rec = exportRecorderRef.current;
      if (rec && rec.state === "recording") rec.stop();
    };
  }, []);

  const canExport = true || user?.plan === "pro" || user?.plan === "creator_plus";

  /* ══════════════════════════════════════════════════════════
     Episode complete — stop MediaRecorder when all scenes finish
     ══════════════════════════════════════════════════════════ */
  const onEpisodeComplete = useCallback(() => {
    const rec = exportRecorderRef.current;
    if (rec && rec.state === "recording") {
      // Brief delay to capture the final frame before stopping
      setTimeout(() => {
        if (rec.state === "recording") rec.stop();
      }, 500);
    }
  }, []);

  /* ══════════════════════════════════════════════════════════
     START EXPORT — Client-side MediaRecorder (runs on user's machine)
     Captures the canvas animation + TTS audio in real-time.
     Prefers MP4/H.264 where the browser supports it (Chrome, Safari);
     falls back to WebM on Firefox.
     ══════════════════════════════════════════════════════════ */
  const startExport = useCallback(async () => {
    if (!playable || !playerRef.current) return;

    try {
      setPhase("recording");
      setProgress(0);

      // 1. Get video stream from the stable mirror canvas in ScenePlayer.
      //    This canvas persists across scene remounts, so the MediaRecorder
      //    captures the full episode without interruption.
      const videoStream = playerRef.current.getCaptureStream(30);
      if (!videoStream) {
        throw new Error("Could not capture canvas stream. Try refreshing the page.");
      }

      // 2. Create AudioContext in this user-gesture context so TTS audio
      //    can be routed through it to the MediaRecorder.
      let audioCtx: AudioContext | undefined;
      let audioDest: MediaStreamAudioDestinationNode | undefined;
      try {
        audioCtx = new AudioContext();
        audioDest = audioCtx.createMediaStreamDestination();
        setExportAudioCtx(audioCtx);
        setExportAudioDest(audioDest);
      } catch (e) {
        console.warn("[Export] AudioContext unavailable — exporting video only:", e);
      }

      // 3. Combine video track + audio track into one stream
      const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
      if (audioDest) tracks.push(...audioDest.stream.getAudioTracks());
      const combinedStream = new MediaStream(tracks);

      // 4. Pick best MIME type — prefer MP4/H.264 (Chrome 131+, Safari),
      //    fall back to WebM (Firefox)
      const CANDIDATES = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4;codecs=avc1,mp4a",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm",
      ];
      const mimeType = CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
      const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";

      // 5. Set up MediaRecorder
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 5_000_000,
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${title || "episode"}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);

        setProgress(100);
        setPhase("done");
        exportRecorderRef.current = null;
        audioCtx?.close().catch(() => {});
        setExportAudioCtx(undefined);
        setExportAudioDest(undefined);
      };

      recorder.onerror = () => {
        setProgress(0);
        setPhase("idle");
        exportRecorderRef.current = null;
        audioCtx?.close().catch(() => {});
        setExportAudioCtx(undefined);
        setExportAudioDest(undefined);
        toast({ variant: "destructive", title: "Export failed", description: "Recording error. Try again." });
      };

      exportRecorderRef.current = recorder;
      recorder.start(200); // emit chunks every 200ms

      // 6. Reset and play from the beginning — recorder captures in real-time
      playerRef.current.resetAndPlay();

      // Pulse progress bar to show activity (export plays at real-time speed)
      const pulse = setInterval(() => {
        setProgress((p) => (p >= 90 ? 90 : p + 1));
      }, 3000);
      recorder.addEventListener("stop", () => clearInterval(pulse), { once: true });

    } catch (e: unknown) {
      console.error("[EpisodePlayer] Export failed", e);
      setProgress(0);
      setPhase("idle");
      exportRecorderRef.current = null;
      toast({
        variant: "destructive",
        title: "Export failed",
        description: e instanceof Error ? e.message : "Something went wrong while exporting.",
      });
    }
  }, [playable, title, toast]);

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
            <button onClick={startExport} disabled={!playable || !canExport}
              className="inline-flex items-center gap-1.5 rounded-md border border-sk-border px-3 py-2 text-sm text-muted-text-1 transition-colors duration-150 hover:bg-surface-2 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">
              {canExport ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              Export Video
            </button>
          )}
          {phase === "recording" && (
            <button
              disabled
              className="inline-flex items-center gap-1.5 rounded-md border border-violet-primary/40 bg-violet-primary/10 px-3 py-2 text-sm font-medium text-violet-300"
            >
              <Loader2 className="h-4 w-4 animate-spin" /> Recording{progress ? ` ${progress}%` : "…"}
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
            exportAudioCtx={exportAudioCtx}
            exportAudioDest={exportAudioDest}
            onEpisodeComplete={onEpisodeComplete}
          />
        )}
      </div>
    </div>
  );
}
