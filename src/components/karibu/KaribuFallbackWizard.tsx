"use client";

import { useState } from "react";
import { AUDIENCES } from "@/lib/karibu/types";
import type { Audience, Experience } from "@/lib/karibu/types";

const AUDIENCE_LABELS: Record<Audience, string> = {
  dev: "I write code",
  non_tech_pro: "I use Claude for work",
  student: "I'm a student",
  founder: "I'm a founder",
  creator: "Just curious",
};

const EXPERIENCE_LABELS: Record<Experience, string> = {
  never_used: "Never used Claude",
  claude_ai: "Used Claude.ai",
  claude_code: "Used Claude Code",
  api_builder: "Built with the API",
};

/**
 * Two-step scripted fallback for when the live Claude API can't be reached.
 *
 * Captures audience + experience via chip selection, posts the result to
 * /api/karibu/skip with a `scripted` body so the cookie is set and the
 * onboarding session is recorded the same as a real conversation.
 */
export function KaribuFallbackWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<"audience" | "experience" | "submitting">("audience");
  const [audience, setAudience] = useState<Audience | null>(null);

  async function submit(experience: Experience) {
    setStep("submitting");
    await fetch("/api/karibu/skip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scripted: { audience, experience } }),
    });
    onComplete();
  }

  return (
    <div className="space-y-4">
      <p className="text-text-primary text-sm">
        Karibu! Two quick taps and we&apos;ll point you to the right corner of the community:
      </p>
      {step === "audience" && (
        <div className="space-y-2">
          <p className="text-text-secondary text-xs">Step 1 of 2 — What brings you here?</p>
          {AUDIENCES.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => {
                setAudience(a);
                setStep("experience");
              }}
              className="block w-full text-left border border-border-default hover:border-green-primary text-text-primary px-3 py-2 rounded transition-colors"
            >
              {AUDIENCE_LABELS[a]}
            </button>
          ))}
        </div>
      )}
      {step === "experience" && (
        <div className="space-y-2">
          <p className="text-text-secondary text-xs">Step 2 of 2 — Have you used Claude before?</p>
          {(Object.keys(EXPERIENCE_LABELS) as Experience[]).map((exp) => (
            <button
              key={exp}
              type="button"
              onClick={() => submit(exp)}
              className="block w-full text-left border border-border-default hover:border-green-primary text-text-primary px-3 py-2 rounded transition-colors"
            >
              {EXPERIENCE_LABELS[exp]}
            </button>
          ))}
        </div>
      )}
      {step === "submitting" && <p className="text-text-secondary">Saving...</p>}
    </div>
  );
}
