import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";
import { synthesizeSpeech } from "@/lib/tts";

/**
 * POST /api/admin/test-audio-upload
 * Runs the full TTS → Supabase Storage → public URL pipeline on a tiny test
 * clip and returns a detailed diagnostic so we can see exactly where it fails.
 */
export async function POST(req: NextRequest) {
    const secret = req.headers.get("x-admin-secret");
    if (!secret || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results: Record<string, unknown> = {};

    // 1. Check env vars
    results.hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    results.hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    results.hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    results.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "MISSING";

    // 2. Generate a tiny TTS clip
    try {
        const buffer = await synthesizeSpeech("Audio test.", "onyx");
        results.ttsOk = true;
        results.ttsBytes = buffer.length;
    } catch (e) {
        results.ttsOk = false;
        results.ttsError = String(e);
        return NextResponse.json({ step: "tts", results });
    }

    const admin = createAdminClient();

    // 3. Ensure bucket exists and is public
    const { error: createErr } = await admin.storage.createBucket("audio", { public: true });
    results.bucketCreate = createErr?.message ?? "ok";

    const { error: updateErr } = await admin.storage.updateBucket("audio", { public: true });
    results.bucketUpdate = updateErr?.message ?? "ok";

    const { data: bucketData } = await admin.storage.getBucket("audio");
    results.bucketPublic = bucketData?.public ?? "unknown";

    // 4. Upload the test clip
    const testKey = `tts/admin-test/test-${Date.now()}.mp3`;
    const buffer = Buffer.from(""); // dummy — re-gen below
    let uploadedBuffer: Buffer;
    try {
        uploadedBuffer = await synthesizeSpeech("Audio test.", "onyx");
    } catch (e) {
        results.ttsError2 = String(e);
        return NextResponse.json({ step: "tts2", results });
    }

    const { error: uploadError } = await admin.storage
        .from("audio")
        .upload(testKey, uploadedBuffer, { contentType: "audio/mpeg", upsert: true });

    results.uploadError = uploadError?.message ?? null;
    results.uploadOk = !uploadError;

    if (uploadError) {
        return NextResponse.json({ step: "upload", results });
    }

    // 5. Get public URL and verify it's fetchable
    const { data: urlData } = admin.storage.from("audio").getPublicUrl(testKey);
    results.publicUrl = urlData.publicUrl;

    try {
        const fetchRes = await fetch(urlData.publicUrl, { method: "HEAD" });
        results.urlStatus = fetchRes.status;
        results.urlOk = fetchRes.ok;
        results.urlContentType = fetchRes.headers.get("content-type");
    } catch (e) {
        results.urlFetchError = String(e);
    }

    // 6. Clean up test file
    await admin.storage.from("audio").remove([testKey]).catch(() => { });

    return NextResponse.json({ success: results.uploadOk && results.urlOk, results });
}
