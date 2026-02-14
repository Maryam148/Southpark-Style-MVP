/* ──────────────────────────────────────────────────────────
   SkunkStudio — Shared TypeScript Types
   ────────────────────────────────────────────────────────── */

// ─── Enums ──────────────────────────────────────────────
export type EpisodeStatus = "draft" | "processing" | "completed" | "failed";
export type AssetType = "character" | "background" | "prop" | "audio" | "script";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
export type Plan = "free" | "pro" | "enterprise";

// ─── Models ─────────────────────────────────────────────
export interface User {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    credits: number;
    plan: Plan;
    is_paid: boolean;
    stripe_customer_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface Episode {
    id: string;
    user_id: string;
    title: string;
    script: string | null;
    video_url: string | null;
    thumbnail_url: string | null;
    status: EpisodeStatus;
    duration_sec: number | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface Asset {
    id: string;
    user_id: string;
    name: string;
    asset_type: AssetType;
    cloudinary_id: string;
    url: string;
    size_bytes: number | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface Payment {
    id: string;
    user_id: string;
    stripe_session_id: string;
    stripe_customer_id: string | null;
    amount_cents: number;
    currency: string;
    status: PaymentStatus;
    credits_granted: number;
    metadata: Record<string, unknown>;
    created_at: string;
}

// ─── Script JSON Schema ─────────────────────────────────
export interface ScriptDialogue {
    line: string;
    mouthShape: string;
}

export interface ScriptCharacter {
    name: string;
    position: string;
    dialogue: ScriptDialogue[];
}

export interface ScriptScene {
    sceneId: string;
    sceneName: string;
    background: string;
    characters: ScriptCharacter[];
    props?: string[];
}

export interface ScriptJSON {
    episodeTitle: string;
    scenes: ScriptScene[];
}

