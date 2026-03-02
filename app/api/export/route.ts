/**
 * POST /api/export
 *
 * Starts a Remotion Lambda render for a completed episode.
 * Returns immediately with an exportId — the client polls
 * GET /api/export/[exportId] for status and the download URL.
 *
 * Guards (in order):
 *   1. Auth required
 *   2. Episode must belong to the requesting user
 *   3. Episode must be in "completed" status (has playable data)
 *   4. Deduplication + concurrency cap: return existing export for this episode OR
 *      reject with 429 if the user already has MAX_CONCURRENT_RENDERS active renders.
 *      Both DB queries run in parallel to keep the fast path fast.
 *   5. Timing computation: derive frame-accurate timing from stored audio durations
 *   6. Absolute URL guard: reject if any dialogue line has a relative audio URL
 *      (relative URLs mean TTS upload failed at generate time — Lambda cannot fetch them)
 *   7. Payload size guard: reject before Lambda if inputProps would exceed 4 MB
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { startRender } from "@/lib/remotion/lambda-render";
import { computeEpisodeTiming } from "@/lib/remotion/computeTimings";
import type { SceneData } from "@/components/AnimationEngine/types";

// Remotion composition ID — must match the id registered in root.tsx.
const COMPOSITION_ID = process.env.REMOTION_COMPOSITION_ID ?? "Episode";

/** Maximum simultaneous Lambda renders per user. */
const MAX_CONCURRENT_RENDERS = 3;

export const maxDuration = 30; // Only starts the render — Lambda does the heavy lifting.

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { episode_id } = body as { episode_id?: string };

    if (!episode_id || typeof episode_id !== "string") {
      return NextResponse.json({ error: "episode_id is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Verify episode exists, belongs to user, and is ready to export.
    const { data: episode, error: epError } = await admin
      .from("episodes")
      .select("id, status, metadata")
      .eq("id", episode_id)
      .eq("user_id", user.id)
      .single();

    if (epError || !episode) {
      return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    if (episode.status !== "completed") {
      return NextResponse.json(
        { error: "Episode must be fully generated before exporting" },
        { status: 409 }
      );
    }

    // 2. Deduplication + concurrency cap — run both DB reads in parallel.
    //    dedup:  return this episode's existing render if in-flight or done.
    //    count:  reject with 429 if the user is already at MAX_CONCURRENT_RENDERS.
    const [{ data: existing }, { count: activeCount }] = await Promise.all([
      admin
        .from("exports")
        .select("id, status, output_url")
        .eq("episode_id", episode_id)
        .eq("user_id", user.id)
        .in("status", ["rendering", "completed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("exports")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "rendering"),
    ]);

    if (existing) {
      return NextResponse.json({
        exportId: existing.id,
        status: existing.status,
        outputUrl: existing.output_url ?? null,
      });
    }

    if ((activeCount ?? 0) >= MAX_CONCURRENT_RENDERS) {
      return NextResponse.json(
        {
          error:
            `You already have ${activeCount} render(s) in progress. ` +
            "Please wait for them to complete before starting a new export.",
        },
        { status: 429 }
      );
    }

    // 3. Extract scenes from the stored playable episode.
    const playable = (episode.metadata as Record<string, unknown>)?.playable as
      | { episodeTitle?: string; scenes: SceneData[] }
      | undefined;

    if (!playable?.scenes || !Array.isArray(playable.scenes) || playable.scenes.length === 0) {
      return NextResponse.json(
        { error: "Episode has no playable data. Re-generate the episode first." },
        { status: 422 }
      );
    }

    // 4. Compute frame-accurate timing from pre-stored audio durations.
    // Pure Node.js — no Web Audio API. Throws if iteration order assertion fails.
    let timing: ReturnType<typeof computeEpisodeTiming>;
    try {
      timing = computeEpisodeTiming(playable.scenes);
    } catch (err) {
      console.error("[Export] computeEpisodeTiming failed:", err);
      return NextResponse.json(
        { error: "Failed to compute episode timing. Check server logs." },
        { status: 500 }
      );
    }

    // 5. Absolute URL guard — reject before Lambda if any audio URL is relative.
    // Relative URLs come from TTS upload failures at generate time (/api/tts?...).
    // Lambda has no local server and cannot resolve them; the lines would be silent.
    const badLines = timing.dialogueTimings.filter(
      (t) => t.audioUrl !== "" && !t.audioUrl.startsWith("https://")
    );
    if (badLines.length > 0) {
      console.error(
        `[Export] ${badLines.length} relative audio URL(s) found — episode must be re-generated.`,
        badLines.map((t) => ({ scene: t.sceneIdx, line: t.text.slice(0, 40) }))
      );
      return NextResponse.json(
        {
          error:
            `${badLines.length} dialogue line(s) have missing audio. ` +
            "Re-generate the episode to re-synthesize all TTS audio, then try exporting again.",
        },
        { status: 422 }
      );
    }

    // 6. Payload size guard — Lambda synchronous invocation limit is 6 MB.
    const inputProps = { scenes: playable.scenes, timing };
    const payloadBytes = Buffer.byteLength(JSON.stringify(inputProps), "utf8");
    console.log(
      `[Export] episode=${episode_id} frames=${timing.totalFrames} ` +
      `lines=${timing.dialogueTimings.length} payload=${Math.round(payloadBytes / 1024)}KB`
    );
    if (payloadBytes > 4_194_304) {
      return NextResponse.json(
        {
          error:
            `Episode data is too large to export (${Math.round(payloadBytes / 1024)} KB). ` +
            "Contact support.",
        },
        { status: 413 }
      );
    }

    // 7. Insert the export record before starting Lambda so we always have a row to
    //    update on success or failure — no zombie records on Lambda startup errors.
    const { data: exportRow, error: insertError } = await admin
      .from("exports")
      .insert({ episode_id, user_id: user.id, status: "rendering" })
      .select("id")
      .single();

    if (insertError || !exportRow) {
      console.error("[Export] Failed to create export record:", insertError);
      return NextResponse.json({ error: "Failed to create export record" }, { status: 500 });
    }

    // 8. Start the Lambda render (non-blocking — returns in < 500 ms).
    let renderHandle: { renderId: string; bucketName: string };
    try {
      renderHandle = await startRender({
        compositionId: COMPOSITION_ID,
        inputProps,
        episodeId: episode_id,
        totalFrames: timing.totalFrames,
      });
    } catch (err) {
      await admin
        .from("exports")
        .update({ status: "failed", error_msg: (err as Error).message })
        .eq("id", exportRow.id);

      console.error("[Export] Lambda render start failed:", err);
      return NextResponse.json(
        { error: "Failed to start render. Check server logs." },
        { status: 502 }
      );
    }

    // 9. Persist the Lambda handle so the status endpoint can poll progress.
    await admin
      .from("exports")
      .update({
        render_id: renderHandle.renderId,
        bucket_name: renderHandle.bucketName,
      })
      .eq("id", exportRow.id);

    return NextResponse.json(
      { exportId: exportRow.id, status: "rendering", outputUrl: null },
      { status: 202 }
    );
  } catch (err) {
    console.error("[Export] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
