"use client";

import { useState, useEffect } from "react";
import { useSkin } from "@/contexts/SkinContext";
import { cn } from "@/lib/utils";
import { ChatPanel } from "./ChatPanel";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle } from "lucide-react";

const WIDGET_OPEN_KEY = "cck-chat-open";

function DevCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center font-mono text-green-dim transition-all hover:text-red"
      aria-label="Close chat"
      title="Close"
    >
      <span className="text-xs opacity-60 group-hover:opacity-100">[x]</span>
    </button>
  );
}

function ProCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group absolute right-2.5 top-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-text-dim/20 transition-all hover:bg-red/30"
      aria-label="Close chat"
      title="Close"
    >
      <svg className="h-2.5 w-2.5 text-text-secondary group-hover:text-red" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M2 2l6 6M8 2l-6 6" />
      </svg>
    </button>
  );
}

export function ChatWidget() {
  const { skin, isLoaded } = useSkin();
  const [isOpen, setIsOpen] = useState(false);
  const isDev = skin === "dev";

  // Restore open state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WIDGET_OPEN_KEY);
      if (stored === "true") setIsOpen(true);
    } catch {
      // ignore
    }
  }, []);

  // Persist open state
  useEffect(() => {
    try {
      localStorage.setItem(WIDGET_OPEN_KEY, String(isOpen));
    } catch {
      // ignore
    }
  }, [isOpen]);

  if (!isLoaded) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={cn(
              "relative flex flex-col overflow-hidden shadow-2xl",
              "w-[calc(100vw-2rem)] sm:w-[360px] max-w-[420px]",
              "h-[calc(100vh-7rem)] sm:h-[480px] max-h-[600px]",
              isDev
                ? "rounded border border-green-primary/30 bg-bg-primary"
                : "rounded-2xl border border-border-default bg-bg-primary/95 backdrop-blur-md"
            )}
          >
            {isDev ? (
              <DevCloseButton onClick={() => setIsOpen(false)} />
            ) : (
              <ProCloseButton onClick={() => setIsOpen(false)} />
            )}

            <ChatPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble */}
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        aria-label={isOpen ? "Close chat" : "Open chat"}
        className={cn(
          "relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors",
          isDev
            ? "bg-bg-card border border-green-primary/40 text-green-primary hover:bg-green-primary/10"
            : "bg-[#d97757] text-white hover:bg-[#c06848] shadow-[#d97757]/20"
        )}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "text-lg font-bold leading-none",
                isDev ? "font-mono" : ""
              )}
            >
              {isDev ? "x" : "\u00D7"}
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle className="h-5 w-5" />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Dev pulse ring */}
        {isDev && !isOpen && (
          <span className="absolute inset-0 animate-ping rounded-full border border-green-primary/30" />
        )}

        {/* Pro glow */}
        {!isDev && !isOpen && (
          <span className="absolute -inset-1 rounded-full bg-[#d97757]/20 blur-md" />
        )}
      </motion.button>
    </div>
  );
}
