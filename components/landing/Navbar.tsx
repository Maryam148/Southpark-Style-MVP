"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Product", href: "#showcase" },
  { label: "Features", href: "#features" },
  { label: "Templates", href: "#templates" },
  { label: "Community", href: "#community" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" as const }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-cinema-black/80 backdrop-blur-xl border-b border-cinema-border/50"
            : "bg-transparent"
        }`}
      >
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/landing" className="flex items-center gap-2.5 group">
              <div className="relative h-8 w-8 rounded-lg bg-gradient-cinematic flex items-center justify-center">
                <span className="text-cinema-black font-bold text-sm">S</span>
                <div className="absolute inset-0 rounded-lg bg-gradient-cinematic opacity-0 group-hover:opacity-50 blur-lg transition-opacity duration-300" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-white">
                Studio<span className="text-amber-400">AI</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-3.5 py-2 text-body-sm text-muted-text-1 hover:text-white rounded-lg hover:bg-white/5 transition-colors duration-200"
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              <a
                href="#"
                className="px-3.5 py-2 text-body-sm text-muted-text-1 hover:text-white transition-colors duration-200"
              >
                Sign in
              </a>
              <a
                href="#"
                className="relative inline-flex items-center px-5 py-2 text-body-sm font-medium text-cinema-black bg-gradient-cinematic rounded-lg hover:brightness-110 transition-all duration-200 hover:shadow-[0_0_24px_hsla(36,100%,50%,0.3)]"
              >
                Get Started Free
              </a>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-muted-text-1 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 bg-cinema-black/95 backdrop-blur-xl border-b border-cinema-border/50 md:hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2.5 text-body-md text-muted-text-1 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 mt-3 border-t border-cinema-border/50 space-y-2">
                <a
                  href="#"
                  className="block px-3 py-2.5 text-body-md text-muted-text-1 hover:text-white transition-colors"
                >
                  Sign in
                </a>
                <a
                  href="#"
                  className="block text-center px-5 py-2.5 text-body-sm font-medium text-cinema-black bg-gradient-cinematic rounded-lg"
                >
                  Get Started Free
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
