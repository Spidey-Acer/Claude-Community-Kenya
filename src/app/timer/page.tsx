import type { Metadata } from "next";
import { TimerCountdown } from "./TimerCountdown";

/**
 * Projector countdown for the Impact Lab build window.
 *
 * Deliberately unlinked from the navigation and excluded from search: this is a
 * room display for one night, not part of the site's information architecture.
 *
 * The deadline defaults to 3:00 PM East Africa Time today and can be overridden
 * per-load with `?at=` (an ISO string, or `HH:MM` for today), so a slipped
 * schedule is a URL change rather than a deploy — which is the difference
 * between fixing the clock in ten seconds and fixing it in ten minutes.
 */
export const metadata: Metadata = {
  title: "Time remaining | Impact Lab",
  description: "Countdown to submissions close.",
  robots: { index: false, follow: false },
};

/** East Africa Time is UTC+3 year-round — no DST to account for. */
const EAT_OFFSET = "+03:00";
const DEFAULT_CLOSE = "15:00";

/**
 * Resolve the deadline to an offset-bearing ISO string. Anything unparseable
 * falls back to the default rather than rendering an invalid clock.
 */
function resolveDeadline(at: string | undefined): string {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Africa/Nairobi",
  });

  if (at) {
    const hhmm = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(at.trim());
    if (hhmm) {
      const hh = hhmm[1].padStart(2, "0");
      return `${today}T${hh}:${hhmm[2]}:00${EAT_OFFSET}`;
    }
    if (!Number.isNaN(new Date(at).getTime())) return at;
  }

  return `${today}T${DEFAULT_CLOSE}:00${EAT_OFFSET}`;
}

export default async function TimerPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string; label?: string }>;
}) {
  const { at, label } = await searchParams;
  const deadlineIso = resolveDeadline(at);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-6 py-16">
      <div className="mb-10 flex items-center gap-3">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-primary" />
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-text-dim sm:text-sm">
          Impact Lab · AI Mashinani
        </span>
      </div>

      <TimerCountdown
        deadlineIso={deadlineIso}
        label={label?.slice(0, 60) || "Time left to submit"}
      />

      <footer className="mt-16 font-mono text-[11px] uppercase tracking-[0.3em] text-text-dim">
        Claude Community Kenya
      </footer>
    </main>
  );
}
