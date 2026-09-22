/**
 * Pure helpers behind EventTabs — hash <-> tab id mapping and the roving-
 * focus arrow-key math. Split out from the component so they can be unit-
 * tested without a DOM (this repo's vitest config runs in `node`, no
 * testing-library — see vitest.config.ts).
 */

/**
 * Maps `location.hash` to one of `ids`, falling back to `defaultId` when the
 * hash is empty, unrecognized, or names a tab this event doesn't have (e.g.
 * `#judges` on an event with no judges panel, or `#projects` before any
 * project has been published). `#results` and `#winners` both mean the
 * winners tab — `KaribuWinnersSection` renders `id="results"`, but "winners"
 * is the tab id. Every other tab id (`about`, `projects`, `judges`) maps to
 * itself — no further remapping needed.
 */
export function tabIdFromHash(hash: string, ids: string[], defaultId: string): string {
  const clean = hash.replace(/^#/, "").toLowerCase();
  const wanted = clean === "results" ? "winners" : clean;
  return ids.includes(wanted) ? wanted : defaultId;
}

export type TabArrowKey = "ArrowLeft" | "ArrowRight" | "Home" | "End";

/**
 * Roving-tabindex index math for the tablist's keyboard handling. `key` is
 * the key pressed, `current` the focused tab's index, `count` the number of
 * tabs. Left/Right wrap around; Home/End jump to the ends. Any other key
 * returns `current` unchanged.
 */
export function nextIndex(key: string, current: number, count: number): number {
  if (count <= 0) return 0;
  switch (key) {
    case "ArrowLeft":
      return (current - 1 + count) % count;
    case "ArrowRight":
      return (current + 1) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return current;
  }
}
