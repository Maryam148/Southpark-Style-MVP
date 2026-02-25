"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Users, Video, Award, TrendingUp } from "lucide-react";

const stats = [
  {
    icon: Users,
    value: "150K+",
    label: "Active Creators",
    description: "Across 120 countries",
  },
  {
    icon: Video,
    value: "2M+",
    label: "Videos Generated",
    description: "And growing daily",
  },
  {
    icon: Award,
    value: "#1",
    label: "Rated AI Video Tool",
    description: "By G2 and Product Hunt",
  },
  {
    icon: TrendingUp,
    value: "98%",
    label: "Satisfaction Rate",
    description: "From verified users",
  },
];

const communityPosts = [
  {
    handle: "@filmmaker_jay",
    text: "Just generated a full product video in 45 seconds. This is insane.",
    avatar: "FJ",
  },
  {
    handle: "@designstudio_co",
    text: "We replaced a 3-day production cycle with a 10-minute workflow. Game changer.",
    avatar: "DS",
  },
  {
    handle: "@indie_creator",
    text: "The style control is unreal — I can match my exact brand palette and feel.",
    avatar: "IC",
  },
];

export default function Community() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-60px" });

  return (
    <section id="community" className="relative py-28 sm:py-36 bg-cinema-dark">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cinema-border to-transparent" />

      <div ref={sectionRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="text-label uppercase text-amber-400 mb-4">Community</p>
          <h2 className="text-display-md text-white">
            Join a global network of creators
          </h2>
          <p className="mt-4 text-body-lg text-muted-text-1">
            See what our community is building and become part of the next wave of
            AI-powered storytelling.
          </p>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
              className="text-center p-6 rounded-2xl border border-cinema-border bg-cinema-card/30"
            >
              <div className="w-10 h-10 mx-auto rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <stat.icon size={18} className="text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-body-sm font-medium text-white mb-0.5">
                {stat.label}
              </div>
              <div className="text-body-sm text-muted-text-2">
                {stat.description}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Community posts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {communityPosts.map((post, i) => (
            <motion.div
              key={post.handle}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.08 }}
              className="p-5 rounded-2xl border border-cinema-border bg-cinema-card/30 hover:bg-cinema-card/50 transition-colors duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20 flex items-center justify-center text-label text-amber-400">
                  {post.avatar}
                </div>
                <span className="text-body-sm font-medium text-muted-text-1">
                  {post.handle}
                </span>
              </div>
              <p className="text-body-md text-white/90 leading-relaxed">
                &ldquo;{post.text}&rdquo;
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
