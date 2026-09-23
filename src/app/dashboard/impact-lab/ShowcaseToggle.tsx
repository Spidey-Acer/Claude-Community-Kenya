"use client";

import { useState } from "react";
import { csrfHeaders } from "@/lib/csrf-client";

/**
 * The team's own control over whether their write-up shows on the public
 * Projects tab — the member-facing half of `ResultsSnapshot.showcase`
 * (results.ts). Self-contained fetch, same shape as `TeamReveal`'s
 * check-in button: local state seeded from the page's own initial payload,
 * confirmed (never assumed) after the write.
 *
 * `initialOn`/`initialBy` come from `MemberResultsPayload.yourTeam.showcase`
 * — always present whenever `yourTeam` is (`buildMemberPayload` sets it on
 * every branch), so this never has to guess a starting state.
 */
export function ShowcaseToggle({
  cohort,
  initialOn,
  initialBy,
}: {
  cohort?: string;
  initialOn: boolean;
  initialBy: "team" | "organiser" | null;
}) {
  const [on, setOn] = useState(initialOn);
  const [by, setBy] = useState(initialBy);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !on;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/impact-lab/showcase", {
        method: "POST",
        headers: await csrfHeaders(),
        body: JSON.stringify({ cohort, showcase: next }),
      });
      const json: { success?: boolean; error?: string } = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Could not save your preference.");
      }
      setOn(next);
      // The write just came from this team, whatever it was set to before —
      // an organiser's earlier "on" is superseded the moment the team
      // touches this switch themselves.
      setBy("team");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your preference.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-sm text-text-primary">
            Show our write-up and code on the event page
          </p>
          <p className="mt-1 font-mono text-xs leading-relaxed text-text-dim">
            Your project name, track and team always show. This adds your
            description, your review and your links.
          </p>
          {on && by === "organiser" && (
            <p className="mt-1 font-mono text-xs text-amber">
              Turned on by the organisers after your reply. You can turn it off.
            </p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Show our write-up and code on the event page"
          disabled={busy}
          onClick={() => void toggle()}
          className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-primary disabled:opacity-40 motion-reduce:transition-none ${
            on
              ? "border-green-primary/50 bg-green-primary/20"
              : "border-border-default bg-bg-card"
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform motion-reduce:transition-none ${
              on ? "translate-x-[22px] bg-green-primary" : "translate-x-0.5 bg-text-dim"
            }`}
          />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 font-mono text-xs text-red">
          {error}
        </p>
      )}
    </div>
  );
}
