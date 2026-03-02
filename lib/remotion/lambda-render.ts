/**
 * Remotion Lambda render helpers.
 *
 * Uses @remotion/lambda/client (no AWS SDK bundled — lighter, safe for
 * Next.js edge & serverless). All AWS credentials come from env vars
 * (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY).
 *
 * Flow:
 *   1. startRender()   → returns { renderId, bucketName }
 *   2. getRenderStatus() → returns progress + output URL when done
 *
 * The API route stores renderId in the DB and polls status on demand.
 * This keeps the initial request fast (< 500ms) regardless of render time.
 */

import {
  renderMediaOnLambda,
  getRenderProgress,
  speculateFunctionName,
} from "@remotion/lambda/client";
import type { RenderMediaOnLambdaOutput } from "@remotion/lambda/client";

import {
  REMOTION_REGION,
  RENDER_CODEC,
  FRAME_JPEG_QUALITY,
  LAMBDA_SPEC,
  S3_DELETE_AFTER,
  getServeUrl,
} from "./config";

// ── Dynamic framesPerLambda ─────────────────────────────────────────────────
// Target: at most MAX_CONCURRENT_LAMBDAS workers per render job.
// Floor: MIN_FRAMES_PER_LAMBDA frames per worker to amortise cold-start
// overhead (~2-3 s per Lambda invocation).
//
// Examples at 30 fps:
//   10 s  (300 f)  → max(20, ceil(300/20))  = 20 f/λ → 15 workers
//   30 s  (900 f)  → max(20, ceil(900/20))  = 45 f/λ → 20 workers
//   60 s  (1800 f) → max(20, ceil(1800/20)) = 90 f/λ → 20 workers
//    5 m  (9000 f) → max(20, ceil(9000/20)) = 450 f/λ → 20 workers
const MAX_CONCURRENT_LAMBDAS = 20;
const MIN_FRAMES_PER_LAMBDA  = 20;

function computeFramesPerLambda(totalFrames: number): number {
  return Math.max(
    MIN_FRAMES_PER_LAMBDA,
    Math.ceil(totalFrames / MAX_CONCURRENT_LAMBDAS),
  );
}

/** Derive the function name from the spec used at deploy time. */
const FUNCTION_NAME = speculateFunctionName(LAMBDA_SPEC);

export interface StartRenderOptions {
  /** Remotion composition ID (must match the id in registerRoot). */
  compositionId: string;
  /** Props passed into the composition. Keep serializable (no functions). */
  inputProps: Record<string, unknown>;
  /** Used to name the downloaded file. */
  episodeId: string;
  /**
   * Total frames in the episode (from EpisodeTiming.totalFrames).
   * Used to compute the optimal framesPerLambda for this job — short episodes
   * use fewer workers; long episodes are capped at MAX_CONCURRENT_LAMBDAS.
   */
  totalFrames: number;
}

export interface RenderHandle {
  renderId: string;
  bucketName: string;
}

export interface RenderStatus {
  done: boolean;
  progress: number; // 0-1
  outputUrl: string | null;
  errorMessage: string | null;
}

/**
 * Starts an async Lambda render.
 * Returns immediately — render continues on AWS.
 */
export async function startRender(
  opts: StartRenderOptions
): Promise<RenderHandle> {
  const serveUrl = getServeUrl();

  let result: RenderMediaOnLambdaOutput;
  try {
    result = await renderMediaOnLambda({
      region: REMOTION_REGION,
      functionName: FUNCTION_NAME,
      serveUrl,
      composition: opts.compositionId,
      inputProps: opts.inputProps,
      codec: RENDER_CODEC,
      imageFormat: "jpeg",
      jpegQuality: FRAME_JPEG_QUALITY,
      framesPerLambda: computeFramesPerLambda(opts.totalFrames),
      maxRetries: 1,
      // Files are publicly readable for download links. Lock down with signed
      // URLs if your content is sensitive.
      privacy: "public",
      deleteAfter: S3_DELETE_AFTER,
      downloadBehavior: {
        type: "download",
        fileName: `episode-${opts.episodeId}.mp4`,
      },
    });
  } catch (err) {
    // Surface a clean error with the original cause for structured logging.
    throw new Error(
      `[Remotion] Failed to start Lambda render: ${(err as Error).message}`,
      { cause: err }
    );
  }

  return {
    renderId: result.renderId,
    bucketName: result.bucketName,
  };
}

/**
 * Polls a single status check for an in-progress render.
 * Call this from your status API route — do NOT loop here.
 */
export async function getRenderStatus(
  handle: RenderHandle
): Promise<RenderStatus> {
  const progress = await getRenderProgress({
    renderId: handle.renderId,
    bucketName: handle.bucketName,
    functionName: FUNCTION_NAME,
    region: REMOTION_REGION,
  });

  if (progress.fatalErrorEncountered) {
    return {
      done: true,
      progress: 0,
      outputUrl: null,
      errorMessage: progress.errors[0]?.message ?? "Unknown render error",
    };
  }

  if (progress.done) {
    if (!progress.outputFile) {
      return {
        done: true,
        progress: 1,
        outputUrl: null,
        errorMessage: "Render completed but no output URL was returned",
      };
    }
    return {
      done: true,
      progress: 1,
      outputUrl: progress.outputFile,
      errorMessage: null,
    };
  }

  return {
    done: false,
    // overallProgress is 0-1; clamp to [0, 0.99] so UI never shows 100% prematurely
    progress: Math.min(progress.overallProgress ?? 0, 0.99),
    outputUrl: null,
    errorMessage: null,
  };
}
