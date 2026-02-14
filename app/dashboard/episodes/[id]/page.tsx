import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import type { Episode } from "@/types";
import type { SceneData } from "@/components/AnimationEngine/types";
import EpisodePlayerClient from "./EpisodePlayerClient";

interface PlayableEpisode {
    episodeTitle: string;
    scenes: SceneData[];
}

export default async function EpisodePlayerPage({
    params,
}: {
    params: { id: string };
}) {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data, error: fetchErr } = await supabase
        .from("episodes")
        .select("*")
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single();

    if (fetchErr || !data) {
        return (
            <EpisodePlayerClient
                title="Episode"
                createdAt={new Date().toISOString()}
                playable={null}
                error="Episode not found."
            />
        );
    }

    const ep = data as Episode;
    const meta = ep.metadata as Record<string, unknown> | null;
    const playable = (meta?.playable as PlayableEpisode) || null;

    return (
        <EpisodePlayerClient
            title={ep.title}
            createdAt={ep.created_at}
            playable={playable}
            error={!playable ? "Episode has not been generated yet." : null}
        />
    );
}
