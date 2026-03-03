import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

/**
 * POST /api/admin/fix-storage
 *
 * One-time utility that ensures the "audio" Supabase Storage bucket is
 * public so all existing TTS audio files are accessible to the browser.
 *
 * If the bucket was created without public:true (e.g. via the Supabase
 * dashboard with default settings), every audio URL returns 403 and the
 * player silently skips all lines — mouths stop moving, no sound.
 *
 * Protected by ADMIN_SECRET env var so it can't be called by anyone else.
 */
export async function POST(req: NextRequest) {
    const secret = req.headers.get("x-admin-secret");
    if (!secret || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const results: Record<string, string> = {};

    // 1. Create bucket if it doesn't exist
    const { error: createErr } = await admin.storage.createBucket("audio", { public: true });
    results.create = createErr ? createErr.message : "ok (or already exists)";

    // 2. Force-update bucket to public — this is the key fix for pre-existing buckets
    const { error: updateErr } = await admin.storage.updateBucket("audio", { public: true });
    results.update = updateErr ? updateErr.message : "ok";

    // 3. Verify by fetching bucket details
    const { data: bucket, error: getErr } = await admin.storage.getBucket("audio");
    results.bucketPublic = getErr ? `error: ${getErr.message}` : String(bucket?.public);

    return NextResponse.json({ success: !updateErr, results });
}
