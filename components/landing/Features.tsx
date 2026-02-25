"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Zap,
  Film,
  Palette,
  Globe,
  Shield,
  Layers,
} from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Real-time Generation",
    description:
      "Generate video clips in seconds with our optimized inference pipeline. No queues, no waiting.",
  },
  {
    icon: Film,
    title: "Cinematic Quality",
    description:
      "Produce 4K output with accurate physics, realistic lighting, and smooth 24fps motion.",
  },
  {
    icon: Palette,
    title: "Style Control",
    description:
      "Choose from photorealistic, anime, 3D, watercolor, and more — or define your own custom style.",
  },
  {
    icon: Globe,
    title: "Multi-language Support",
    description:
      "Create videos with AI narration in 30+ languages. Lip-sync included automatically.",
  },
  {
    icon: Shield,
    title: "Enterprise-grade Security",
    description:
      "SOC 2 compliant infrastructure with end-to-end encryption. Your creative assets stay yours.",
  },
  {
    icon: Layers,
    title: "API & Integrations",
    description:
      "Embed video generation into your own apps. RESTful API, webhooks, and SDKs for every stack.",
  },
];

function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" as const }}
      className="group relative rounded-2xl border border-cinema-border bg-cinema-card/50 p-7 hover:bg-cinema-card-hover hover:border-cinema-border-hover transition-all duration-300"
    >
      {/* Hover glow */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-amber-500/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 blur-sm" />

      <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
        <feature.icon size={20} className="text-amber-400" />
      </div>

      <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
      <p className="text-body-md text-muted-text-1 leading-relaxed">
        {feature.description}
      </p>
    </motion.div>
  );
}

export default function Features() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-60px" });

  return (
    <section id="features" className="relative py-28 sm:py-36 bg-cinema-dark">
      {/* Subtle top separator gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cinema-border to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 24 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="text-label uppercase text-amber-400 mb-4">
            Why choose us
          </p>
          <h2 className="text-display-md text-white">
            Built for creators who demand more
          </h2>
          <p className="mt-4 text-body-lg text-muted-text-1">
            From solo creators to enterprise teams — the tools you need to produce
            professional video at scale.
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
