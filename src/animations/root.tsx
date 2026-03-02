import { registerRoot, Composition } from "remotion";
import { RemotionRoot } from "./LoginWorkflow/LoginWorkflow";
import {
    EpisodeComposition,
    episodeCalculateMetadata,
} from "./EpisodeComposition";
import type { EpisodeInputProps } from "./EpisodeComposition";

const EMPTY_TIMING: EpisodeInputProps["timing"] = {
    totalFrames: 30,
    dialogueTimings: [],
    sceneStartFrames: [],
};

function AllCompositions() {
    return (
        <>
            {/* Original LoginWorkflow demo composition */}
            <RemotionRoot />

            {/* Episode composition — used by Lambda export.
                durationInFrames is overridden per-episode by episodeCalculateMetadata.
                defaultProps is a no-op placeholder; real inputProps come from startRender. */}
            <Composition
                id="Episode"
                component={EpisodeComposition}
                durationInFrames={30}
                fps={30}
                width={1920}
                height={1080}
                calculateMetadata={episodeCalculateMetadata}
                defaultProps={{ scenes: [], timing: EMPTY_TIMING } as EpisodeInputProps}
            />
        </>
    );
}

registerRoot(AllCompositions);
