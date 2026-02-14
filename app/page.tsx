import Link from "next/link";
import { FileText, Image, Wand2, ArrowRight } from "lucide-react";

const STEPS = [
  {
    num: 1,
    icon: FileText,
    title: "Upload your script",
    desc: "Paste or upload a JSON script with scenes, characters, and dialogue.",
  },
  {
    num: 2,
    icon: Image,
    title: "Add character assets",
    desc: "Upload character parts, backgrounds, and props to your library.",
  },
  {
    num: 3,
    icon: Wand2,
    title: "Generate & watch",
    desc: "One click resolves assets, synthesizes voices, and builds your episode.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-sk-border bg-surface-0/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-white"
          >
            Skunk<span className="text-violet-primary">Studio</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-text-1 transition-colors duration-150 hover:text-white"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-violet-primary px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-hover"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pt-28 text-center">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            Turn scripts into animated episodes
          </h1>

          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-text-1">
            Upload a script, add your character assets, and let SkunkStudio
            generate a fully playable animated episode — no animation experience
            required.
          </p>

          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-md bg-violet-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-violet-hover"
            >
              Start Creating
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Preview mock */}
        <div className="mt-16 w-full max-w-3xl">
          <div className="overflow-hidden rounded-lg border border-sk-border bg-surface-1">
            <div className="flex items-center gap-2 border-b border-sk-border px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-text-3" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-text-3" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-text-3" />
              <span className="ml-3 text-xs text-muted-text-3">
                SkunkStudio Player
              </span>
            </div>
            <div className="relative flex aspect-video items-center justify-center bg-surface-2">
              <div className="flex items-end gap-8">
                <div className="flex flex-col items-center">
                  <div className="h-16 w-14 rounded-t-full bg-violet-primary/60" />
                  <div className="h-20 w-12 rounded-b-lg bg-violet-primary/40" />
                  <span className="mt-2 text-xs text-muted-text-2">Jax</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-16 w-14 rounded-t-full bg-blue-500/60" />
                  <div className="h-20 w-12 rounded-b-lg bg-blue-500/40" />
                  <span className="mt-2 text-xs text-muted-text-2">Mira</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-16 w-14 rounded-t-full bg-amber-500/60" />
                  <div className="h-20 w-12 rounded-b-lg bg-amber-500/40" />
                  <span className="mt-2 text-xs text-muted-text-2">Rex</span>
                </div>
              </div>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-md bg-black/75 px-5 py-2 text-sm font-medium text-white">
                Jax: &quot;Dude, this animation engine is insane!&quot;
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* How it works */}
      <section className="mx-auto mt-20 max-w-3xl px-6 pb-20">
        <h2 className="text-center text-xl font-bold text-white">
          How it works
        </h2>
        <div className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-violet-primary/10 text-violet-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-text-2">
                  Step {step.num}
                </div>
                <h3 className="mt-1 text-sm font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-text-1">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-sk-border py-6 text-center text-xs text-muted-text-3">
        &copy; {new Date().getFullYear()} SkunkStudio. All rights reserved.
      </footer>
    </div>
  );
}
