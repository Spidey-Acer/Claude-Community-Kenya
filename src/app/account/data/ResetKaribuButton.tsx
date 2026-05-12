"use client";

import { useState } from "react";

/**
 * Sends a POST to /api/karibu/reset then hard-reloads the page so the
 * server component re-reads the (now absent) audience cookie.
 */
export function ResetKaribuButton() {
  const [pending, setPending] = useState(false);

  async function handleReset() {
    setPending(true);
    try {
      await fetch("/api/karibu/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } finally {
      window.location.reload();
    }
  }

  return (
    <button
      onClick={handleReset}
      disabled={pending}
      className="rounded border border-green-primary/40 bg-green-primary/10 px-4 py-2 font-mono text-sm text-green-primary transition-colors hover:bg-green-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Resetting…" : "Reset Karibu onboarding"}
    </button>
  );
}
