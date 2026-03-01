import Link from "next/link";
import { getUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { FileText, Image, Wand2, Play, ArrowRight, CheckCircle2, Circle, ChevronRight } from "lucide-react";
import type { Episode } from "@/types";

const STATUS: Record<string, { dot: string; text: string; label: string; glow: string }> = {
  draft:      { dot: "bg-muted-text-3",  text: "text-muted-text-2", label: "Draft",      glow: "" },
  processing: { dot: "bg-amber-400",     text: "text-amber-400",    label: "Processing", glow: "shadow-[0_0_8px_rgba(251,191,36,0.4)]" },
  completed:  { dot: "bg-green-400",     text: "text-green-400",    label: "Completed",  glow: "shadow-[0_0_8px_rgba(74,222,128,0.4)]" },
  failed:     { dot: "bg-red-500",       text: "text-red-400",      label: "Failed",     glow: "" },
};

const PIPELINE_STEPS = [
  { label: "Upload Script", desc: "Add your screenplay",         href: "/dashboard/upload-script", icon: FileText },
  { label: "Asset Library", desc: "Characters & backgrounds",    href: "/dashboard/asset-library", icon: Image },
  { label: "Generate",      desc: "Animate with AI",            href: "/dashboard/generate",       icon: Wand2 },
  { label: "Watch",         desc: "Play your episode",          href: "/dashboard/episodes",       icon: Play },
];

// Gradient palettes for episode thumbnail placeholders
const THUMB_GRADIENTS = [
  "from-violet-900/60 via-red-900/40 to-surface-1",
  "from-indigo-900/60 via-purple-900/40 to-surface-1",
  "from-red-900/60 via-orange-900/30 to-surface-1",
  "from-slate-800/60 via-blue-900/30 to-surface-1",
];

export default async function DashboardPage() {
  const user = await getUser();
  const firstName = user?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  let recentEpisodes: Episode[] = [];
  let totalEpisodes = 0;
  let completedEpisodes = 0;
  let totalScenes = 0;

  if (user?.id) {
    const supabase = await createServerSupabaseClient();

    // Fetch all episodes for stats
    const { data: allEps } = await supabase
      .from("episodes")
      .select("id, status, metadata")
      .eq("user_id", user.id);

    if (allEps) {
      totalEpisodes = allEps.length;
      completedEpisodes = allEps.filter((e) => e.status === "completed").length;
      totalScenes = allEps.reduce((sum, e) => {
        const meta = e.metadata as Record<string, unknown> | null;
        return sum + ((meta?.scene_count as number) || 0);
      }, 0);
    }

    // Fetch recent 4
    const { data } = await supabase
      .from("episodes")
      .select("id, title, status, created_at, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4);
    recentEpisodes = (data as Episode[]) || [];
  }

  const stats = [
    { label: "Episodes",       value: totalEpisodes,    suffix: "" },
    { label: "Completed",      value: completedEpisodes, suffix: "" },
    { label: "Scenes Rendered", value: totalScenes,     suffix: "" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-sk-border bg-surface-1">
        {/* Glow orb */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-violet-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-10 h-40 w-40 rounded-full bg-gold/5 blur-2xl" />

        <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          {/* Greeting */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-text-3">
              SkunkStudio
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1.5 text-sm text-muted-text-2">
              Your animation studio is ready.{" "}
              <Link href="/dashboard/generate" className="text-violet-primary hover:underline">
                Start generating →
              </Link>
            </p>
          </div>

          {/* Stat pills */}
          <div className="flex shrink-0 items-center gap-3">
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center rounded-lg border border-sk-border bg-surface-0/60 px-4 py-3 text-center"
              >
                <span className="text-2xl font-bold tabular-nums text-white">
                  {s.value}
                  <span className="text-violet-primary">{s.suffix}</span>
                </span>
                <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-text-3">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Workflow Pipeline ─────────────────────────────────────── */}
      <div>
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-text-3">
          Workflow
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PIPELINE_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isLast = i === PIPELINE_STEPS.length - 1;
            return (
              <div key={step.href} className="relative flex items-stretch">
                <Link
                  href={step.href}
                  className="group flex flex-1 flex-col gap-3 rounded-lg border border-sk-border bg-surface-1 p-4 transition-all duration-150 hover:-translate-y-px hover:border-sk-border-hover hover:bg-surface-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-2 group-hover:bg-surface-3 transition-colors">
                      <Icon className="h-4 w-4 text-violet-primary" />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums text-muted-text-3">
                      0{i + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{step.label}</p>
                    <p className="mt-0.5 text-xs text-muted-text-3">{step.desc}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-[11px] font-medium text-violet-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Open <ChevronRight className="h-3 w-3" />
                  </div>
                </Link>

                {/* Connector arrow */}
                {!isLast && (
                  <div className="absolute -right-1.5 top-1/2 z-10 hidden -translate-y-1/2 sm:flex">
                    <div className="flex h-3 w-3 items-center justify-center rounded-full border border-sk-border bg-surface-0">
                      <ArrowRight className="h-1.5 w-1.5 text-muted-text-3" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recent Episodes ───────────────────────────────────────── */}
      {recentEpisodes.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-text-3">
              Recent Episodes
            </p>
            <Link
              href="/dashboard/episodes"
              className="flex items-center gap-1 text-xs font-medium text-violet-primary hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recentEpisodes.map((ep, i) => {
              const meta = ep.metadata as Record<string, unknown> | null;
              const sceneCount = meta?.scene_count as number | undefined;
              const isPlayable = ep.status === "completed" && Boolean(meta?.playable);
              const s = STATUS[ep.status] || STATUS.draft;
              const gradient = THUMB_GRADIENTS[i % THUMB_GRADIENTS.length];

              return (
                <div
                  key={ep.id}
                  className="group flex flex-col overflow-hidden rounded-lg border border-sk-border bg-surface-1 transition-all duration-150 hover:-translate-y-px hover:border-sk-border-hover"
                >
                  {/* Thumbnail */}
                  <div className={`relative flex h-28 items-center justify-center bg-gradient-to-br ${gradient}`}>
                    <Play className="h-8 w-8 text-white/20" />
                    {sceneCount != null && (
                      <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
                        {sceneCount} scene{sceneCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <p className="truncate text-sm font-semibold text-white">{ep.title}</p>
                    <div className="flex items-center justify-between">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${s.glow}`} />
                        {s.label}
                      </span>
                      <span className="text-[11px] text-muted-text-3">
                        {new Date(ep.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    {isPlayable && (
                      <Link
                        href={`/dashboard/episodes/${ep.id}`}
                        className="mt-auto flex items-center justify-center gap-1.5 rounded-md bg-violet-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-hover"
                      >
                        <Play className="h-3 w-3" /> Watch
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {recentEpisodes.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-sk-border py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
            <Wand2 className="h-5 w-5 text-violet-primary" />
          </div>
          <p className="mt-4 text-sm font-semibold text-white">No episodes yet</p>
          <p className="mt-1 text-xs text-muted-text-2">Upload a script and generate your first animated episode.</p>
          <Link
            href="/dashboard/upload-script"
            className="mt-5 rounded-md bg-violet-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-hover"
          >
            Get Started
          </Link>
        </div>
      )}
    </div>
  );
}
