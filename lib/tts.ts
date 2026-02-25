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
export async function synthesizeSpeech(text: string, voiceId: string): Promise<Buffer> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is missing in environment variables");
    }

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
        const err = await response.text();
        throw new Error(`OpenAI TTS API error: ${response.status} - ${err}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
