"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { SceneData } from "@/components/AnimationEngine/types";
import { ScenePlayer } from "@/components/AnimationEngine";
import { AlertTriangle, ArrowLeft, Link2 } from "lucide-react";

interface PlayableEpisode {
  episodeTitle: string;
  scenes: SceneData[];
}

interface EpisodePlayerClientProps {
  title: string;
  createdAt: string;
  playable: PlayableEpisode | null;
  error?: string | null;
}

export default function EpisodePlayerClient({
  title,
  createdAt,
  playable,
  error,
}: EpisodePlayerClientProps) {
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertTriangle className="h-10 w-10 text-muted-text-3" />
        <p className="mt-4 text-sm text-muted-text-1">{error}</p>
        <Link
          href="/dashboard/episodes"
          className="mt-4 rounded-md bg-violet-primary px-5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-hover"
        >
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
          <h1 className="text-2xl font-bold text-white">
            {title || "Episode"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-text-2">
            {playable
              ? `${playable.scenes.length} scene${playable.scenes.length === 1 ? "" : "s"}`
              : ""}
            {isMounted && ` · Created ${new Date(createdAt).toLocaleDateString()}`}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/episodes"
            className="inline-flex items-center gap-1.5 rounded-md border border-sk-border px-3 py-2 text-sm text-muted-text-1 transition-colors duration-150 hover:bg-surface-2 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            All Episodes
          </Link>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast({
                title: "Link copied!",
                description: "The episode link is now in your clipboard.",
              });
            }}
            className="inline-flex items-center gap-1.5 rounded-md border border-sk-border px-3 py-2 text-sm text-muted-text-1 transition-colors duration-150 hover:bg-surface-2 hover:text-white"
          >
            <Link2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>

      {/* Player */}
      {playable && (
        <ScenePlayer
          scenes={playable.scenes}
          onEpisodeComplete={() => console.log("Episode complete!")}
        />
      )}
    </div>
  );
}
