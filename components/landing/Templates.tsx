"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Play, Clock, ArrowRight } from "lucide-react";

const categories = [
  "All",
  "Social Media",
  "Marketing",
  "Education",
  "Entertainment",
  "Product",
];

const templates = [
  {
    title: "Product Launch Trailer",
    category: "Marketing",
    duration: "0:30",
    style: "Cinematic",
    gradient: "from-amber-600/30 via-orange-600/15 to-transparent",
  },
  {
    title: "Instagram Reels Pack",
    category: "Social Media",
    duration: "0:15",
    style: "Trendy",
    gradient: "from-pink-600/25 via-rose-600/10 to-transparent",
  },
  {
    title: "Explainer Video",
    category: "Education",
    duration: "1:00",
    style: "Minimal",
    gradient: "from-blue-600/25 via-cyan-600/10 to-transparent",
  },
  {
    title: "Music Visualizer",
    category: "Entertainment",
    duration: "0:45",
    style: "Abstract",
    gradient: "from-violet-600/25 via-purple-600/10 to-transparent",
  },
  {
    title: "App Demo Walkthrough",
    category: "Product",
    duration: "0:30",
    style: "Clean",
    gradient: "from-emerald-600/25 via-green-600/10 to-transparent",
  },
  {
    title: "TikTok Ad Template",
    category: "Social Media",
    duration: "0:10",
    style: "Bold",
    gradient: "from-red-600/25 via-orange-600/10 to-transparent",
  },
];

export default function Templates() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-60px" });
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered =
    activeCategory === "All"
      ? templates
      : templates.filter((t) => t.category === activeCategory);

  return (
    <section id="templates" className="relative py-28 sm:py-36 bg-cinema-black">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cinema-border to-transparent" />

      <div ref={sectionRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <p className="text-label uppercase text-amber-400 mb-4">Templates</p>
          <h2 className="text-display-md text-white">
            Start fast with ready-made templates
          </h2>
          <p className="mt-4 text-body-lg text-muted-text-1">
            Pick a template, customize it to your brand, and export in minutes.
          </p>
        </motion.div>

        {/* Category filters */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="flex flex-wrap justify-center gap-2 mb-12"
        >
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-body-sm font-medium transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  : "text-muted-text-2 hover:text-white border border-transparent hover:bg-white/5"
              }`}
            >
              {cat}
            </button>
          ))}
        </motion.div>

        {/* Template grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((template, i) => (
            <motion.div
              key={template.title}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.06 }}
              className="group relative rounded-2xl border border-cinema-border overflow-hidden bg-cinema-card hover:border-cinema-border-hover transition-all duration-300 cursor-pointer"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${template.gradient}`} />
                <div className="absolute inset-0 bg-cinema-dark/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300">
                    <Play size={18} className="text-white ml-0.5" />
                  </div>
                </div>

                {/* Duration badge */}
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded bg-cinema-black/70 backdrop-blur-sm">
                  <Clock size={10} className="text-muted-text-2" />
                  <span className="text-label text-muted-text-1">{template.duration}</span>
                </div>
              </div>

              {/* Meta */}
              <div className="p-4">
                <h3 className="text-body-md font-semibold text-white group-hover:text-amber-400 transition-colors duration-200">
                  {template.title}
                </h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-body-sm text-muted-text-2">{template.category}</span>
                  <span className="w-1 h-1 rounded-full bg-muted-text-3" />
                  <span className="text-body-sm text-muted-text-2">{template.style}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View all link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5 }}
          className="text-center mt-10"
        >
          <a
            href="#"
            className="group inline-flex items-center gap-1.5 text-body-md font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            Browse all templates
            <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
