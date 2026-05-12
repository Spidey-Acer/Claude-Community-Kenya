"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useAudience } from "@/contexts/AudienceContext";
import { AUDIENCE_LABELS } from "@/lib/karibu/types";

const SESSION_KEY = "cck-karibu-banner-shown";
const AUTO_DISMISS_MS = 8000;

/**
 * Post-onboarding confirmation toast. Renders bottom-right (bottom-center on
 * mobile) so it never overlaps the hero. Shown once per browser session,
 * auto-dismisses after ~8s with a visible progress strip, and pauses on hover.
 * The "Change" action resets the Karibu session and reloads the page.
 */
export function KaribuBanner() {
  const { audience } = useAudience();
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [resetting, setResetting] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!audience) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setVisible(true);
    sessionStorage.setItem(SESSION_KEY, "1");
  }, [audience]);

  useEffect(() => {
    if (!visible || paused) return;
    const t = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [visible, paused]);

  async function handleChange() {
    setResetting(true);
    try {
      await fetch("/api/karibu/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      window.location.reload();
    } catch {
      setResetting(false);
    }
  }

  if (!audience) return null;
  const label = AUDIENCE_LABELS[audience].toLowerCase() + "s";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onHoverStart={() => setPaused(true)}
          onHoverEnd={() => setPaused(false)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-40 w-[92%] sm:w-auto sm:max-w-md"
          role="status"
          aria-live="polite"
        >
          <div className="relative overflow-hidden bg-bg-secondary border border-green-primary/30 rounded-lg shadow-[0_8px_32px_rgba(0,255,65,0.12)]">
            <div className="px-4 py-3 flex items-center gap-3 font-sans text-sm text-text-primary">
              <span className="text-green-primary text-base" aria-hidden="true">
                ✓
              </span>
              <span className="flex-1 min-w-0">
                Personalized for{" "}
                <strong className="text-green-primary">{label}</strong>.{" "}
                <button
                  type="button"
                  onClick={handleChange}
                  disabled={resetting}
                  className="text-green-primary underline underline-offset-2 hover:text-amber transition-colors disabled:opacity-50"
                >
                  {resetting ? "Resetting…" : "Change"}
                </button>
              </span>
              <button
                type="button"
                onClick={() => setVisible(false)}
                aria-label="Dismiss notice"
                className="shrink-0 -mr-1 h-11 w-11 flex items-center justify-center text-text-dim hover:text-text-primary transition-colors"
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  ×
                </span>
              </button>
            </div>
            {!prefersReducedMotion && (
              <motion.div
                key={paused ? "paused" : "running"}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: paused ? 1 : 0 }}
                transition={{
                  duration: paused ? 0 : AUTO_DISMISS_MS / 1000,
                  ease: "linear",
                }}
                style={{ transformOrigin: "left" }}
                className="absolute bottom-0 left-0 h-0.5 w-full bg-green-primary/40"
                aria-hidden="true"
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
