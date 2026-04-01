"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import type { Persona } from "@/contexts/PersonaContext";
import { ParticleCanvas } from "@/components/persona/ParticleCanvas";

interface PersonaSelectorModalProps {
  onSelect: (persona: Persona) => void;
}

export function PersonaSelectorModal({ onSelect }: PersonaSelectorModalProps) {
  const [hoveredSide, setHoveredSide] = useState<Persona | null>(null);
  const [selectedSide, setSelectedSide] = useState<Persona | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  const handleSelect = (persona: Persona) => {
    setSelectedSide(persona);
    setIsExiting(true);
  };

  const handleParticlesComplete = () => {
    if (selectedSide) {
      onSelect(selectedSide);
    }
  };

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion) {
    return (
      <div
        className="fixed inset-0 z-[200] flex"
        role="dialog"
        aria-modal="true"
        aria-label="Choose your experience"
      >
        <button
          className="flex flex-1 flex-col items-center justify-center bg-bg-primary"
          onClick={() => onSelect("dev")}
          aria-label="Enter as Developer"
        >
          <span className="font-mono text-sm text-green-primary/50">$ whoami</span>
          <span className="mt-2 font-mono text-2xl font-bold text-green-primary">&gt;_</span>
          <span className="mt-2 font-mono text-xl font-bold text-green-primary">Developer</span>
          <span className="mt-2 text-sm text-text-dim">I write code. Show me the terminal.</span>
        </button>
        <div className="w-px bg-border-default" />
        <button
          className="flex flex-1 flex-col items-center justify-center bg-[#111]"
          onClick={() => onSelect("pro")}
          aria-label="Enter as Professional"
        >
          <span className="font-mono text-sm text-amber/50">Welcome</span>
          <span className="mt-2 text-2xl text-amber">&#9670;</span>
          <span className="mt-2 font-mono text-xl font-bold text-amber">Professional</span>
          <span className="mt-2 text-sm text-text-dim">I use Claude for work. Keep it clean.</span>
        </button>
      </div>
    );
  }

  return (
    <>
    <AnimatePresence>
      {!isExiting || selectedSide ? (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col sm:flex-row"
          role="dialog"
          aria-modal="true"
          aria-label="Choose your experience"
          initial={{ opacity: 0 }}
          animate={{ opacity: isExiting ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: isExiting ? 0.8 : 0.3 }}
        >
          {/* CCK Logo — top center */}
          <motion.div
            className="absolute left-1/2 top-8 z-10 -translate-x-1/2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            <Image
              src="/images/Claude Community Kenya.png"
              alt="Claude Community Kenya"
              width={64}
              height={64}
              className="rounded-lg"
            />
          </motion.div>

          {/* Developer Side */}
          <motion.button
            className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-bg-primary transition-[flex] duration-200 ease-out"
            style={{
              flex: hoveredSide === "dev" ? 1.08 : hoveredSide === "pro" ? 0.92 : 1,
            }}
            onClick={() => handleSelect("dev")}
            onMouseEnter={() => setHoveredSide("dev")}
            onMouseLeave={() => setHoveredSide(null)}
            aria-label="Enter as Developer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-primary/5 to-transparent" />

            <motion.span
              className="relative font-mono text-sm text-green-primary/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              $ whoami
            </motion.span>
            <motion.span
              className="relative mt-3 font-mono text-4xl text-green-primary"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, duration: 0.3 }}
            >
              &gt;_
            </motion.span>
            <motion.span
              className="relative mt-3 font-mono text-2xl font-bold text-green-primary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              Developer
            </motion.span>
            <motion.span
              className="relative mt-2 text-sm text-text-dim"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.08 }}
            >
              I write code. Show me the terminal.
            </motion.span>
            <motion.div
              className="relative mt-6 space-y-1 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.16 }}
            >
              <p className="font-mono text-xs text-green-primary/40">$ cat README.md</p>
              <p className="font-mono text-xs text-green-primary/40">$ git log --oneline</p>
              <p className="font-mono text-xs text-green-primary/40">$ ls projects/ -la</p>
            </motion.div>
          </motion.button>

          {/* Center Divider — Desktop */}
          <motion.div
            className="z-10 hidden sm:block"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ originY: 0.5 }}
          >
            <div
              className="h-full w-px transition-shadow duration-200"
              style={{
                backgroundColor: hoveredSide === "dev" ? "#00ff41" : hoveredSide === "pro" ? "#ffb000" : "#333",
                boxShadow:
                  hoveredSide === "dev"
                    ? "0 0 12px rgba(0,255,65,0.4)"
                    : hoveredSide === "pro"
                      ? "0 0 12px rgba(255,176,0,0.4)"
                      : "none",
              }}
            />
          </motion.div>

          {/* Center Divider — Mobile */}
          <motion.div
            className="z-10 sm:hidden"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <div
              className="h-px w-full transition-shadow duration-200"
              style={{
                backgroundColor: hoveredSide === "dev" ? "#00ff41" : hoveredSide === "pro" ? "#ffb000" : "#333",
                boxShadow:
                  hoveredSide === "dev"
                    ? "0 0 12px rgba(0,255,65,0.4)"
                    : hoveredSide === "pro"
                      ? "0 0 12px rgba(255,176,0,0.4)"
                      : "none",
              }}
            />
          </motion.div>

          {/* Professional Side */}
          <motion.button
            className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#111] transition-[flex] duration-200 ease-out"
            style={{
              flex: hoveredSide === "pro" ? 1.08 : hoveredSide === "dev" ? 0.92 : 1,
            }}
            onClick={() => handleSelect("pro")}
            onMouseEnter={() => setHoveredSide("pro")}
            onMouseLeave={() => setHoveredSide(null)}
            aria-label="Enter as Professional"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            transition={{ delay: 0.4, duration: 0.4, ease: "easeOut" }}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-amber/5 to-transparent" />

            <motion.span
              className="relative font-mono text-sm text-amber/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Welcome
            </motion.span>
            <motion.span
              className="relative mt-3 text-4xl text-amber"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, duration: 0.3 }}
            >
              &#9670;
            </motion.span>
            <motion.span
              className="relative mt-3 font-mono text-2xl font-bold text-amber"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              Professional
            </motion.span>
            <motion.span
              className="relative mt-2 text-sm text-text-dim"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.08 }}
            >
              I use Claude for work. Keep it clean.
            </motion.span>
            <motion.div
              className="relative mt-6 space-y-1 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.16 }}
            >
              <p className="font-mono text-xs text-amber/40">Our Story</p>
              <p className="font-mono text-xs text-amber/40">Milestones</p>
              <p className="font-mono text-xs text-amber/40">Community Projects</p>
            </motion.div>
          </motion.button>

          {/* Footer */}
          <motion.p
            className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 font-sans text-xs text-text-dim/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3 }}
          >
            You can switch anytime
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
    {isExiting && selectedSide && (
      <ParticleCanvas selected={selectedSide} onComplete={handleParticlesComplete} />
    )}
    </>
  );
}
