"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Creative Director, Luminary Studios",
    avatar: "SC",
    rating: 5,
    text: "We've completely transformed our content pipeline. What used to take our team a full week now takes an afternoon. The quality rivals professional post-production.",
  },
  {
    name: "Marcus Rivera",
    role: "Head of Marketing, NovaTech",
    avatar: "MR",
    rating: 5,
    text: "Our ad performance jumped 3x after switching to AI-generated video. The ability to A/B test dozens of variants in hours instead of weeks is a superpower.",
  },
  {
    name: "Aisha Patel",
    role: "Independent Filmmaker",
    avatar: "AP",
    rating: 5,
    text: "As an indie creator with zero budget for VFX, this tool leveled the playing field. I'm producing visuals I never thought possible on my own.",
  },
  {
    name: "James Okafor",
    role: "VP of Product, ScaleUp Inc.",
    avatar: "JO",
    rating: 5,
    text: "The API integration was seamless. We embedded video generation directly into our platform and our users love it. Support team is incredibly responsive.",
  },
];

export default function Testimonials() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-60px" });
  const [activeIndex, setActiveIndex] = useState(0);

  const prev = () =>
    setActiveIndex((i) => (i === 0 ? testimonials.length - 1 : i - 1));
  const next = () =>
    setActiveIndex((i) => (i === testimonials.length - 1 ? 0 : i + 1));

  return (
    <section className="relative py-28 sm:py-36 bg-cinema-black">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cinema-border to-transparent" />

      <div ref={sectionRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="text-label uppercase text-amber-400 mb-4">
            Testimonials
          </p>
          <h2 className="text-display-md text-white">
            Trusted by creators worldwide
          </h2>
        </motion.div>

        {/* Desktop grid */}
        <div className="hidden md:grid grid-cols-2 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.08 }}
              className="relative p-7 rounded-2xl border border-cinema-border bg-cinema-card/30 hover:bg-cinema-card/50 transition-colors duration-300"
            >
              <Quote size={24} className="text-amber-400/20 mb-4" />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, si) => (
                  <Star
                    key={si}
                    size={14}
                    className="fill-amber-400 text-amber-400"
                  />
                ))}
              </div>

              <p className="text-body-lg text-white/90 leading-relaxed mb-6">
                &ldquo;{t.text}&rdquo;
              </p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center text-label text-amber-400">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-body-sm font-semibold text-white">
                    {t.name}
                  </div>
                  <div className="text-body-sm text-muted-text-2">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Mobile carousel */}
        <div className="md:hidden">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="relative p-7 rounded-2xl border border-cinema-border bg-cinema-card/30"
          >
            <Quote size={24} className="text-amber-400/20 mb-4" />
            <div className="flex gap-1 mb-4">
              {Array.from({ length: testimonials[activeIndex].rating }).map(
                (_, si) => (
                  <Star
                    key={si}
                    size={14}
                    className="fill-amber-400 text-amber-400"
                  />
                )
              )}
            </div>
            <p className="text-body-lg text-white/90 leading-relaxed mb-6">
              &ldquo;{testimonials[activeIndex].text}&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center text-label text-amber-400">
                {testimonials[activeIndex].avatar}
              </div>
              <div>
                <div className="text-body-sm font-semibold text-white">
                  {testimonials[activeIndex].name}
                </div>
                <div className="text-body-sm text-muted-text-2">
                  {testimonials[activeIndex].role}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={prev}
              className="w-9 h-9 rounded-full border border-cinema-border flex items-center justify-center text-muted-text-2 hover:text-white hover:border-cinema-border-hover transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex gap-1.5">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                    i === activeIndex ? "bg-amber-400" : "bg-cinema-border"
                  }`}
                  aria-label={`Go to testimonial ${i + 1}`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="w-9 h-9 rounded-full border border-cinema-border flex items-center justify-center text-muted-text-2 hover:text-white hover:border-cinema-border-hover transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
