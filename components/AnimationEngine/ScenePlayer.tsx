"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import AnimationEngine from "./AnimationEngine";
import type { SceneData } from "./types";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize,
  RotateCcw,
  Film,
  FastForward,
  Rewind,
} from "lucide-react";

interface ScenePlayerProps {
  scenes: SceneData[];
  onEpisodeComplete?: () => void;
}

export default function ScenePlayer({
  scenes,
  onEpisodeComplete,
}: ScenePlayerProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [sceneInitialTime, setSceneInitialTime] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [done, setDone] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to format seconds -> MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Estimate total duration
  useEffect(() => {
    let est = 0;
    scenes.forEach((s) => {
      // Logic from AnimationEngine: DIALOGUE_DURATION_MS + 1200 per dialogue entry
      const maxLines = Math.max(0, ...s.characters.map((c) => c.dialogue.length));
      // This is a rough heuristic matching buildState interleaving
      let lineCount = 0;
      s.characters.forEach((c) => (lineCount += c.dialogue.length));
      est += (lineCount * (3000 + 1200)) / 1000;
    });
    setTotalDuration(est);
  }, [scenes]);

  const getPastDuration = (idx: number) => {
    let past = 0;
    for (let i = 0; i < idx; i++) {
      const s = scenes[i];
      let lineCount = 0;
      s.characters.forEach((c) => (lineCount += c.dialogue.length));
      past += (lineCount * (3000 + 1200)) / 1000;
    }
    return past;
  };

  const seekTo = (globalTime: number) => {
    let acc = 0;
    let found = false;
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i];
      let lineCount = 0;
      s.characters.forEach((c) => (lineCount += c.dialogue.length));
      const sceneDur = (lineCount * (3000 + 1200)) / 1000;

      if (globalTime <= acc + sceneDur) {
        setCurrentIdx(i);
        setSceneInitialTime(globalTime - acc);
        setCurrentTime(globalTime);
        setDone(false);
        found = true;
        break;
      }
      acc += sceneDur;
    }
    if (!found) {
      setDone(true);
      setCurrentTime(totalDuration);
    }
  };

  const handleTimeUpdate = useCallback(
    (sceneTime: number) => {
      const past = getPastDuration(currentIdx);
      const now = past + sceneTime;
      setCurrentTime(now);
      // Synchronize slider state on local ref if needed, but here we just use state
    },
    [currentIdx, scenes]
  );

  const handleSceneComplete = useCallback(() => {
    const nextIdx = currentIdx + 1;
    if (nextIdx >= scenes.length) {
      setDone(true);
      setCurrentTime(totalDuration);
      onEpisodeComplete?.();
    } else {
      setCurrentIdx(nextIdx);
    }
  }, [currentIdx, scenes.length, totalDuration, onEpisodeComplete]);

  const togglePlay = () => setIsPaused((p) => !p);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen().catch(() => { });
    }
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setSceneInitialTime(0);
    setCurrentTime(0);
    setDone(false);
    setIsPaused(false);
  };

  const triggerControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!isPaused && !done) setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "KeyF") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPaused]);

  if (scenes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-sk-border bg-surface-1 py-32 text-center">
        <Film className="h-10 w-10 text-muted-text-3" />
        <p className="mt-4 text-sm font-medium text-muted-text-1">
          No scenes found in this episode.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="group relative w-full overflow-hidden rounded-lg bg-black"
      style={{ maxHeight: "100vh" }}
      onMouseMove={triggerControls}
      onMouseLeave={() => !isPaused && !done && setShowControls(false)}
    >
      {/* The Engine */}
      {!done ? (
        <AnimationEngine
          key={currentIdx}
          sceneData={scenes[currentIdx]}
          onSceneComplete={handleSceneComplete}
          onTimeUpdate={handleTimeUpdate}
          paused={isPaused}
          initialTime={sceneInitialTime}
        />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center bg-surface-0 text-center">
          <RotateCcw className="h-10 w-10 text-muted-text-3" />
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
            Episode Complete
          </h2>
          <p className="mt-2 max-w-md px-6 text-sm text-muted-text-1">
            You&apos;ve finished watching {scenes.length} scene
            {scenes.length === 1 ? "" : "s"}.
          </p>
          <button
            onClick={handleReset}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-violet-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-hover"
          >
            <RotateCcw className="h-4 w-4" />
            Replay Episode
          </button>
        </div>
      )}

      {/* Control Overlay */}
      <div
        className={`absolute inset-0 z-10 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-6 transition-opacity duration-300 ${showControls || isPaused || done
          ? "opacity-100"
          : "pointer-events-none opacity-0"
          }`}
      >
        {/* Center Play/Pause Indicator */}
        {isPaused && !done && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-md">
              <Play className="ml-1 h-8 w-8 text-white" />
            </div>
          </div>
        )}

        {/* Bottom Controls */}
        <div className="flex flex-col gap-4">
          {/* Progress Bar (Scrubbable) */}
          <div className="group/seeker relative px-1">
            <input
              type="range"
              min={0}
              max={totalDuration}
              step={0.1}
              value={currentTime}
              onChange={(e) => seekTo(parseFloat(e.target.value))}
              className="accent-violet-primary h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/20 transition-all hover:h-2"
              style={{
                background: `linear-gradient(to right, #8b5cf6 ${(currentTime / totalDuration) * 100}%, rgba(255,255,255,0.2) ${(currentTime / totalDuration) * 100}%)`,
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                disabled={done}
                className="text-white transition-colors duration-150 hover:text-violet-hover disabled:opacity-30"
              >
                {isPaused ? (
                  <Play className="h-6 w-6" />
                ) : (
                  <Pause className="h-6 w-6" />
                )}
              </button>

              {/* Seek Buttons */}
              <button
                onClick={() => seekTo(Math.max(0, currentTime - 5))}
                className="text-white/70 transition-colors hover:text-white"
                title="Back 5s"
              >
                <Rewind className="h-5 w-5" />
              </button>
              <button
                onClick={() => seekTo(Math.min(totalDuration, currentTime + 5))}
                className="text-white/70 transition-colors hover:text-white"
                title="Forward 5s"
              >
                <FastForward className="h-5 w-5" />
              </button>

              {/* Skip */}
              <button
                onClick={() => {
                  const target = Math.max(0, currentIdx - 1);
                  setCurrentIdx(target);
                  setSceneInitialTime(0);
                  setDone(false);
                }}
                disabled={currentIdx === 0}
                className="text-muted-text-1 transition-colors duration-150 hover:text-white disabled:opacity-30"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={handleSceneComplete}
                disabled={done}
                className="text-muted-text-1 transition-colors duration-150 hover:text-white disabled:opacity-30"
              >
                <SkipForward className="h-4 w-4" />
              </button>

              {/* Video Timer */}
              <span className="text-xs font-medium tabular-nums text-white/80">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-text-1 transition-colors duration-150 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restart
              </button>

              <button
                onClick={toggleFullscreen}
                className="text-muted-text-1 transition-colors duration-150 hover:text-white"
              >
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
