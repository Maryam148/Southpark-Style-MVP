"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Type, Image, Clapperboard, ArrowRight } from "lucide-react";

const showcaseItems = [
  {
    badge: "Text to Video",
    icon: Type,
    title: "Describe it. Watch it come to life.",
    description:
      "Type a prompt and our AI generates cinematic video sequences with consistent characters, lighting, and motion.",
    features: ["Natural language prompts", "Character consistency", "Camera control"],
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
  },
  {
    badge: "Image to Video",
    icon: Image,
    title: "Animate any still image instantly.",
    description:
      "Upload a reference image and let AI bring it to motion with realistic physics, expressions, and scene dynamics.",
    features: ["Photo-real animation", "Style transfer", "Motion paths"],
    gradient: "from-blue-500/15 via-indigo-500/10 to-transparent",
  },
  {
    badge: "Reference to Video",
    icon: Clapperboard,
    title: "Use references. Get precision.",
    description:
      "Combine character sheets, storyboards, or style references to produce videos that match your exact creative vision.",
    features: ["Multi-reference input", "Pose matching", "Scene composition"],
    gradient: "from-violet-500/15 via-purple-500/10 to-transparent",
  },
];

function ShowcaseCard({
  item,
  index,
}: {
  item: (typeof showcaseItems)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const isReversed = index % 2 !== 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" as const }}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
        isReversed ? "lg:direction-rtl" : ""
      }`}
    >
      {/* Text content */}
      <div className={`space-y-6 ${isReversed ? "lg:order-2 lg:direction-ltr" : ""}`}>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cinema-border bg-cinema-card/50 text-label uppercase text-amber-400">
          <item.icon size={14} />
          {item.badge}
        </div>
        <h3 className="text-display-sm text-white">{item.title}</h3>
        <p className="text-body-lg text-muted-text-1 max-w-md">
          {item.description}
        </p>
        <ul className="space-y-2.5">
          {item.features.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-body-md text-muted-text-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <a
          href="#"
          className="group inline-flex items-center gap-1.5 text-body-md font-medium text-amber-400 hover:text-amber-300 transition-colors"
        >
          Try it now
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>

      {/* Visual placeholder */}
      <div className={`${isReversed ? "lg:order-1 lg:direction-ltr" : ""}`}>
        <div className={`relative rounded-2xl border border-cinema-border overflow-hidden bg-cinema-card aspect-[4/3]`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${item.gradient}`} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <item.icon size={28} className="text-white/30" />
              </div>
              <p className="text-body-sm text-muted-text-3">Interactive demo</p>
            </div>
          </div>
          {/* Bottom controls mockup */}
          <div className="absolute bottom-0 inset-x-0 px-4 py-3 bg-gradient-to-t from-cinema-black/80 to-transparent">
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full w-2/5 rounded-full bg-amber-400/50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function VideoShowcase() {
  return (
    <section id="showcase" className="relative py-28 sm:py-36 bg-cinema-black">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-28 sm:space-y-36">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-label uppercase text-amber-400 mb-4">How it works</p>
          <h2 className="text-display-md text-white">
            Multiple paths to video creation
          </h2>
          <p className="mt-4 text-body-lg text-muted-text-1">
            Whether you start from text, an image, or a reference — our AI handles the rest.
          </p>
        </div>

        {/* Showcase cards */}
        {showcaseItems.map((item, i) => (
          <ShowcaseCard key={item.badge} item={item} index={i} />
        ))}
      </div>
    </section>
  );
}
