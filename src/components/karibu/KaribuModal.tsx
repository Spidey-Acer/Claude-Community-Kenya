"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { KaribuConversation } from "./KaribuConversation";
import { KaribuSkipButton } from "./KaribuSkipButton";

/**
 * Full-screen Karibu onboarding modal.
 *
 * Mounts ~800ms after page paint with a soft entry choreography
 * (background dim + radial glow + scale-up). Honors prefers-reduced-motion
 * by skipping all animation. Focus trap on first focusable element.
 *
 * The modal exits on either skip (POST /api/karibu/skip) or completion
 * (Claude tool call sets cck-audience cookie). In both cases the page
 * reloads so server-rendered personalization picks up the new cookie.
 */
export function KaribuModal() {
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setOpen(true), reduce ? 0 : 800);
    return () => clearTimeout(t);
  }, [reduce]);

  useEffect(() => {
    if (!open || !containerRef.current) return;
    const first = containerRef.current.querySelector<HTMLElement>(
      'button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
  }, [open]);

  function handleSkip() {
    // Best-effort persist of the skip — if it fails we still close the modal
    // for this visit. The server will re-show it on next page load if the
    // visitor's cookie/DB record wasn't updated, which is the safe fallback.
    fetch("/api/karibu/skip", {
      method: "POST",
      body: "{}",
      headers: { "Content-Type": "application/json" },
    }).catch((err) => {
      console.error("[karibu] skip persist failed:", err);
    });
    setExiting(true);
    setTimeout(() => {
      window.location.reload();
    }, reduce ? 0 : 400);
  }

  function handleComplete() {
    setExiting(true);
    setTimeout(() => {
      window.location.reload();
    }, reduce ? 0 : 400);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to Claude Community Kenya"
          initial={reduce ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.3 }}
        >
          <div className="absolute inset-0 bg-bg-primary/85 backdrop-blur-sm" />
          {!reduce && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 50% 40%, rgba(0,255,65,0.08) 0%, transparent 50%)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
          <motion.div
            ref={containerRef}
            className="relative w-[88%] max-w-[680px] max-h-[85vh] overflow-hidden bg-bg-primary/95 border border-green-primary/20 rounded-2xl shadow-[0_30px_80px_rgba(0,255,65,0.1)] flex flex-col"
            initial={reduce ? { scale: 1, y: 0 } : { scale: 0.96, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: "easeOut" }}
          >
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Image
                  src="/images/cck-logo-wordmark.webp"
                  alt="Claude Community Kenya"
                  width={24}
                  height={24}
                  className="rounded"
                />
                <span className="font-sans text-sm text-text-primary font-medium">
                  Claude Community Kenya
                </span>
              </div>
              <KaribuSkipButton onSkip={handleSkip} />
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <KaribuConversation onComplete={handleComplete} />
            </div>
            <div className="flex justify-between px-5 py-2.5 border-t border-white/[0.04] font-mono text-[10px] text-text-dim/60">
              <span>
                Press <span className="border border-border-default px-1.5 rounded">esc</span> to skip
              </span>
              <span className="text-green-primary/60">● powered by Claude Haiku 4.5</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
