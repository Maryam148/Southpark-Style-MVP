export const VOICE_MAP: Record<string, string> = {
    eric: "pNInz6obpgDQGcFmaJgB", // Adam
    stan: "pNInz6obpgDQGcFmaJgB",
    kyle: "pNInz6obpgDQGcFmaJgB",
    kenny: "pNInz6obpgDQGcFmaJgB",
    butters: "pNInz6obpgDQGcFmaJgB",
    narrator: "pNInz6obpgDQGcFmaJgB",
};

export const DEFAULT_VOICE_ID = "pNInz6obpgDQGcFmaJgB";

/**
 * Synthesize speech using ElevenLabs API
 * Returns an ArrayBuffer of the audio data
 */
export async function synthesizeSpeech(text: string, voiceId: string): Promise<Buffer> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
        throw new Error("ELEVENLABS_API_KEY is missing in environment variables");
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
        },
        body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
                stability: 0.85,
                similarity_boost: 0.5,
                speed: 0.75,
            },
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${err}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
