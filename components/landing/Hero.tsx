"use client";

import { motion } from "framer-motion";
import { Play, ArrowRight, Sparkles } from "lucide-react";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export default function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-cinema-black" />
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,hsla(220,40%,12%,0.5),transparent)]" />

      {/* Ambient grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsla(0,0%,100%,0.1) 1px, transparent 1px), linear-gradient(90deg, hsla(0,0%,100%,0.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* Floating glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] animate-glow-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-amber-600/5 rounded-full blur-[100px] animate-glow-pulse [animation-delay:1.5s]" />

      {/* Content */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 text-center pt-24 pb-12"
      >
        {/* Badge */}
        <motion.div variants={fadeUp} className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cinema-border bg-cinema-card/50 backdrop-blur-sm">
          <Sparkles size={14} className="text-amber-400" />
          <span className="text-label uppercase text-amber-400">Now in Public Beta</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="text-display-lg sm:text-display-xl text-white text-balance"
        >
          Transform Your Ideas
          <br />
          <span className="bg-gradient-cinematic bg-clip-text text-transparent">
            Into Stunning Videos
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={fadeUp}
          className="mt-6 max-w-2xl mx-auto text-body-lg text-muted-text-1 text-balance"
        >
          The next-generation AI video platform. Go from text, images, or concepts
          to cinematic-quality video in seconds no editing skills required.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeUp}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#"
            className="group relative inline-flex items-center gap-2.5 px-7 py-3.5 text-body-md font-semibold text-cinema-black bg-gradient-cinematic rounded-xl hover:brightness-110 transition-all duration-300 hover:shadow-[0_0_32px_hsla(36,100%,50%,0.35)]"
          >
            Start Creating — It&apos;s Free
            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </a>
          <a
            href="#showcase"
            className="group inline-flex items-center gap-2.5 px-7 py-3.5 text-body-md font-medium text-white border border-cinema-border hover:border-cinema-border-hover rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white/10 group-hover:bg-white/15 transition-colors">
              <Play size={12} className="text-white ml-0.5" />
            </span>
            Watch Demo
          </a>
        </motion.div>

        {/* Social proof */}
        <motion.div
          variants={fadeUp}
          className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10"
        >
          {[
            { value: "2M+", label: "Videos Generated" },
            { value: "150K+", label: "Active Creators" },
            { value: "4.9", label: "Average Rating" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-xl font-bold text-white">{stat.value}</div>
              <div className="text-body-sm text-muted-text-2 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Hero video preview */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" as const }}
        className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 pb-16"
      >
        <div className="relative rounded-2xl border border-cinema-border/60 overflow-hidden bg-cinema-card shadow-[0_0_80px_hsla(36,100%,50%,0.06)]">
          {/* Browser-like top bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-cinema-border/40 bg-cinema-dark/80">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            </div>
            <div className="flex-1 mx-4">
              <div className="h-5 w-48 mx-auto rounded bg-white/5" />
            </div>
          </div>

          {/* Video placeholder — cinematic aspect ratio */}
          <div className="relative aspect-video bg-gradient-to-b from-cinema-dark to-cinema-black flex items-center justify-center">
            <div className="absolute inset-0 flex flex-col">
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Play size={32} className="text-amber-400/80 ml-1" />
                  </div>
                  <p className="text-body-sm text-muted-text-2">AI-generated preview</p>
                </div>
              </div>

              {/* Bottom toolbar mockup */}
              <div className="px-4 py-3 border-t border-white/5 bg-cinema-black/60 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                  <Play size={14} className="text-white/40 ml-0.5" />
                </div>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-gradient-cinematic" />
                </div>
                <span className="text-label text-muted-text-3 tabular-nums">0:04 / 0:12</span>
              </div>
            </div>
          </div>
        </div>

        {/* Ambient glow behind the preview */}
        <div className="absolute -inset-4 -z-10 rounded-3xl bg-amber-500/[0.04] blur-2xl" />
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2"
      >
        <div className="w-5 h-8 rounded-full border border-cinema-border flex items-start justify-center p-1.5">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-1 h-1.5 rounded-full bg-amber-400/60"
          />
        </div>
      </motion.div>
    </section>
  );
}
