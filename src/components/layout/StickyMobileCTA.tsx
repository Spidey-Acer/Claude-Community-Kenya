"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSkin } from "@/contexts/SkinContext";

const STORAGE_KEY = "cck-mobile-cta-dismissed";
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Sticky mobile bottom CTA. Visible only on mobile (<md), only in Pro mode.
 *
 * Behaviour:
 *   - Hidden until visitor has scrolled ~30% of the page (past the hero capture
 *     form so we don't double up).
 *   - Hidden again once the visitor reaches ~85% (footer newsletter is in view).
 *   - User can dismiss with the × button; choice persists in localStorage so we
 *     don't pester returning visitors.
 *   - Scrolls to the hero capture form when tapped (single tap = email focus).
 */
export function StickyMobileCTA() {
  const { skin, isLoaded } = useSkin();
  const isPro = skin === "pro";
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const wasDismissed = localStorage.getItem(STORAGE_KEY) === "1";
    setDismissed(wasDismissed);

    if (wasDismissed) return;

    function onScroll() {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? scrollY / docHeight : 0;
      setVisible(pct > 0.3 && pct < 0.85);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function dismiss() {
    setDismissed(true);
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "1");
  }

  function scrollToCapture() {
    const input = document.getElementById("hero-email");
    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => (input as HTMLInputElement).focus(), 600);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (!isLoaded || !isPro || dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
          role="region"
          aria-label="Get event invites"
        >
          <div className="mx-3 mb-3 flex items-center gap-2 rounded-full border border-[#3a3a37] bg-[#1e1e1d]/95 p-1.5 shadow-[0_-8px_30px_rgba(0,0,0,0.5),0_0_0_1px_rgba(217,119,87,0.08)] backdrop-blur-md">
            <button
              type="button"
              onClick={scrollToCapture}
              className="btn-primary-shadow flex-1 rounded-full bg-[#d97757] py-2.5 text-[13px] font-semibold text-[#faf9f5] transition-all hover:bg-[#c06848]"
            >
              Get event invites →
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#9a9890] transition-colors hover:bg-[#252524] hover:text-[#b0aea5]"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ×
              </span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
