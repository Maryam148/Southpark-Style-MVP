import Link from "next/link";
import {
  FileText,
  Wand2,
  Mic,
  Layers,
  Check,
  Sparkles,
  Play,
  Pause,
} from "lucide-react";
import { CinematicHero } from "@/components/ui/hero-3";
import { Testimonials } from "@/components/ui/testimonials";
import { UseCases } from "@/components/ui/use-cases";
import { Benefits } from "@/components/ui/benefits";
import { Pricing } from "@/components/ui/pricing";
import { FAQ } from "@/components/ui/faq";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      {/* ── Hero (includes nav) ─────────────────── */}
      <CinematicHero
        title={
          <>
            Your script. Voiced.
            <br />
            Animated. In seconds.
          </>
        }
        description="Paste a script, get a fully animated, fully voiced South Park style episode — no studio, no team, no waiting."
        ctaText="Start Creating Free"
        ctaHref="/register"
      />

      {/* ── About / How It Works ──────────────────── */}
      <section
        id="how-it-works"
        className="relative overflow-hidden bg-black"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          {/* Tagline */}
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-violet-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-text-2">
              Introducing SkunkStudio
            </span>
          </div>

          {/* Split-weight headline */}
          <h2 className="max-w-2xl text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.15] tracking-tight">
            <span className="font-semibold text-white">
              Harness creative power
            </span>{" "}
            <span className="font-normal text-muted-text-2">
              to animate faster, voice deeper, and save hours.
            </span>
          </h2>

          {/* 3-column card grid */}
          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {/* Card 1 — Script to Scene */}
            <div className="group flex flex-col rounded-2xl border border-sk-border bg-surface-1/40 overflow-hidden transition-all duration-300 hover:border-sk-border-hover">
              {/* Card image / UI mockup */}
              <div className="relative aspect-[4/3] bg-surface-2/60 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-surface-2 to-surface-3/80" />
                {/* Mockup UI elements */}
                <div className="relative z-10 flex flex-col gap-3 p-5 pt-8">
                  <div className="inline-flex self-start items-center gap-2 rounded-lg bg-violet-primary/90 px-3 py-1.5 text-[0.65rem] font-semibold text-white shadow-lg">
                    <FileText className="h-3 w-3" /> Upload Script
                  </div>
                  <div className="inline-flex self-start items-center gap-2 rounded-lg bg-surface-0/80 backdrop-blur-sm px-3 py-1.5 text-[0.65rem] text-white/70 shadow">
                    <Wand2 className="h-3 w-3" /> Parse characters &amp; scenes
                  </div>
                  <div className="inline-flex self-start items-center gap-2 rounded-lg bg-surface-0/80 backdrop-blur-sm px-3 py-1.5 text-[0.65rem] text-white/70 shadow">
                    <Layers className="h-3 w-3" /> Resolve asset layers
                  </div>
                  <div className="inline-flex self-start items-center gap-2 rounded-lg bg-surface-0/60 backdrop-blur-sm px-3 py-1.5 text-[0.65rem] text-white/50 shadow">
                    <Check className="h-3 w-3" /> Build episode
                  </div>
                </div>
              </div>
              {/* Card text */}
              <div className="p-5 pt-4">
                <h3 className="text-[0.95rem] font-semibold text-white">
                  Script Unfolded
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-text-1">
                  Upload your script and watch it transform — characters are
                  parsed, assets resolved, and scenes built automatically.
                </p>
              </div>
            </div>

            {/* Card 2 — Voice Synthesis */}
            <div className="group flex flex-col rounded-2xl border border-sk-border bg-surface-1/40 overflow-hidden transition-all duration-300 hover:border-sk-border-hover">
              <div className="relative aspect-[4/3] bg-surface-2/60 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-surface-2 to-surface-3/80" />
                {/* Mockup: AI text/voice panel */}
                <div className="relative z-10 flex flex-col gap-3 p-5 pt-6">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-6 rounded-full bg-violet-primary/20 flex items-center justify-center">
                      <Mic className="h-3 w-3 text-violet-primary" />
                    </div>
                    <span className="text-[0.7rem] font-semibold text-white/80">
                      SkunkStudio AI
                    </span>
                  </div>
                  <div className="rounded-lg bg-surface-0/60 backdrop-blur-sm p-3 text-[0.6rem] leading-relaxed text-white/60">
                    Generating unique voices for each character using
                    ElevenLabs synthesis. Lip-sync timing is automatically
                    matched to dialogue duration...
                  </div>
                  {/* Playback controls mockup */}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex gap-1">
                      {[Play, Pause].map((Icon, i) => (
                        <div
                          key={i}
                          className="h-5 w-5 rounded bg-surface-0/40 flex items-center justify-center"
                        >
                          <Icon className="h-2.5 w-2.5 text-white/40" />
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full w-2/5 rounded-full bg-violet-primary/50" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-5 pt-4">
                <h3 className="text-[0.95rem] font-semibold text-white">
                  Voices That Flow
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-text-1">
                  AI-powered voice synthesis for every character — expressive,
                  unique, and perfectly synced to the animation.
                </p>
              </div>
            </div>

            {/* Card 3 — Animation Engine */}
            <div className="group flex flex-col rounded-2xl border border-sk-border bg-surface-1/40 overflow-hidden transition-all duration-300 hover:border-sk-border-hover">
              <div className="relative aspect-[4/3] overflow-hidden">
                {/* Cinematic background image */}
                <img
                  src="https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=640&q=60&auto=format&fit=crop"
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-40"
                  aria-hidden="true"
                />
                <div className="absolute inset-0 bg-surface-0/50" />
                {/* Floating notification mockups */}
                <div className="relative z-10 flex flex-col items-end gap-2.5 p-5 pt-8">
                  <div className="flex items-center gap-2 rounded-lg bg-surface-0/70 backdrop-blur-sm px-3 py-2 text-[0.65rem] text-white/70 shadow">
                    Generate tomorrow&apos;s episode
                    <span className="rounded bg-violet-primary/80 px-1.5 py-0.5 text-[0.55rem] font-bold text-white">
                      Go
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-surface-0/70 backdrop-blur-sm px-3 py-2 text-[0.65rem] text-white/70 shadow">
                    Ready to animate scenes
                    <span className="rounded bg-surface-3 px-1.5 py-0.5 text-[0.55rem] font-bold text-white/60">
                      Animate
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-surface-0/70 backdrop-blur-sm px-3 py-2 text-[0.65rem] text-white/70 shadow">
                    Would you like to export this?
                    <span className="rounded bg-violet-primary/80 px-1.5 py-0.5 text-[0.55rem] font-bold text-white">
                      Export
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-5 pt-4">
                <h3 className="text-[0.95rem] font-semibold text-white">
                  A Creative Engine
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-text-1">
                  Always ready to animate — generate, preview, and export full
                  episodes right when you need them.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Use Cases ──────────────────────────────── */}
      <UseCases />

      {/* ── Benefits ──────────────────────────────── */}
      <Benefits />

      {/* Testimonials */}
      <Testimonials />

      {/* ── Pricing ──────────────────────────────── */}
      <Pricing />

      {/* ── FAQ ───────────────────────────────────── */}
      <FAQ />

      {/* ── Final CTA Banner ────────────────────── */}
      <section className="bg-black">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="relative overflow-hidden rounded-2xl">
            {/* Background image */}
            <img
              src="https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=1920&q=80&auto=format&fit=crop"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-black/30" />

            {/* Content */}
            <div className="relative z-10 px-8 py-16 sm:px-14 sm:py-20">
              <h2 className="max-w-md text-3xl sm:text-4xl md:text-[2.75rem] font-semibold leading-[1.15] tracking-tight text-white">
                Step into the future, guided by animation.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
                Experience the studio right now. Just dive in and see what
                SkunkStudio can do for you.
              </p>
              <Link
                href="/register"
                className="mt-7 inline-flex items-center rounded-full border border-white/40 bg-white/10 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:border-white/60"
              >
                Try It Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────── */}
      <footer className="border-t border-sk-border">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
            {/* Left — brand + socials */}
            <div className="max-w-xs">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-lg font-bold tracking-tight text-white"
              >
                <Sparkles className="h-4 w-4 text-red-500" />
                Skunk<span className="text-red-500">Studio</span>
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-muted-text-2">
                Create animated episodes, synthesize voices, and bring your
                scripts to life in seconds.
              </p>
              {/* Social icons */}
              <div className="mt-5 flex items-center gap-3">
                <a
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-sk-border text-white/50 transition-all duration-200 hover:border-sk-border-hover hover:text-white"
                  aria-label="Twitter"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
                <a
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-sk-border text-white/50 transition-all duration-200 hover:border-sk-border-hover hover:text-white"
                  aria-label="GitHub"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
                </a>
                <a
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-sk-border text-white/50 transition-all duration-200 hover:border-sk-border-hover hover:text-white"
                  aria-label="LinkedIn"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                </a>
              </div>
            </div>

            {/* Right — navigation */}
            <div>
              <h4 className="text-sm font-semibold text-white">Navigation</h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <a href="#how-it-works" className="text-sm text-muted-text-1 transition-colors hover:text-white">About</a>
                </li>
                <li>
                  <a href="#features" className="text-sm text-muted-text-1 transition-colors hover:text-white">Features</a>
                </li>
                <li>
                  <a href="#testimonials" className="text-sm text-muted-text-1 transition-colors hover:text-white">Testimonials</a>
                </li>
                <li>
                  <a href="#pricing" className="text-sm text-muted-text-1 transition-colors hover:text-white">Pricing</a>
                </li>
                <li>
                  <a href="#faq" className="text-sm text-muted-text-1 transition-colors hover:text-white">FAQ</a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-sk-border pt-6 sm:flex-row">
            <p className="text-xs text-muted-text-3">
              &copy; {new Date().getFullYear()} SkunkStudio. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
