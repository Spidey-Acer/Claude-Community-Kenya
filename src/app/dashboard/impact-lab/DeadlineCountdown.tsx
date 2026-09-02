"use client";

/**
 * Live countdown to the submission deadline, pinned above the Impact Lab stack.
 *
 * Two things make this worth a component rather than a static "2h left" string:
 * it counts against the server's clock (venue phones are routinely minutes out,
 * and a fast clock tells a team they have no time when they do), and it re-reads
 * the deadline every minute, so an organiser who extends the window reaches every
 * screen without anyone reloading. It renders nothing it cannot vouch for — no
 * deadline, or a failed first load, means no card, never a blocked page.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  countdownTone,
  describeRemaining,
  formatRemaining,
  type CountdownTone,
} from "./countdown-format";

/** How often the digits advance. */
const TICK_MS = 1_000;
/** How often the deadline itself is re-read, so an extension propagates. */
const REFETCH_MS = 60_000;
/** Pulse the digits only inside this much time — the last minute. */
const PULSE_WINDOW_MS = 60_000;

/**
 * Fired once when the countdown crosses zero, so the submission form can flip
 * itself read-only without a reload. `SubmitProject` listens for it.
 */
export const SUBMISSIONS_CLOSED_EVENT = "cck:submissions-closed";

interface WindowResponse {
  success?: boolean;
  status?: "no_team" | "open" | "closed";
  closeAt?: string | null;
  serverNow?: string;
}

/** Card and digit classes per colour state, using the dashboard's own tokens. */
const TONE_STYLES: Record<CountdownTone, { card: string; digits: string }> = {
  calm: { card: "border-border-default", digits: "text-text-primary" },
  warn: { card: "border-amber/40 bg-amber/5", digits: "text-amber" },
  urgent: { card: "border-[#ff3333]/40 bg-[#ff3333]/5", digits: "text-[#ff3333]" },
  closed: { card: "border-border-default", digits: "text-text-dim" },
};

/** "4:00 pm" in the reader's own timezone — the card only renders client-side. */
function localCloseTime(closeAt: string): string {
  return new Date(closeAt)
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .toLowerCase();
}

export function DeadlineCountdown({ cohort }: { cohort?: string }) {
  const cohortQuery = cohort ? `?cohort=${encodeURIComponent(cohort)}` : "";
  const [closeAt, setCloseAt] = useState<string | null>(null);
  /** Server time minus local time, so a wrong device clock cancels out. */
  const [offsetMs, setOffsetMs] = useState(0);
  /** The server's own verdict; it can close the window before `closeAt`. */
  const [serverClosed, setServerClosed] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  /** The close event is announced once per mount, not once per tick. */
  const announcedClose = useRef(false);
  /** Whether this mount ever saw an open window — the thing that can close. */
  const wasOpen = useRef(false);

  const loadWindow = useCallback(async () => {
    try {
      const res = await fetch(`/api/impact-lab/submission${cohortQuery}`);
      const json: WindowResponse = await res.json();
      // A failed refetch keeps the deadline already on screen: one blip of
      // venue wifi must not blank a running clock for everyone watching it.
      if (!res.ok || !json.success || !json.closeAt) return;
      setCloseAt(json.closeAt);
      setServerClosed(json.status === "closed");
      setOffsetMs(json.serverNow ? Date.parse(json.serverNow) - Date.now() : 0);
    } catch {
      // Same reason: stay on the last known deadline rather than disappear.
    }
  }, [cohortQuery]);

  // First read, then a visibility-aware poll. A backgrounded tab on a phone has
  // its timers throttled anyway; skipping the fetch keeps a pocketed screen
  // from hammering the endpoint on wake.
  useEffect(() => {
    // The deadline lives on the server, so the first read has to happen on
    // mount; every setState below runs in the fetch continuation, not inline.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- subscribe-on-mount, state is set after the await
    void loadWindow();
    const poll = setInterval(() => {
      if (!document.hidden) void loadWindow();
    }, REFETCH_MS);
    return () => clearInterval(poll);
  }, [loadWindow]);

  useEffect(() => {
    if (!closeAt) return;
    const deadline = Date.parse(closeAt);
    if (Number.isNaN(deadline)) return;

    const tick = () => setRemaining(deadline - (Date.now() + offsetMs));
    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [closeAt, offsetMs]);

  const closed = serverClosed || (remaining !== null && remaining <= 0);

  // Announce the crossing, not the state: a page opened after the deadline
  // fires nothing, because there is no open form to flip.
  useEffect(() => {
    if (remaining === null) return;
    if (remaining > 0) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current || announcedClose.current) return;
    announcedClose.current = true;
    window.dispatchEvent(new CustomEvent(SUBMISSIONS_CLOSED_EVENT));
  }, [remaining]);

  if (!closeAt || remaining === null) return null;

  const tone: CountdownTone = closed ? "closed" : countdownTone(remaining);
  const styles = TONE_STYLES[tone];
  const pulsing = !closed && remaining > 0 && remaining <= PULSE_WINDOW_MS;

  return (
    <section
      aria-label="Submission deadline"
      className={`w-full rounded-lg border bg-bg-secondary p-4 sm:p-5 ${styles.card}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-x-6">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim">
            {"// ./submission-window"}
          </p>
          <p className="mt-1.5 font-mono text-sm text-text-secondary">
            {closed
              ? "Submissions are closed"
              : `Submissions close at ${localCloseTime(closeAt)}`}
          </p>
        </div>

        <div className="min-w-0">
          <p
            aria-hidden="true"
            className={`font-mono tabular-nums text-4xl font-bold leading-none break-normal sm:text-5xl ${styles.digits} ${
              pulsing ? "motion-safe:animate-pulse" : ""
            }`}
          >
            {formatRemaining(closed ? 0 : remaining)}
          </p>
          <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-text-dim">
            {closed ? "submissions are closed" : "left to submit"}
          </p>
        </div>
      </div>

      {/* Minute-resolution, so a screen reader is not read a new number every
          second. The string only changes about once a minute, so React leaves
          the live region untouched in between. */}
      <span aria-live="polite" className="sr-only">
        {describeRemaining(closed ? 0 : remaining)}
      </span>
    </section>
  );
}
