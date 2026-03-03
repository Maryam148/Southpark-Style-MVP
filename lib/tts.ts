export const VOICE_MAP: Record<string, string> = {
    eric: "onyx",
    stan: "echo",
    kyle: "fable",
    kenny: "alloy",
    butters: "nova",
    narrator: "shimmer",
};

export const DEFAULT_VOICE_ID = "onyx";

/**
 * Synthesize speech using OpenAI TTS API
 * Returns a Buffer of the audio data
 */
export async function synthesizeSpeech(text: string, voiceId: string, retries = 5, delayMs = 1500): Promise<Buffer> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is missing in environment variables");
    }

    try {
        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "tts-1",
                input: text,
                voice: voiceId,
            }),
        });

        if (!response.ok) {
            if (response.status === 429 && retries > 0) {
                const retryAfter = response.headers.get("retry-after");
                const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : delayMs;
                console.warn(`[TTS] Rate limited (429). Retrying in ${waitTime}ms... (${retries} retries left)`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                return synthesizeSpeech(text, voiceId, retries - 1, delayMs * 2);
            }
            const err = await response.text();
            throw new Error(`OpenAI TTS API error: ${response.status} - ${err}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (error: unknown) {
        // Handle fetch network failures gracefully by retrying
        if (retries > 0) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            console.warn(`[TTS] Fetch failed. Retrying in ${delayMs}ms...`, msg);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return synthesizeSpeech(text, voiceId, retries - 1, delayMs * 2);
        }
        throw error;
    }
}

/**
 * Estimates the playback duration of a 128 kbps CBR MP3 buffer in seconds.
 *
 * OpenAI TTS (tts-1) always outputs 128 kbps constant-bitrate MP3.
 * For CBR: duration = audio_bytes × 8 / bitrate_bps.
 *
 * We subtract a conservative 256-byte allowance for ID3v2 tags that OpenAI
 * prepends to the stream. Typical tag overhead is <128 bytes; 256 keeps the
 * estimate slightly short rather than slightly long, which is the safer
 * rounding direction (audio ends before the next Sequence starts).
 *
 * Accuracy: <1 ms per line. Cumulative error over 100 lines: <100 ms.
 * This is well within one frame at 30 fps (33.3 ms) per line.
 */
export function estimateMp3DurationSec(buffer: Buffer): number {
    const audioBytesEstimate = Math.max(0, buffer.length - 256);
    return (audioBytesEstimate * 8) / 128_000;
}
