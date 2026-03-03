import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

/**
 * POST /api/admin/check-episode
 *
 * Inspects a specific episode's metadata to verify whether audio URLs
 * are present and accessible. Use this to determine whether the audio
 * issue is in generation (no URLs) or playback (URLs exist but won't play).
 *
 * Body: { episode_id: string }
 * Protected by x-admin-secret header.
 */
export async function POST(req: NextRequest) {
    const secret = req.headers.get("x-admin-secret");
    if (!secret || secret !== process.env.ADMIN_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { episode_id } = await req.json();
    if (!episode_id) {
        return NextResponse.json({ error: "episode_id is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: ep, error } = await admin
        .from("episodes")
        .select("title, status, metadata")
        .eq("id", episode_id)
        .single();

    if (error || !ep) {
        return NextResponse.json({ error: "Episode not found" }, { status: 404 });
    }

    const meta = ep.metadata as Record<string, unknown> | null;
    const playable = meta?.playable as {
        scenes: {
            characters: {
                name?: string;
                dialogue: { line?: string; audio?: string; audioDurationSec?: number }[];
            }[];
        }[];
    } | null;

    if (!playable) {
        return NextResponse.json({
            title: ep.title,
            status: ep.status,
            playable: false,
            message: "Episode has no playable data — not generated yet",
        });
    }

    // Collect all real dialogue lines and their audio status
    const lines: {
        scene: number;
        char: string;
        line: string;
        hasAudio: boolean;
        hasSupabaseUrl: boolean;
        audioUrl?: string;
        durationSec?: number;
    }[] = [];

    for (let si = 0; si < playable.scenes.length; si++) {
        const scene = playable.scenes[si];
        for (const char of scene.characters) {
            for (const dl of char.dialogue) {
                if (!dl.line || dl.line.trim() === "" || /^\[pause\]$/i.test(dl.line.trim())) continue;
                lines.push({
                    scene: si + 1,
                    char: char.name ?? "unknown",
                    line: dl.line.substring(0, 60),
                    hasAudio: !!dl.audio,
                    hasSupabaseUrl: !!dl.audio && dl.audio.includes("supabase"),
                    audioUrl: dl.audio,
                    durationSec: dl.audioDurationSec,
                });
            }
        }
    }

    const totalLines = lines.length;
    const linesWithAudio = lines.filter((l) => l.hasAudio).length;
    const linesWithSupabaseUrl = lines.filter((l) => l.hasSupabaseUrl).length;

    // Spot-check the first Supabase audio URL to see if it's accessible
    let urlCheck: { url: string; status: number; ok: boolean; contentType: string | null } | null = null;
    const firstAudioLine = lines.find((l) => l.hasSupabaseUrl);
    if (firstAudioLine?.audioUrl) {
        try {
            const r = await fetch(firstAudioLine.audioUrl, { method: "HEAD" });
            urlCheck = {
                url: firstAudioLine.audioUrl,
                status: r.status,
                ok: r.ok,
                contentType: r.headers.get("content-type"),
            };
        } catch (e) {
            urlCheck = { url: firstAudioLine.audioUrl, status: 0, ok: false, contentType: String(e) };
        }
    }

    return NextResponse.json({
        title: ep.title,
        status: ep.status,
        sceneCount: playable.scenes.length,
        totalDialogueLines: totalLines,
        linesWithAudio,
        linesWithSupabaseUrl,
        linesWithoutAudio: totalLines - linesWithAudio,
        audioPercent: totalLines > 0 ? Math.round((linesWithAudio / totalLines) * 100) : 0,
        // VERDICT
        verdict: linesWithSupabaseUrl === 0
            ? "NO_AUDIO_IN_METADATA — generation failed silently"
            : linesWithSupabaseUrl < totalLines
                ? "PARTIAL_AUDIO — some lines missing (TTS/upload failed for those lines)"
                : urlCheck?.ok
                    ? "AUDIO_PRESENT_AND_ACCESSIBLE — playback issue (browser-side bug)"
                    : "AUDIO_PRESENT_BUT_INACCESSIBLE — URL returns " + (urlCheck?.status ?? "unknown"),
        urlCheck,
        // First 20 lines for manual inspection
        lines: lines.slice(0, 20),
    });
}
