import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import type { Episode } from "@/types";
import DeleteEpisodeButton from "./DeleteEpisodeButton";
import { Play, Plus, Film } from "lucide-react";

const STATUS_CONFIG: Record<string, { dot: string; text: string }> = {
  draft: { dot: "bg-muted-text-3", text: "text-muted-text-2" },
  processing: { dot: "bg-amber-400", text: "text-amber-400" },
  completed: { dot: "bg-green-400", text: "text-green-400" },
  failed: { dot: "bg-red-400", text: "text-red-400" },
};

export default async function EpisodesPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(0, 49);

  if (error) {
    console.error("[EpisodesPage] Fetch error:", error);
  }

  const episodes = (data as Episode[]) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My Episodes</h1>
          <p className="mt-1 text-sm text-muted-text-1">
            All your episodes in one place.
          </p>
        </div>
        <Link
          href="/dashboard/generate"
          className="inline-flex items-center gap-2 rounded-md bg-violet-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-hover"
        >
          <Plus className="h-4 w-4" />
          Generate New
        </Link>
      </div>

      {episodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-sk-border py-20 text-center">
          <Film className="h-10 w-10 text-muted-text-3" />
          <h3 className="mt-4 text-sm font-semibold text-muted-text-1">
            No episodes yet
          </h3>
          <p className="mt-1 text-xs text-muted-text-3">
            <Link
              href="/dashboard/upload-script"
              className="text-violet-primary hover:underline"
            >
              Upload a script
            </Link>{" "}
            and{" "}
            <Link
              href="/dashboard/generate"
              className="text-violet-primary hover:underline"
            >
              generate
            </Link>{" "}
            your first episode.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {episodes.map((ep) => {
            const meta = ep.metadata as Record<string, unknown> | null;
            const sceneCount = (meta?.scene_count as number) ?? null;
            const isPlayable = ep.status === "completed" && meta?.playable;
            const statusCfg =
              STATUS_CONFIG[ep.status] || STATUS_CONFIG.draft;

            return (
              <div
                key={ep.id}
                className="flex flex-col rounded-lg border border-sk-border bg-surface-1 transition-colors duration-150 hover:border-sk-border-hover"
              >
                {/* Thumbnail placeholder */}
                <div className="flex aspect-video items-center justify-center rounded-t-lg bg-surface-2">
                  <Film className="h-8 w-8 text-muted-text-3" />
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="truncate text-sm font-semibold text-white">
                    {ep.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-text-3">
                    {new Date(ep.created_at).toLocaleDateString()}
                    {sceneCount != null &&
                      ` · ${sceneCount} scene${sceneCount === 1 ? "" : "s"}`}
                  </p>

                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium capitalize ${statusCfg.text}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`}
                      />
                      {ep.status}
                    </span>

                    <div className="flex items-center gap-2">
                      {isPlayable ? (
                        <Link
                          href={`/dashboard/episodes/${ep.id}`}
                          className="inline-flex items-center gap-1 rounded-md bg-violet-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-violet-hover"
                        >
                          <Play className="h-3 w-3" />
                          Watch
                        </Link>
                      ) : ep.status === "draft" ? (
                        <Link
                          href="/dashboard/generate"
                          className="rounded-md border border-sk-border px-3 py-1.5 text-xs font-medium text-muted-text-1 transition-colors duration-150 hover:bg-surface-2 hover:text-white"
                        >
                          Generate
                        </Link>
                      ) : null}

                      <DeleteEpisodeButton
                        episodeId={ep.id}
                        episodeTitle={ep.title}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
