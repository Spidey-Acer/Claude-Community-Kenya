"use client";

import { useState } from "react";

/**
 * Footer link that resets the visitor's onboarding so they can
 * re-run Karibu. POSTs /api/karibu/reset and reloads the page.
 */
export function PersonalizeFooterLink() {
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    try {
      await fetch("/api/karibu/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className="font-mono text-xs text-text-dim hover:text-green-primary transition-colors underline-offset-4 hover:underline disabled:opacity-50"
    >
      {busy ? "Resetting..." : "Personalize ↻"}
    </button>
  );
}
