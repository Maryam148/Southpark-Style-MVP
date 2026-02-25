import { WorkflowPlayer } from "@/components/WorkflowPlayer";

export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen" style={{ background: "#000000" }}>
      {/* ── Left panel — animation (desktop only) ──────────────── */}
      <div
        className="relative hidden lg:flex lg:w-1/2 xl:w-[58%] items-center justify-center overflow-hidden"
        style={{ background: "#000000" }}
      >
        <div className="absolute inset-y-0 left-[12%] right-[4%] lg:left-[14%] lg:right-[4%] overflow-hidden rounded-xl">
          <WorkflowPlayer />
        </div>


      </div>

      {/* ── Right panel — auth form ────────────────────────────── */}
      <div
        className="flex w-full lg:w-1/2 xl:w-[42%] items-center justify-center px-6 py-12"
        style={{ background: "#000000" }}
      >
        <div className="w-full max-w-[400px]">
          {/* Brand header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Skunk<span style={{ color: "#ef4444" }}>Studio</span>
            </h1>
            <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              AI-powered animation platform
            </p>
          </div>

          {/* Glassmorphism card */}
          <div
            className="rounded-2xl p-7 sm:p-8"
            style={{
              background: "rgba(12, 12, 26, 0.7)",
              backdropFilter: "blur(20px) saturate(1.2)",
              WebkitBackdropFilter: "blur(20px) saturate(1.2)",
              border: "1px solid rgba(139, 92, 246, 0.12)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.03), 0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.05), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {children}
          </div>

          {/* Subtle footer */}
          <p className="mt-6 text-center text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
            Secure login · Powered by Supabase
          </p>
        </div>
      </div>
    </div>
  );
}
