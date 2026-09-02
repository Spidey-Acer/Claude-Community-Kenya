/**
 * Pure formatting for the submission-deadline countdown.
 *
 * Kept out of the component so the digits and the colour states can be tested
 * without a DOM: on submission day the clock is the one thing on the dashboard
 * that must be right, and a rendering test would not prove the arithmetic.
 */

const SECOND_MS = 1_000;
const MINUTE_MS = 60_000;

/** At or under this much time left the card turns amber. */
export const WARN_THRESHOLD_MS = 30 * MINUTE_MS;
/** At or under this much time left the card turns red. */
export const URGENT_THRESHOLD_MS = 10 * MINUTE_MS;

/** How the countdown card should look at a given remaining time. */
export type CountdownTone = "calm" | "warn" | "urgent" | "closed";

/**
 * Remaining milliseconds as a clock string: `MM:SS` under an hour, otherwise
 * `H:MM:SS` with unpadded hours (`2:41:09`, `10:00:00`).
 *
 * Rounds up, so the display reads `00:01` for the whole final second and hits
 * `00:00` at the same instant the window actually closes — rounding down would
 * show a zeroed clock next to a label still saying "left to submit".
 *
 * @param ms Milliseconds until the deadline; zero or negative means closed.
 * @returns The clock string; `"00:00"` once the deadline has passed.
 */
export function formatRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "00:00";

  const totalSeconds = Math.ceil(ms / SECOND_MS);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  const paddedSeconds = String(seconds).padStart(2, "0");
  if (hours === 0) return `${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
  return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
}

/**
 * The colour state for a given remaining time.
 *
 * @param ms Milliseconds until the deadline.
 * @returns `"closed"` at or past the deadline, then `"urgent"`, `"warn"`, `"calm"`.
 */
export function countdownTone(ms: number): CountdownTone {
  if (!Number.isFinite(ms) || ms <= 0) return "closed";
  if (ms <= URGENT_THRESHOLD_MS) return "urgent";
  if (ms <= WARN_THRESHOLD_MS) return "warn";
  return "calm";
}

/**
 * Screen-reader text for the countdown, deliberately minute-resolution so an
 * `aria-live` region announces roughly once a minute instead of every tick.
 *
 * @param ms Milliseconds until the deadline.
 * @returns A short spoken-language description of the time left.
 */
export function describeRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "Submissions are closed";
  if (ms < MINUTE_MS) return "Less than a minute left to submit";

  const totalMinutes = Math.ceil(ms / MINUTE_MS);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} left to submit`;
  const hourPart = `${hours} ${hours === 1 ? "hour" : "hours"}`;
  if (minutes === 0) return `${hourPart} left to submit`;
  return `${hourPart} ${minutes} ${minutes === 1 ? "minute" : "minutes"} left to submit`;
}

