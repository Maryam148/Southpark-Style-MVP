/**
 * Remotion Node.js render helpers (self-hosted fallback).
 *
 * USE THIS ONLY on a dedicated long-running server (Fly.io, Railway, EC2).
 * NOT suitable for Vercel serverless — renders take 2-10 min and Vercel
 * will terminate the function.
 *
 * For true SaaS scale, use lambda-render.ts instead.
 *
 * REQUIRED packages (in addition to remotion):
 *   @remotion/bundler @remotion/renderer @remotion/compositor-linux-x64-gnu
 *
 * REQUIRED system deps on the render server:
 *   - No system FFmpeg needed — @remotion/compositor-* ships its own binary.
 *   - Chromium is downloaded automatically on first call to ensureBrowser().
 *   - Adequate disk space for temp frames (~50-200 MB per render).
 */

import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

// Dynamic imports so this module doesn't break builds on platforms that
// can't install the compositor binary (e.g. macOS CI building for Linux).
async function getBundler() {
  const { bundle } = await import("@remotion/bundler");
  return bundle;
}

async function getRenderer() {
  const { renderMedia, selectComposition, ensureBrowser } = await import(
    "@remotion/renderer"
  );
  return { renderMedia, selectComposition, ensureBrowser };
}

import {
  RENDER_CODEC,
  FRAME_JPEG_QUALITY,
} from "./config";

/**
 * Webpack bundle is expensive (5-30s). Cache the promise across warm
 * Node.js invocations so only the first render pays that cost.
 *
 * NOTE: If you change the composition source, restart the server — the
 * bundle will NOT hot-reload in production.
 */
const bundleCache = new Map<string, Promise<string>>();

function getOrCreateBundle(entryPoint: string): Promise<string> {
  if (!bundleCache.has(entryPoint)) {
    const bundlePromise = getBundler()
      .then((bundle) =>
        bundle({
          entryPoint: path.resolve(entryPoint),
        })
      )
      .catch((err) => {
        bundleCache.delete(entryPoint); // allow retry on failure
        throw err;
      });

    bundleCache.set(entryPoint, bundlePromise);
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return bundleCache.get(entryPoint)!;
}

export interface LocalRenderOptions {
  /** Absolute or project-relative path to your Remotion entry point. */
  entryPoint: string;
  compositionId: string;
  inputProps: Record<string, unknown>;
  /** If omitted, writes to os.tmpdir(). */
  outputPath?: string;
  onProgress?: (progressFraction: number) => void;
}

/**
 * Renders a composition synchronously on the local Node.js process.
 * Returns the path of the rendered .mp4 file.
 *
 * After uploading the file to storage, call cleanupTempFile() to free disk.
 */
export async function renderEpisodeLocally(
  opts: LocalRenderOptions
): Promise<string> {
  const { renderMedia, selectComposition, ensureBrowser } = await getRenderer();

  // Downloads Chromium if not already present. Safe to call repeatedly —
  // it checks for the binary before downloading.
  await ensureBrowser();

  const bundled = await getOrCreateBundle(opts.entryPoint);

  const composition = await selectComposition({
    serveUrl: bundled,
    id: opts.compositionId,
    inputProps: opts.inputProps,
  });

  const outFile =
    opts.outputPath ??
    path.join(
      os.tmpdir(),
      `remotion-${Date.now()}-${opts.compositionId}.mp4`
    );

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: RENDER_CODEC,
    outputLocation: outFile,
    inputProps: opts.inputProps,
    imageFormat: "jpeg",
    jpegQuality: FRAME_JPEG_QUALITY,
    // Use n-1 cores. On a 2-vCPU server this = 1, which is conservative but
    // stable. Increase if you have >= 4 vCPUs and adequate RAM (2GB per thread).
    concurrency: Math.max(1, os.cpus().length - 1),
    onProgress: ({ progress }: { progress: number }) => {
      opts.onProgress?.(progress);
    },
  });

  return outFile;
}

/**
 * Reads the rendered file into a Buffer, then deletes it.
 * Call this after uploading to storage so temp disk is freed.
 */
export async function readAndCleanup(filePath: string): Promise<Buffer> {
  const buf = await fs.readFile(filePath);
  await fs.unlink(filePath).catch((err) =>
    console.warn(`[Remotion] Could not delete temp file ${filePath}:`, err)
  );
  return buf;
}
