/**
 * GET /api/export/[exportId]
 *
 * Checks the status of an in-progress or completed Lambda render.
 * The client polls this endpoint (e.g. every 3s) until done === true.
 *
 * On completion: saves the output URL to the exports table and returns it.
 * On failure: marks the row as failed and returns errorMessage.
 *
 * Response shape:
 *   { exportId, status, progress, outputUrl, errorMessage }
 *
 * status: "rendering" | "completed" | "failed"
 * progress: 0–1 (only meaningful when status === "rendering")
 * outputUrl: public S3 URL (only set when status === "completed")
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { getRenderStatus } from "@/lib/remotion/lambda-render";

export const maxDuration = 15; // Status check is fast — just a Lambda API call.

export async function GET(
  req: NextRequest,
  { params }: { params: { exportId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { exportId } = params;
    if (!exportId) {
      return NextResponse.json({ error: "exportId is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch the export row — enforce ownership via user_id.
    const { data: exportRow, error: fetchError } = await admin
      .from("exports")
      .select("id, status, render_id, bucket_name, output_url, error_msg")
      .eq("id", exportId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !exportRow) {
      return NextResponse.json({ error: "Export not found" }, { status: 404 });
    }

    // If already in a terminal state, return the cached result immediately —
    // no need to call Lambda again.
    if (exportRow.status === "completed") {
      return NextResponse.json({
        exportId,
        status: "completed",
        progress: 1,
        outputUrl: exportRow.output_url,
        errorMessage: null,
      });
    }

    if (exportRow.status === "failed") {
      return NextResponse.json({
        exportId,
        status: "failed",
        progress: 0,
        outputUrl: null,
        errorMessage: exportRow.error_msg ?? "Render failed",
      });
    }

    // Render is in-flight — ask Lambda for current progress.
    if (!exportRow.render_id || !exportRow.bucket_name) {
      // Row exists but Lambda handle wasn't saved yet (race between insert & update).
      // Return a safe "still starting" response.
      return NextResponse.json({
        exportId,
        status: "rendering",
        progress: 0,
        outputUrl: null,
        errorMessage: null,
      });
    }

    let renderStatus: Awaited<ReturnType<typeof getRenderStatus>>;
    try {
      renderStatus = await getRenderStatus({
        renderId: exportRow.render_id,
        bucketName: exportRow.bucket_name,
      });
    } catch (err) {
      console.error("[Export/Status] getRenderStatus failed:", err);
      // Don't mark as failed — this could be a transient Lambda API error.
      return NextResponse.json(
        { error: "Could not reach render service. Retry shortly." },
        { status: 503 }
      );
    }

    // Render finished — update the DB row and return the result.
    if (renderStatus.done) {
      const newStatus = renderStatus.outputUrl ? "completed" : "failed";

      await admin
        .from("exports")
        .update({
          status: newStatus,
          output_url: renderStatus.outputUrl ?? null,
          error_msg: renderStatus.errorMessage ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", exportId);

      return NextResponse.json({
        exportId,
        status: newStatus,
        progress: newStatus === "completed" ? 1 : 0,
        outputUrl: renderStatus.outputUrl,
        errorMessage: renderStatus.errorMessage,
      });
    }

    // Still rendering — return progress.
    return NextResponse.json({
      exportId,
      status: "rendering",
      progress: renderStatus.progress,
      outputUrl: null,
      errorMessage: null,
    });
  } catch (err) {
    console.error("[Export/Status] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
