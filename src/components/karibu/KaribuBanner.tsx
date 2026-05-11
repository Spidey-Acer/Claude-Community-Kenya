"use client";

import { useEffect, useState } from "react";
import { useAudience } from "@/contexts/AudienceContext";
import type { Audience } from "@/lib/karibu/types";

const LABELS: Record<Audience, string> = {
  dev: "developers",
  non_tech_pro: "professionals",
  student: "students",
  founder: "founders",
  creator: "creators",
};

const SESSION_KEY = "cck-karibu-banner-shown";

/**
 * Post-onboarding confirmation banner. Shown ONCE per browser session
 * after Karibu completes; tracks via sessionStorage. Auto-dismisses
 * after 8s or on user click. Renders nothing if no audience is set.
 */
export function KaribuBanner() {
  const { audience } = useAudience();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!audience) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    setVisible(true);
    sessionStorage.setItem(SESSION_KEY, "1");
    const t = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(t);
  }, [audience]);

  if (!visible || !audience) return null;

  return (
    <div
      className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-2xl"
      role="status"
      aria-live="polite"
    >
      <div className="bg-gradient-to-r from-green-primary/12 to-green-primary/[0.04] border border-green-primary/30 rounded-lg px-4 py-3 flex justify-between items-center font-sans text-sm text-text-primary">
        <span>
          <span className="text-green-primary mr-2">✓</span>
          Personalized for{" "}
          <strong className="text-green-primary">{LABELS[audience]}</strong>. Not right?{" "}
          <a href="/account/data" className="text-green-primary underline">
            Change
          </a>
        </span>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Dismiss notice"
          className="text-text-dim text-xs hover:text-text-primary"
        >
          ×
        </button>
      </div>
    </div>
  );
}
