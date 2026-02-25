"use client";

import { Player } from "@remotion/player";
import { LoginWorkflow } from "@/src/animations/LoginWorkflow/LoginWorkflow";

export function WorkflowPlayer() {
    return (
        <Player
            component={LoginWorkflow}
            durationInFrames={600}
            fps={30}
            compositionWidth={1920}
            compositionHeight={1080}
            style={{
                width: "100%",
                height: "100%",
            }}
            autoPlay
            loop
            controls={false}
            clickToPlay={false}
            spaceKeyToPlayOrPause={false}
        />
    );
}
