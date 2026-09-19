import type { Metadata } from "next";
import { TimerCountdown } from "./TimerCountdown";

/**
 * Projector countdown for the Impact Lab build window.
 *
 * Deliberately unlinked from the navigation and excluded from search: this is a
 * room display for one night, not part of the site's information architecture.
 *
 * The deadline comes entirely from `?at=` (an ISO string, or `HH:MM` for
 * today), so a slipped schedule is a URL change rather than a deploy — the
 * difference between fixing the clock in ten seconds and fixing it in ten
 * minutes. With no `?at=` the page says there is no session rather than
 * inventing one.
 *
 * The eyebrow comes from `?title=` for the same reason: the page serves every
 * event, so no event's name is hardcoded in it.
 */
export const metadata: Metadata = {
  title: "Time remaining | Claude Community Kenya",
  description: "Countdown to submissions close.",
  robots: { index: false, follow: false },
};

/** East Africa Time is UTC+3 year-round — no DST to account for. */
const EAT_OFFSET = "+03:00";

/**
 * Resolve the deadline to an offset-bearing ISO string, or null when the
 * caller gave us nothing usable.
 *
 * There is deliberately no default. A default of "3pm today" meant this page
 * rendered a live, authoritative-looking countdown every day forever, counting
 * down to a time that stopped meaning anything the night the event ended.
 * A room display with no session to display should say so.
 */
function resolveDeadline(at: string | undefined): string | null {
  if (!at) return null;

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Africa/Nairobi",
  });

  const hhmm = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(at.trim());
  if (hhmm) {
    const hh = hhmm[1].padStart(2, "0");
    return `${today}T${hh}:${hhmm[2]}:00${EAT_OFFSET}`;
  }
  if (!Number.isNaN(new Date(at).getTime())) return at;

  return null;
}

export default async function TimerPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string; label?: string; title?: string }>;
}) {
  const { at, label, title } = await searchParams;
  const deadlineIso = resolveDeadline(at);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg-primary px-6 py-16">
      {/*
        The kit's hand-drawn globe, turning behind the clock. Drawn in black on
        transparent, so it is inverted to read on the dark room background and
        held faint enough that the digits stay the only thing the room reads.
        A GIF cannot pause, so reduced-motion viewers get no globe at all.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF; next/image would freeze it */}
      <img
        src="/images/event-globe.gif"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(110vh,110vw)] w-auto max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.14] invert select-none motion-reduce:hidden"
      />

      <div className="relative z-10 mb-10 flex items-center gap-3">
        {deadlineIso && (
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-primary" />
        )}
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-text-dim sm:text-sm">
          {title?.slice(0, 80) || "Claude Community Kenya"}
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-center">
      {deadlineIso ? (
        <TimerCountdown
          deadlineIso={deadlineIso}
          label={label?.slice(0, 60) || "Time left to submit"}
        />
      ) : (
        <div className="text-center">
          <p className="font-mono text-2xl font-bold text-text-primary sm:text-4xl">
            No active session
          </p>
          <p className="mx-auto mt-4 max-w-md font-mono text-sm leading-relaxed text-text-dim">
            Set a deadline to start the clock — <code>?at=15:00</code> for a
            time today, or <code>?at=</code> a full ISO timestamp.
          </p>
        </div>
      )}
      </div>

      <footer className="relative z-10 mt-16 font-mono text-[11px] uppercase tracking-[0.3em] text-text-dim">
        Claude Community Kenya
      </footer>
    </main>
  );
}
