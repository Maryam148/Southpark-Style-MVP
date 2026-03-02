/**
 * Export audio pipeline.
 *
 * Pre-fetches and decodes every TTS audio clip for an episode.
 * Instead of pre-scheduling audio at fixed timestamps (which drifts from the
 * AnimationEngine's actual playback), it provides a buffer map and a `playClip`
 * function that plays audio on-demand — called by EpisodePlayerClient when
 * AnimationEngine signals each line start via `onDialoguePlay`.
 *
 * This guarantees perfect audio-video sync because the same event that
 * triggers the visual animation also triggers the recorded audio.
 */

import type { SceneData } from "@/components/AnimationEngine/types";

// Must match AnimationEngine constants
const LINE_GAP = 0.4;   // seconds between dialogue lines
const NO_AUDIO_LINE = 1.8;   // seconds for a line with no audio URL (NO_AUDIO_LINE_MS / 1000)
const PAUSE_LINE = 0.8;   // seconds for an empty / [pause] line

async function fetchAndDecode(url: string, ctx: AudioContext): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) return null;
    return await ctx.decodeAudioData(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export interface ExportAudioPlan {
  /** Estimated total duration in seconds — used to size the stop timer. */
  totalDuration: number;
  /** Map of audio URL → decoded AudioBuffer for on-demand playback. */
  bufferMap: Map<string, AudioBuffer>;
  /**
   * Play a single clip right now. Call this from the onDialoguePlay callback
   * so the recorded audio is perfectly synced with the visual animation.
   */
  playClip: (audioUrl: string) => void;
}

export async function buildExportAudio(
  scenes: SceneData[],
  ctx: AudioContext,
  dest: MediaStreamAudioDestinationNode,
  onProgress: (fetched: number, total: number) => void,
): Promise<ExportAudioPlan> {
  // Collect all lines to calculate total duration estimate
  type Line = { url?: string; text: string };
  const lines: Line[] = [];
  for (const scene of scenes) {
    for (const char of scene.characters) {
      for (const dl of char.dialogue) {
        lines.push({ url: dl.audio, text: dl.line ?? "" });
      }
    }
  }

  // Fetch all unique audio files in parallel
  const uniqueUrls = new Set<string>();
  for (const l of lines) {
    if (l.url) uniqueUrls.add(l.url);
  }

  const total = uniqueUrls.size;
  let fetched = 0;

  const bufferMap = new Map<string, AudioBuffer>();
  await Promise.all(
    Array.from(uniqueUrls).map(async (url) => {
      const buf = await fetchAndDecode(url, ctx);
      if (buf) bufferMap.set(url, buf);
      onProgress(++fetched, total);
    }),
  );

  // Calculate estimated total duration (for stop timer and progress bar)
  let cursor = 0;
  for (const line of lines) {
    const text = line.text.trim();
    const isPause = !text || /^\[pause\]$/i.test(text);
    if (isPause) {
      cursor += PAUSE_LINE + LINE_GAP;
    } else if (!line.url) {
      const wordCount = text.split(/\s+/).length;
      cursor += Math.max(NO_AUDIO_LINE, wordCount * 0.35) + LINE_GAP;
    } else {
      const buf = bufferMap.get(line.url);
      if (buf) {
        cursor += buf.duration + LINE_GAP;
      }
    }
  }

  const totalDuration = Math.max(cursor, 1);

  // Playback function — called on-demand when AnimationEngine starts each line
  const playClip = (audioUrl: string) => {
    const buffer = bufferMap.get(audioUrl);
    if (!buffer) return;
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    node.connect(dest);          // recorded into the video
    node.connect(ctx.destination); // audible to the user during export
    node.start();
  };

  return { totalDuration, bufferMap, playClip };
}
