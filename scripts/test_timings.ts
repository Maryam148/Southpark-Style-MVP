import fs from "fs";
import { computeEpisodeTiming } from "../lib/remotion/computeTimings";

const playable = JSON.parse(fs.readFileSync("/tmp/latest_episode_playable.json", "utf-8"));
const timing = computeEpisodeTiming(playable.scenes);

console.log("Total frames:", timing.totalFrames);
console.log("Scene start frames:", timing.sceneStartFrames);
console.log("Dialogue timings:");
timing.dialogueTimings.forEach((t, i) => {
    console.log(`[${i}] Scene ${t.sceneIdx} | Frame ${t.startFrame} -> ${t.startFrame + t.durationFrames} | ${t.text.slice(0, 30)}... | ${t.audioUrl ? "HAS_AUDIO" : "NO_AUDIO"}`);
});
