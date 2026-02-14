/* ──────────────────────────────────────────────────────────
   AnimationEngine — Shared Types
   ────────────────────────────────────────────────────────── */

export interface DialogueLine {
    line: string;
    mouthShape: string;
    audio?: string; // URL to the synthesized speech
}

export interface CharacterAssets {
    body: string;
    head: string;
    eyes: string;
    mouths: Record<string, string>;
}

export interface SceneCharacter {
    name: string;
    position: "left" | "center" | "right" | "front" | "back";
    assets: CharacterAssets;
    dialogue: DialogueLine[];
}

export interface SceneProp {
    name: string;
    text?: string;
    animation?: string;
}

export interface SceneData {
    background: string;
    characters: SceneCharacter[];
    props: SceneProp[];
}
