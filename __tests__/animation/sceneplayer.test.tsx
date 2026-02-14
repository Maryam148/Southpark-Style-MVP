/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import ScenePlayer from "@/components/AnimationEngine/ScenePlayer";
import type { SceneData, SceneCharacter } from "@/components/AnimationEngine/types";

// Mock AnimationEngine so we control onSceneComplete
let capturedOnSceneComplete: (() => void) | undefined;

jest.mock("@/components/AnimationEngine/AnimationEngine", () => {
    return function MockAnimationEngine({
        sceneData,
        onSceneComplete,
    }: {
        sceneData: SceneData;
        onSceneComplete: () => void;
    }) {
        capturedOnSceneComplete = onSceneComplete;
        return (
            <div data-testid="animation-engine" data-scene={JSON.stringify(sceneData)}>
                <button onClick={onSceneComplete} data-testid="complete-scene">
                    Complete Scene
                </button>
            </div>
        );
    };
});

/* ── Fixtures ─────────────────────────────────────────── */
function makeScene(id: string): SceneData {
    return {
        background: `bg_${id}`,
        characters: [
            {
                name: `Char_${id}`,
                position: "center" as const,
                assets: {
                    body: null,
                    head: null,
                    eyes: null,
                    mouths: { neutral: null, talking: null },
                },
                dialogue: [{ line: `Line from ${id}`, mouthShape: "talking" }],
            },
        ],
        props: [],
    } as unknown as SceneData;
}

const fourScenes = [
    makeScene("s1"),
    makeScene("s2"),
    makeScene("s3"),
    makeScene("s4"),
];

describe("ScenePlayer", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        capturedOnSceneComplete = undefined;
    });

    it("does not crash if scenes array is empty", () => {
        expect(() => {
            render(<ScenePlayer scenes={[]} />);
        }).not.toThrow();
        expect(screen.getByText(/no scenes/i)).toBeInTheDocument();
    });

    it("renders first scene on mount", () => {
        render(<ScenePlayer scenes={fourScenes} />);
        const engine = screen.getByTestId("animation-engine");
        expect(engine).toBeInTheDocument();
    });

    it("shows scene progress indicator", () => {
        render(<ScenePlayer scenes={fourScenes} />);
        expect(screen.getByText(/scene 1/i)).toBeInTheDocument();
        expect(screen.getByText(/4/)).toBeInTheDocument();
    });

    it("advances to scene 2 when onSceneComplete fires", async () => {
        render(<ScenePlayer scenes={fourScenes} />);

        // Initially scene 1
        expect(screen.getByText(/scene 1/i)).toBeInTheDocument();

        // Fire scene complete
        act(() => {
            capturedOnSceneComplete?.();
        });

        await waitFor(() => {
            expect(screen.getByText(/scene 2/i)).toBeInTheDocument();
        });
    });

    it("calls onEpisodeComplete after last scene finishes", async () => {
        const onEpisodeComplete = jest.fn();
        render(
            <ScenePlayer scenes={[makeScene("only")]} onEpisodeComplete={onEpisodeComplete} />
        );

        act(() => {
            capturedOnSceneComplete?.();
        });

        await waitFor(() => {
            expect(onEpisodeComplete).toHaveBeenCalledTimes(1);
        });
    });

    it("shows 'Episode Complete' after all scenes finish", async () => {
        render(<ScenePlayer scenes={[makeScene("only")]} />);

        act(() => {
            capturedOnSceneComplete?.();
        });

        await waitFor(() => {
            expect(screen.getByText(/episode complete/i)).toBeInTheDocument();
        });
    });

    it("passes correct sceneData to AnimationEngine for scene 1", () => {
        render(<ScenePlayer scenes={fourScenes} />);
        const engine = screen.getByTestId("animation-engine");
        const sceneData = JSON.parse(engine.getAttribute("data-scene") || "{}");
        expect(sceneData.characters[0].name).toBe("Char_s1");
    });
});
