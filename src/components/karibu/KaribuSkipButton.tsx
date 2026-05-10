"use client";

import { useEffect } from "react";

/**
 * Skip button for the Karibu modal. Also installs a window-level ESC key
 * handler so pressing Escape anywhere triggers the same skip flow.
 * The handler is removed when the component unmounts.
 */
export function KaribuSkipButton({ onSkip }: { onSkip: () => void }) {
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onSkip();
      }
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onSkip]);

  return (
    <button
      type="button"
      onClick={onSkip}
      className="font-mono text-xs text-text-dim border border-border-default hover:border-text-secondary hover:text-text-secondary px-2.5 py-1.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-green-primary"
      aria-label="Skip onboarding and continue to the site"
    >
      Skip and explore →
    </button>
  );
}
