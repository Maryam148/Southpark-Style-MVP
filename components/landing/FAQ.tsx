"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "How does the AI video generation work?",
    answer:
      "Our platform uses a proprietary diffusion-based model trained on cinematic footage. You provide a text prompt, image, or reference — and our pipeline generates temporally consistent video with coherent motion, lighting, and physics.",
  },
  {
    question: "What output formats and resolutions are supported?",
    answer:
      "We support MP4, MOV, and WebM export formats at resolutions up to 4K (3840x2160). Frame rate options include 24fps, 30fps, and 60fps. Aspect ratios cover 16:9, 9:16, 1:1, and 4:5.",
  },
  {
    question: "Can I use generated videos commercially?",
    answer:
      "Yes. All videos generated on paid plans come with a full commercial license. You retain complete ownership of your output. Free tier videos include a small watermark which is removed on any paid plan.",
  },
  {
    question: "How long can generated videos be?",
    answer:
      "Individual clips can be up to 60 seconds. You can chain multiple clips together using our timeline editor to create longer-form content. Enterprise plans support extended generation up to 5 minutes per clip.",
  },
  {
    question: "Is there an API for developers?",
    answer:
      "Yes. We offer a RESTful API with SDKs for Python, Node.js, and Go. The API supports all generation modes (text-to-video, image-to-video, reference-based), webhooks for completion events, and batch processing.",
  },
  {
    question: "What about content safety and moderation?",
    answer:
      "All prompts and outputs pass through our multi-layer safety system including prompt analysis, frame-level content classification, and human review for flagged content. We maintain strict content policies aligned with industry standards.",
  },
];

function FAQItem({
  faq,
  isOpen,
  toggle,
}: {
  faq: (typeof faqs)[0];
  index: number;
  isOpen: boolean;
  toggle: () => void;
}) {
  return (
    <div className="border-b border-cinema-border/60 last:border-b-0">
      <button
        onClick={toggle}
        className="flex items-start justify-between w-full py-5 text-left group"
        aria-expanded={isOpen}
      >
        <span className="text-body-lg font-medium text-white group-hover:text-amber-400 transition-colors duration-200 pr-4">
          {faq.question}
        </span>
        <span className="mt-1 shrink-0 w-6 h-6 rounded-full border border-cinema-border flex items-center justify-center text-muted-text-2 group-hover:border-cinema-border-hover group-hover:text-white transition-colors duration-200">
          {isOpen ? <Minus size={14} /> : <Plus size={14} />}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" as const }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-body-md text-muted-text-1 leading-relaxed max-w-3xl">
              {faq.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-60px" });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-28 sm:py-36 bg-cinema-dark">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cinema-border to-transparent" />

      <div ref={sectionRef} className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <p className="text-label uppercase text-amber-400 mb-4">FAQ</p>
          <h2 className="text-display-md text-white">
            Frequently asked questions
          </h2>
        </motion.div>

        {/* FAQ items */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="rounded-2xl border border-cinema-border bg-cinema-card/30 px-6 sm:px-8"
        >
          {faqs.map((faq, i) => (
            <FAQItem
              key={faq.question}
              faq={faq}
              index={i}
              isOpen={openIndex === i}
              toggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
