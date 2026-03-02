/**
 * POST /api/export/local
 *
 * Local server-side Remotion render using the CLI.
 * Spawns `npx remotion render` as a child process to avoid webpack issues
 * with native @remotion/renderer bindings in Next.js.
 *
 * Renders faster than real-time because Remotion controls the frame clock.
 * No AWS Lambda or credit card needed.
 */

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { computeEpisodeTiming } from "../../../../lib/remotion/computeTimings";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { Readable } from "node:stream";

export const maxDuration = 300; // 5 min timeout

function keepTail(prev: string, nextChunk: string, maxChars: number) {
    const combined = prev + nextChunk;
    if (combined.length <= maxChars) return combined;
    return combined.slice(combined.length - maxChars);
}

function runCommand(cmd: string, args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
        const proc = spawn(cmd, args, { cwd, env: { ...process.env, FORCE_COLOR: "0" } });
        let stdout = "";
        let stderr = "";
        // Keep only the tail to avoid huge memory growth on long renders.
        // Still stream to server logs for debugging.
        proc.stdout.on("data", (d) => {
            const s = d.toString();
            process.stdout.write(s);
            stdout = keepTail(stdout, s, 50_000);
        });
        proc.stderr.on("data", (d) => {
            const s = d.toString();
            process.stderr.write(s);
            stderr = keepTail(stderr, s, 50_000);
        });
        proc.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
        proc.on("error", (err) => resolve({ code: 1, stdout, stderr: err.message }));
    });
}

export async function POST(req: NextRequest) {
    try {
        const { episode_id } = await req.json();
        if (!episode_id) {
            return NextResponse.json({ error: "Missing episode_id" }, { status: 400 });
        }

        // Fetch episode data
        const supabase = await createServerSupabaseClient();
        const { data: episode, error: fetchErr } = await supabase
            .from("episodes")
            .select("*")
            .eq("id", episode_id)
            .single();

        if (fetchErr || !episode) {
            return NextResponse.json({ error: "Episode not found" }, { status: 404 });
        }

        // Extract scenes — match the same structure used in /api/export (Lambda) route
        const meta = episode.metadata as Record<string, unknown> | null;
        const playable = meta?.playable as { scenes?: unknown[] } | undefined;
        const scenes = playable?.scenes ?? (episode as Record<string, unknown>).scene_data ?? [];
        if (!Array.isArray(scenes) || scenes.length === 0) {
            return NextResponse.json({ error: "No scenes in episode" }, { status: 400 });
        }

        // Compute frame-accurate timings
        const timing = computeEpisodeTiming(scenes);

        // Write input props to a temp file (Remotion CLI reads them via --props)
        const propsPath = path.join(os.tmpdir(), `remotion-props-${episode_id}-${Date.now()}.json`);
        const outputPath = path.join(os.tmpdir(), `episode-${episode_id}-${Date.now()}.mp4`);

        fs.writeFileSync(propsPath, JSON.stringify({ scenes, timing }));

        const projectDir = process.cwd();
        const entryPoint = path.resolve(projectDir, "src/animations/root.tsx");

        // Concurrency: use up to 4 workers, but never more than (CPU cores - 1).
        // This keeps the machine responsive while still rendering significantly
        // faster than real-time on multi-core laptops.
        const cpuCount = os.cpus().length || 1;
        const maxWorkers = Math.min(4, Math.max(1, cpuCount - 1));

        // Run: npx remotion render <entry> Episode <output> --codec=h264 --props=<file>
        const result = await runCommand("npx", [
            "remotion", "render",
            entryPoint,
            "Episode",
            outputPath,
            "--codec=h264",
            `--props=${propsPath}`,
            // Align CLI timeout with the Next.js route maxDuration (5 minutes).
            "--timeout=300000",
            `--concurrency=${String(maxWorkers)}`,
            // Avoid massive per-frame logs (can slow down renders and blow memory).
            "--log=warn",
        ], projectDir);

        // Clean up props file
        try { fs.unlinkSync(propsPath); } catch { /* ignore */ }

        if (result.code !== 0) {
            console.error("[LocalRender] CLI failed:", result.stderr);
            return NextResponse.json(
                { error: `Render failed: ${result.stderr.slice(-500)}` },
                { status: 500 },
            );
        }

        // Check output file exists
        if (!fs.existsSync(outputPath)) {
            return NextResponse.json({ error: "Render produced no output file" }, { status: 500 });
        }

        const stat = fs.statSync(outputPath);

        // Sanitize title to ASCII for Content-Disposition header
        const safeTitle = (episode.title || "episode")
            .replace(/[^\x20-\x7E]/g, "_") // replace non-ASCII with underscore
            .replace(/[/\\?%*:|"<>]/g, "_") // replace filesystem-unsafe chars
            .trim() || "episode";

        // Stream the file to avoid loading huge MP4s into memory.
        const nodeStream = fs.createReadStream(outputPath);
        nodeStream.on("close", () => {
            try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
        });

        // @ts-expect-error Readable.toWeb exists in Node 18+
        const webStream: ReadableStream = Readable.toWeb(nodeStream);

        return new NextResponse(webStream, {
            status: 200,
            headers: {
                "Content-Type": "video/mp4",
                "Content-Disposition": `attachment; filename="${safeTitle}.mp4"`,
                "Content-Length": stat.size.toString(),
            },
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[LocalRender] Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
