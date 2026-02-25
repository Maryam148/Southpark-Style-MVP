import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text");
    const voice = searchParams.get("voice") || "onyx";

    if (!text) {
        return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
    }

    try {
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ model: "tts-1", input: text, voice }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("[TTS] OpenAI error:", response.status, err);
            return NextResponse.json({ error: err }, { status: response.status });
        }

        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800",
            },
        });
    } catch (err) {
        console.error("[TTS] Unexpected error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
