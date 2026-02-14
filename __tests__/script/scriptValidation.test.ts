/**
 * Script JSON validation — unit tests
 *
 * validateScriptJSON is a local function inside upload-script/page.tsx.
 * We extract & re-implement the validation logic here to test it independently.
 */

interface ScriptDialogue {
    line: string;
    mouthShape: string;
}

interface ScriptCharacter {
    name: string;
    position: string;
    dialogue: ScriptDialogue[];
}

interface ScriptScene {
    sceneId: string;
    sceneName: string;
    background?: string;
    characters: ScriptCharacter[];
    props?: string[];
}

interface ScriptJSON {
    episodeTitle: string;
    scenes: ScriptScene[];
}

/** Re-implementation matching upload-script/page.tsx validation logic */
function validateScriptJSON(raw: string): {
    ok: boolean;
    data?: ScriptJSON;
    errors: string[];
} {
    const errors: string[] = [];

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { ok: false, errors: ["Invalid JSON — check your syntax."] };
    }

    const obj = parsed as Record<string, unknown>;

    if (!obj.episodeTitle || typeof obj.episodeTitle !== "string") {
        errors.push('"episodeTitle" (string) is required at the root.');
    }
    if (!Array.isArray(obj.scenes) || obj.scenes.length === 0) {
        errors.push('"scenes" must be a non-empty array.');
    } else {
        (obj.scenes as Record<string, unknown>[]).forEach((scene, i) => {
            if (!scene.sceneId) errors.push(`Scene ${i + 1}: missing "sceneId".`);
            if (!scene.sceneName)
                errors.push(`Scene ${i + 1}: missing "sceneName".`);
            // background is optional — placeholders handle missing values
            if (!Array.isArray(scene.characters))
                errors.push(`Scene ${i + 1}: "characters" must be an array.`);
            else {
                (scene.characters as Record<string, unknown>[]).forEach((char, j) => {
                    if (!char.name)
                        errors.push(
                            `Scene ${i + 1}, Character ${j + 1}: missing "name".`
                        );
                    if (!Array.isArray(char.dialogue))
                        errors.push(
                            `Scene ${i + 1}, Character ${j + 1}: "dialogue" must be an array.`
                        );
                });
            }
        });
    }

    if (errors.length > 0) return { ok: false, errors };
    return { ok: true, data: parsed as ScriptJSON, errors: [] };
}

/* ── Valid fixture ───────────────────────────────────────── */
const validScript: ScriptJSON = {
    episodeTitle: "Test Episode",
    scenes: [
        {
            sceneId: "s1",
            sceneName: "Opening",
            background: "school_hallway",
            characters: [
                {
                    name: "Jax",
                    position: "left",
                    dialogue: [
                        { line: "Hey!", mouthShape: "talking" },
                        { line: "What's up?", mouthShape: "talking" },
                    ],
                },
            ],
        },
    ],
};

describe("validateScriptJSON", () => {
    it("rejects empty input", () => {
        const result = validateScriptJSON("");
        expect(result.ok).toBe(false);
        expect(result.errors[0]).toMatch(/invalid json/i);
    });

    it("rejects non-JSON strings", () => {
        const result = validateScriptJSON("hello world");
        expect(result.ok).toBe(false);
    });

    it("rejects JSON missing episodeTitle", () => {
        const result = validateScriptJSON(
            JSON.stringify({ scenes: validScript.scenes })
        );
        expect(result.ok).toBe(false);
        expect(result.errors).toEqual(
            expect.arrayContaining([expect.stringMatching(/episodeTitle/)])
        );
    });

    it("rejects JSON missing scenes array", () => {
        const result = validateScriptJSON(
            JSON.stringify({ episodeTitle: "Test" })
        );
        expect(result.ok).toBe(false);
        expect(result.errors).toEqual(
            expect.arrayContaining([expect.stringMatching(/scenes/)])
        );
    });

    it("rejects scene missing sceneId", () => {
        const bad = {
            episodeTitle: "Test",
            scenes: [{ sceneName: "S1", characters: [] }],
        };
        const result = validateScriptJSON(JSON.stringify(bad));
        expect(result.ok).toBe(false);
        expect(result.errors).toEqual(
            expect.arrayContaining([expect.stringMatching(/sceneId/)])
        );
    });

    it("rejects scene missing sceneName", () => {
        const bad = {
            episodeTitle: "Test",
            scenes: [{ sceneId: "s1", characters: [] }],
        };
        const result = validateScriptJSON(JSON.stringify(bad));
        expect(result.ok).toBe(false);
        expect(result.errors).toEqual(
            expect.arrayContaining([expect.stringMatching(/sceneName/)])
        );
    });

    it("accepts scene where background is null (placeholder mode)", () => {
        const data = {
            episodeTitle: "Test",
            scenes: [
                {
                    sceneId: "s1",
                    sceneName: "S1",
                    background: null,
                    characters: [
                        { name: "Jax", position: "left", dialogue: [] },
                    ],
                },
            ],
        };
        const result = validateScriptJSON(JSON.stringify(data));
        expect(result.ok).toBe(true);
    });

    it("accepts scene where background is a string URL", () => {
        const data = {
            episodeTitle: "Test",
            scenes: [
                {
                    sceneId: "s1",
                    sceneName: "S1",
                    background: "https://example.com/bg.png",
                    characters: [
                        { name: "Jax", position: "left", dialogue: [] },
                    ],
                },
            ],
        };
        const result = validateScriptJSON(JSON.stringify(data));
        expect(result.ok).toBe(true);
    });

    it("rejects character missing name", () => {
        const bad = {
            episodeTitle: "Test",
            scenes: [
                {
                    sceneId: "s1",
                    sceneName: "S1",
                    characters: [{ position: "left", dialogue: [] }],
                },
            ],
        };
        const result = validateScriptJSON(JSON.stringify(bad));
        expect(result.ok).toBe(false);
        expect(result.errors).toEqual(
            expect.arrayContaining([expect.stringMatching(/name/i)])
        );
    });

    it("rejects character missing dialogue array", () => {
        const bad = {
            episodeTitle: "Test",
            scenes: [
                {
                    sceneId: "s1",
                    sceneName: "S1",
                    characters: [{ name: "Jax", position: "left" }],
                },
            ],
        };
        const result = validateScriptJSON(JSON.stringify(bad));
        expect(result.ok).toBe(false);
        expect(result.errors).toEqual(
            expect.arrayContaining([expect.stringMatching(/dialogue/i)])
        );
    });

    it("returns clean parsed episode on valid input", () => {
        const result = validateScriptJSON(JSON.stringify(validScript));
        expect(result.ok).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data!.episodeTitle).toBe("Test Episode");
        expect(result.data!.scenes).toHaveLength(1);
        expect(result.data!.scenes[0].characters[0].name).toBe("Jax");
    });
});
