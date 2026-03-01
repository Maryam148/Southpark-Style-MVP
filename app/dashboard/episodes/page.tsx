import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import type { Episode } from "@/types";
import DeleteEpisodeButton from "./DeleteEpisodeButton";
import { Plus, Film, Play } from "lucide-react";

const STATUS: Record<string, { dot: string; text: string; label: string }> = {
  draft: { dot: "bg-muted-text-3", text: "text-muted-text-2", label: "Draft" },
  processing: { dot: "bg-amber-400", text: "text-amber-400", label: "Processing" },
  completed: { dot: "bg-green-400", text: "text-green-400", label: "Completed" },
  failed: { dot: "bg-red-400", text: "text-red-400", label: "Failed" },
};

const TABS = [
  { label: "All", filter: null },
  { label: "Completed", filter: "completed" },
  { label: "Processing", filter: "processing" },
  { label: "Drafts", filter: "draft" },
];

export default async function EpisodesPage({
  searchParams,
}: {
  searchParams?: { filter?: string };
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const activeFilter = searchParams?.filter ?? null;

  let query = supabase
    .from("episodes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(0, 49);

  if (activeFilter) query = query.eq("status", activeFilter);

  const { data, error } = await query;
  if (error) console.error("[EpisodesPage] Fetch error:", error);

  const episodes = (data as Episode[]) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">My Episodes</h1>
          <p className="mt-1 text-sm text-muted-text-2">Manage and play your generated episodes.</p>
        </div>
        <Link
          href="/dashboard/generate"
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md bg-violet-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-hover"
        >
          <Plus className="h-3.5 w-3.5" />
          Generate New
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-5 border-b border-sk-border">
        {TABS.map((tab) => {
          const isActive = tab.filter === activeFilter;
          const href = tab.filter ? `/dashboard/episodes?filter=${tab.filter}` : "/dashboard/episodes";
          return (
            <Link
              key={tab.label}
              href={href}
              className={`pb-3 text-sm transition-all duration-150 border-b-2 ${isActive
                  ? "border-violet-primary font-semibold text-white"
                  : "border-transparent font-medium text-muted-text-2 hover:text-white"
                }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {episodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-sk-border py-20 text-center">
          <Film className="h-9 w-9 text-muted-text-3" />
          <h3 className="mt-4 text-sm font-semibold text-muted-text-1">No episodes here</h3>
          <p className="mt-1 text-xs text-muted-text-3">
            <Link href="/dashboard/upload-script" className="text-violet-primary hover:underline">Upload a script</Link>
            {" "}then{" "}
            <Link href="/dashboard/generate" className="text-violet-primary hover:underline">generate</Link>
            {" "}to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {episodes.map((ep) => {
            const meta = ep.metadata as Record<string, unknown> | null;
            const sceneCount = (meta?.scene_count as number) ?? null;
            const isPlayable = ep.status === "completed" && meta?.playable;
            const isProcessing = ep.status === "processing";
            const s = STATUS[ep.status] || STATUS.draft;

            return (
              <div
                key={ep.id}
                className="group flex flex-col overflow-hidden rounded-lg border border-sk-border bg-surface-1 transition-all duration-150 hover:border-sk-border-hover"
              >
                {/* Thumbnail */}
                <div className="relative flex aspect-video items-center justify-center bg-surface-2">
                  {isProcessing ? (
                    <div className="flex flex-col items-center gap-2 text-muted-text-3">
                      <svg className="h-8 w-8 animate-spin text-violet-primary" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    </div>
                  ) : (
                    <>
                      <Film className="h-7 w-7 text-muted-text-3" />
                      {isPlayable && (
                        <Link
                          href={`/dashboard/episodes/${ep.id}`}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
                            <Play className="h-5 w-5 fill-white text-white" />
                          </div>
                        </Link>
                      )}
                    </>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div>
                    <h3 className="truncate text-sm font-semibold text-white">{ep.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-text-3">
                      {new Date(ep.created_at).toLocaleDateString()}
                      {sceneCount != null && ` · ${sceneCount} scene${sceneCount === 1 ? "" : "s"}`}
                    </p>
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${isProcessing ? "animate-pulse" : ""}`} />
                      {s.label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isPlayable ? (
                        <Link
                          href={`/dashboard/episodes/${ep.id}`}
                          className="rounded-md bg-violet-primary px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-violet-hover"
                        >
                          Watch
                        </Link>
                      ) : ep.status === "draft" ? (
                        <Link
                          href="/dashboard/generate"
                          className="rounded-md border border-sk-border px-2.5 py-1 text-xs font-medium text-muted-text-1 transition-colors hover:bg-surface-2 hover:text-white"
                        >
                          Generate
                        </Link>
                      ) : null}
                      <DeleteEpisodeButton episodeId={ep.id} episodeTitle={ep.title} />
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
