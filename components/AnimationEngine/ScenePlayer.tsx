"use client";

import { useState, useCallback, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import AnimationEngine from "./AnimationEngine";
import type { SceneData } from "./types";
import { CANVAS_W, CANVAS_H } from "./drawHelpers";
import {
  Play, Pause, SkipBack, SkipForward,
  Maximize, Minimize, RotateCcw, Volume2, VolumeX, Film,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────
   Duration estimation  (word-count based, ~150 wpm speaking rate)
   ───────────────────────────────────────────────────────── */
function estimateLineDuration(text: string): number {
  if (!text || /^\[pause\]$/i.test(text.trim())) return 0.8;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1.5, words / 2.5) + 0.4; // speech + inter-line gap
}

function computeSceneDurations(scenes: SceneData[]): number[] {
  return scenes.map((scene) => {
    let dur = 0;
    scene.characters.forEach((char) =>
      char.dialogue.forEach((dl) => { dur += estimateLineDuration(dl.line ?? ""); })
    );
    return Math.max(dur, 1);
  });
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────────────────
   Props
   ───────────────────────────────────────────────────────── */
export interface ScenePlayerHandle {
  resetAndPlay: () => void;
  /** Returns a MediaStream from the stable mirror canvas for client-side MP4 export. */
  getCaptureStream: (fps?: number) => MediaStream | null;
}

interface ScenePlayerProps {
  scenes: SceneData[];
  onEpisodeComplete?: () => void;
  /** When true, overrides the internal mute toggle — used during export to prevent double audio */
  forceMuted?: boolean;
  /** Export audio routing — same audio that drives animation is captured by recorder */
  exportAudioCtx?: AudioContext;
  exportAudioDest?: MediaStreamAudioDestinationNode;
}

/* ─────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────── */
const ScenePlayer = forwardRef<ScenePlayerHandle, ScenePlayerProps>(
  function ScenePlayer({ scenes, onEpisodeComplete, forceMuted, exportAudioCtx, exportAudioDest }, ref) {
    /* ── Scene / playback state (React-managed) ── */
    const [currentIdx, setCurrentIdx] = useState(0);
    const [resetKey, setResetKey] = useState(0);
    const [isPaused, setIsPaused] = useState(true);
    const [hasStarted, setHasStarted] = useState(false);
    const [done, setDone] = useState(false);
    const [muted, setMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    /* ── DOM refs (updated directly — zero React re-renders per frame) ── */
    const scrubberRef = useRef<HTMLInputElement>(null);
    const timeDisplayRef = useRef<HTMLSpanElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // Persistent canvas — stable across AnimationEngine remounts; used by MediaRecorder
    const persistentCanvasRef = useRef<HTMLCanvasElement>(null);

    /* ── Timing refs (wall-clock) ── */
    const playStartRef = useRef<number | null>(null); // performance.now() when scene started
    const isScrubRef = useRef(false);               // true while user is dragging
    const scrubValueRef = useRef(0);                   // live scrub target during drag

    /* ── Other refs to avoid stale closures ── */
    const currentIdxRef = useRef(currentIdx);
    const isPausedRef = useRef(isPaused);
    const doneRef = useRef(done);
    currentIdxRef.current = currentIdx;
    isPausedRef.current = isPaused;
    doneRef.current = done;

    const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const rafRef = useRef<number>(0);

    /* ── Precomputed durations ── */
    const sceneDurations = useMemo(() => computeSceneDurations(scenes), [scenes]);
    const totalDuration = useMemo(() => sceneDurations.reduce((a, b) => a + b, 0), [sceneDurations]);
    const sceneOffsets = useMemo(() => {
      const offsets = [0];
      for (let i = 0; i < sceneDurations.length - 1; i++)
        offsets.push(offsets[i] + sceneDurations[i]);
      return offsets;
    }, [sceneDurations]);

    /* ─────────────────────────────────────────────────────────
       Direct DOM update — called from rAF, never triggers re-render
       ───────────────────────────────────────────────────────── */
    const updateUI = useCallback((globalTimeSec: number) => {
      const clamped = Math.max(0, Math.min(globalTimeSec, totalDuration));
      const pct = totalDuration > 0 ? (clamped / totalDuration) * 100 : 0;

      if (scrubberRef.current) {
        scrubberRef.current.value = String(clamped);
        scrubberRef.current.style.background =
          `linear-gradient(to right, #8b5cf6 ${pct}%, rgba(255,255,255,0.15) ${pct}%)`;
      }
      if (timeDisplayRef.current) {
        timeDisplayRef.current.textContent = `${formatTime(clamped)} / ${formatTime(totalDuration)}`;
      }
    }, [totalDuration]);

    /* ─────────────────────────────────────────────────────────
       rAF loop — smooth 60 fps progress, no setState
       ───────────────────────────────────────────────────────── */
    useEffect(() => {
      const tick = () => {
        if (!isScrubRef.current && playStartRef.current !== null && !isPausedRef.current) {
          const sceneElapsed = (performance.now() - playStartRef.current) / 1000;
          const globalTime = Math.min(
            (sceneOffsets[currentIdxRef.current] ?? 0) + sceneElapsed,
            totalDuration,
          );
          updateUI(globalTime);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }, [totalDuration, sceneOffsets, updateUI]);

    /* ─────────────────────────────────────────────────────────
       Sync wall clock when scene/reset changes
       ───────────────────────────────────────────────────────── */
    useEffect(() => {
      if (!isPausedRef.current) playStartRef.current = performance.now();
      updateUI(sceneOffsets[currentIdx] ?? 0);
    }, [currentIdx, resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ─────────────────────────────────────────────────────────
       Seek to a global time — remounts engine at the right scene
       ───────────────────────────────────────────────────────── */
    const seekTo = useCallback((globalTimeSec: number) => {
      let acc = 0;
      for (let i = 0; i < scenes.length; i++) {
        const dur = sceneDurations[i];
        if (globalTimeSec <= acc + dur || i === scenes.length - 1) {
          setDone(false);
          if (i === currentIdxRef.current) {
            // Same scene — just reset it
            setResetKey((k) => k + 1);
          } else {
            setCurrentIdx(i);
          }
          playStartRef.current = performance.now();
          updateUI(globalTimeSec);
          break;
        }
        acc += dur;
      }
    }, [scenes.length, sceneDurations, updateUI]);

    /* ─────────────────────────────────────────────────────────
       Scrubber event handlers
       ───────────────────────────────────────────────────────── */
    const onScrubStart = useCallback(() => {
      isScrubRef.current = true;
    }, []);

    const onScrubMove = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      scrubValueRef.current = val;
      updateUI(val); // live visual preview while dragging
    }, [updateUI]);

    const onScrubEnd = useCallback(() => {
      isScrubRef.current = false;
      seekTo(scrubValueRef.current);
    }, [seekTo]);

    /* ─────────────────────────────────────────────────────────
       Play / Pause
       ───────────────────────────────────────────────────────── */
    const togglePlay = useCallback(() => {
      // iOS WebKit (used by ALL browsers on iPhone — Safari, Chrome, Firefox) blocks
      // audio.play() when called from async contexts like useEffect. The browser only
      // allows play() that is triggered synchronously within a user-gesture handler.
      // Playing a tiny silent clip HERE, in this gesture handler, unlocks the page's
      // audio subsystem for the session — all subsequent async play() calls then work.
      if (!hasStarted) {
        try {
          new Audio(
            "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
          ).play().catch(() => {});
        } catch (_) {}
      }

      const nowPaused = isPausedRef.current;
      if (!hasStarted) setHasStarted(true);
      if (nowPaused) {
        // Resuming
        playStartRef.current = performance.now();
      } else {
        // Pausing — freeze the wall clock
        playStartRef.current = null;
      }
      setIsPaused((p) => !p);
    }, [hasStarted]);

    /* ─────────────────────────────────────────────────────────
       Scene advance (called by engine when a scene finishes)
       ───────────────────────────────────────────────────────── */
    const handleSceneComplete = useCallback(() => {
      const nextIdx = currentIdxRef.current + 1;
      if (nextIdx >= scenes.length) {
        setDone(true);
        updateUI(totalDuration);
        onEpisodeComplete?.();
      } else {
        setCurrentIdx(nextIdx);
        playStartRef.current = performance.now();
      }
    }, [scenes.length, totalDuration, updateUI, onEpisodeComplete]);

    /* ─────────────────────────────────────────────────────────
       Reset / restart
       ───────────────────────────────────────────────────────── */
    const handleReset = useCallback(() => {
      setCurrentIdx(0);
      setResetKey((k) => k + 1);
      setDone(false);
      setIsPaused(false);
      setHasStarted(true);
      playStartRef.current = performance.now();
      updateUI(0);
    }, [updateUI]);

    /* ─────────────────────────────────────────────────────────
       Controls auto-hide
       ───────────────────────────────────────────────────────── */
    const triggerControls = useCallback(() => {
      setShowControls(true);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = setTimeout(() => {
        if (!isPausedRef.current && !doneRef.current) setShowControls(false);
      }, 3000);
    }, []);

    /* ─────────────────────────────────────────────────────────
       Fullscreen
       ───────────────────────────────────────────────────────── */
    const toggleFullscreen = useCallback(() => {
      if (!containerRef.current) return;
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen().catch(() => { });
      }
    }, []);

    useEffect(() => {
      const handler = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener("fullscreenchange", handler);
      return () => document.removeEventListener("fullscreenchange", handler);
    }, []);

    /* ─────────────────────────────────────────────────────────
       Keyboard shortcuts
       ───────────────────────────────────────────────────────── */
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        if (e.code === "Space") { e.preventDefault(); togglePlay(); }
        if (e.code === "KeyF") toggleFullscreen();
        if (e.code === "KeyM") setMuted((m) => !m);
        if (e.code === "ArrowRight") {
          const cur = scrubberRef.current ? parseFloat(scrubberRef.current.value) : 0;
          seekTo(Math.min(totalDuration, cur + 10));
        }
        if (e.code === "ArrowLeft") {
          const cur = scrubberRef.current ? parseFloat(scrubberRef.current.value) : 0;
          seekTo(Math.max(0, cur - 10));
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [togglePlay, toggleFullscreen, seekTo, totalDuration]);

    /* ─────────────────────────────────────────────────────────
       Imperative handle for export
       ───────────────────────────────────────────────────────── */
    useImperativeHandle(ref, () => ({
      resetAndPlay: handleReset,
      getCaptureStream: (fps = 30) => persistentCanvasRef.current?.captureStream(fps) ?? null,
    }), [handleReset]);

    /* ─────────────────────────────────────────────────────────
       Empty state
       ───────────────────────────────────────────────────────── */
    if (scenes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-sk-border bg-surface-1 py-32 text-center">
          <Film className="h-10 w-10 text-muted-text-3" />
          <p className="mt-4 text-sm font-medium text-muted-text-1">No scenes found.</p>
        </div>
      );
    }

    const controlsVisible = showControls || isPaused || done;

    return (
      <div
        ref={containerRef}
        className="group relative w-full overflow-hidden rounded-xl bg-black select-none"
        style={{ maxHeight: "80vh" }}
        onMouseMove={triggerControls}
        onMouseLeave={() => !isPaused && !done && setShowControls(false)}
        onTouchStart={triggerControls}
        onDoubleClick={toggleFullscreen}
      >
        {/* Hidden persistent canvas — stable MediaRecorder source across scene remounts */}
        <canvas
          ref={persistentCanvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ display: "none" }}
          aria-hidden="true"
        />

        {/* ── Canvas — always mounted so export capture continues working ── */}
        <AnimationEngine
          key={`${currentIdx}-${resetKey}`}
          sceneData={scenes[currentIdx]}
          onSceneComplete={handleSceneComplete}
          paused={isPaused || done}
          muted={muted || !!forceMuted}
          exportAudioCtx={exportAudioCtx}
          exportAudioDest={exportAudioDest}
          mirrorCanvasRef={persistentCanvasRef}
        />

        {/* ── Done overlay (on top of canvas, not replacing it) ── */}
        {done && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-0/95 px-4 text-center z-10">
            <RotateCcw className="h-10 w-10 text-muted-text-3" />
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Episode Complete</h2>
            <p className="mt-2 max-w-md text-sm text-muted-text-1">
              {scenes.length} scene{scenes.length === 1 ? "" : "s"} · {formatTime(totalDuration)}
            </p>
            <button
              onClick={handleReset}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-violet-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-hover"
            >
              <RotateCcw className="h-4 w-4" /> Replay Episode
            </button>
          </div>
        )}

        {/* ── Start overlay ── */}
        {!hasStarted && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <button
              onClick={togglePlay}
              onTouchEnd={(e) => { e.preventDefault(); togglePlay(); }}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-violet-primary shadow-2xl ring-4 ring-violet-primary/30 transition-all duration-200 active:scale-95 hover:scale-105 hover:bg-violet-hover"
            >
              <Play className="ml-1.5 h-9 w-9 text-white" />
            </button>
            <p className="mt-4 text-sm font-medium text-white/60 tracking-wide">Click to play</p>
          </div>
        )}

        {/* ── Click-to-pause (canvas area only) ── */}
        {hasStarted && !done && (
          <div
            className="absolute inset-0 z-[5]"
            onClick={togglePlay}
          />
        )}

        {/* ── Pause indicator (brief flash) ── */}
        {isPaused && hasStarted && !done && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 backdrop-blur-md ring-1 ring-white/10">
              <Pause className="h-7 w-7 text-white" />
            </div>
          </div>
        )}

        {/* ── Controls overlay ── */}
        <div
          className={`absolute inset-x-0 bottom-0 z-20 transition-all duration-300 ${controlsVisible ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-1"
            }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Gradient fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent rounded-b-xl" />

          <div className="relative z-10 px-4 pb-4 pt-8 space-y-2">

            {/* ── Scrubber ── */}
            <div className="px-1">
              <input
                ref={scrubberRef}
                type="range"
                min={0}
                max={totalDuration || 1}
                step={0.05}
                defaultValue={0}
                className="player-scrubber w-full cursor-pointer"
                onMouseDown={onScrubStart}
                onTouchStart={onScrubStart}
                onChange={onScrubMove}
                onMouseUp={onScrubEnd}
                onTouchEnd={onScrubEnd}
                style={{ background: "rgba(255,255,255,0.15)" }}
              />
            </div>

            {/* ── Controls row ── */}
            <div className="flex items-center justify-between gap-2">

              {/* Left cluster */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Play/Pause */}
                <button
                  onClick={togglePlay}
                  disabled={done}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-all hover:bg-white/10 disabled:opacity-30"
                  title={isPaused ? "Play (Space)" : "Pause (Space)"}
                >
                  {isPaused
                    ? <Play className="h-5 w-5 ml-0.5" />
                    : <Pause className="h-5 w-5" />}
                </button>

                {/* Skip scene back */}
                <button
                  onClick={() => { setCurrentIdx((i) => Math.max(0, i - 1)); }}
                  disabled={currentIdx === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:opacity-30"
                  title="Previous scene"
                >
                  <SkipBack className="h-4 w-4" />
                </button>

                {/* Skip scene forward */}
                <button
                  onClick={handleSceneComplete}
                  disabled={done}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-all hover:bg-white/10 hover:text-white disabled:opacity-30"
                  title="Next scene"
                >
                  <SkipForward className="h-4 w-4" />
                </button>

                {/* Volume */}
                <button
                  onClick={() => setMuted((m) => !m)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  title={muted ? "Unmute (M)" : "Mute (M)"}
                >
                  {muted
                    ? <VolumeX className="h-4 w-4" />
                    : <Volume2 className="h-4 w-4" />}
                </button>

                {/* Time */}
                <span
                  ref={timeDisplayRef}
                  className="pl-1 text-[11px] font-medium tabular-nums text-white/70 hidden sm:inline"
                >
                  00:00 / {formatTime(totalDuration)}
                </span>
              </div>

              {/* Right cluster */}
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Scene indicator */}
                <span className="text-[11px] text-white/50 hidden sm:inline tabular-nums">
                  Scene {currentIdx + 1}/{scenes.length}
                </span>

                {/* Restart */}
                <button
                  onClick={handleReset}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  title="Restart"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  title="Fullscreen (F)"
                >
                  {isFullscreen
                    ? <Minimize className="h-3.5 w-3.5" />
                    : <Maximize className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  });

ScenePlayer.displayName = "ScenePlayer";
export default ScenePlayer;
