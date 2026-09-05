/**
 * Pure copy helpers for ResultsView.tsx's mode-aware sentences.
 *
 * Split out from the component (which renders under vitest's "node"
 * environment — no jsdom/testing-library in this repo, so a component-render
 * test isn't practical here) purely so the string logic itself is unit
 * testable, the same way `announcementHeadline` (preview-email/route.ts) and
 * `placingBasisLabel` (export-excel.ts) are.
 *
 * The bug both functions guard against: `results.overall` is `[]` both in
 * "tracks" mode (one winner per track, no overall podium at all) and when a
 * podium run announced zero winners, but a team's own `card.rank` is always
 * populated (pure score order in either case) — printing "Nth overall" or
 * talking about "the top three" from that rank alone, with no check on
 * whether an overall placing was ever actually announced, states a fact
 * (a podium was called) that may never have happened.
 */

const ORDINALS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };

/** Matches ResultsView.tsx's own `ordinal` — kept in sync by shared use, not by re-export. */
function ordinal(rank: number): string {
  return ORDINALS[rank] ?? `${rank}th`;
}

/**
 * The label shown beside a team's own project name — e.g. "3rd overall",
 * "Took part", or `null` (rendered nothing) for a scored team when no
 * overall ranking was ever announced. Never claims an overall placing that
 * was not announced; the caller still has the team's track name to show
 * alongside whatever this returns (or on its own, when this is `null`).
 */
export function yourTeamOverallLabel(
  hasCard: boolean,
  hasAnnouncedOverall: boolean,
  rank: number
): string | null {
  if (!hasCard) return "Took part";
  if (!hasAnnouncedOverall) return null;
  return `${ordinal(rank)} overall`;
}

/**
 * The closing "how these results were decided" paragraph. Four distinct true
 * statements, chosen by what was actually announced — never "the top three"
 * when only a single champion was announced (or there was no overall podium
 * at all), and credits the panel's own discussion only for the placings that
 * discussion actually produced.
 *
 * `announcementMode` defaults to `"podium"` so every existing caller (and the
 * "top three" / "no overall podium" wording those tests hold in place) keeps
 * its exact behaviour untouched — only `"champion"` gets a fourth branch.
 */
export function decidedByNote(
  hasAnnouncedOverall: boolean,
  hasAnnouncedTrackWinner: boolean,
  announcementMode: "podium" | "tracks" | "champion" = "podium"
): string {
  if (announcementMode === "champion" && hasAnnouncedOverall) {
    return (
      "The champion was decided by the judging panel after they had seen the demos and discussed " +
      "the projects together — and so was each track's own winner, in the same conversation. " +
      "Every other team is ranked below them on score."
    );
  }
  if (hasAnnouncedOverall) {
    return (
      "The top three were decided by the judging panel after they had seen the demos and discussed " +
      "the projects together. That conversation is what those placings reflect. Every other team is " +
      "ranked below them on score."
    );
  }
  if (hasAnnouncedTrackWinner) {
    return (
      "There was no overall podium at this event — the panel named a winner in some tracks after " +
      "seeing the demos and discussing the projects together, and those placings reflect that " +
      "conversation. Every other track's winner, and every other team, is ranked by score."
    );
  }
  return (
    "There was no overall podium at this event. Every track's winner, and every other team, is ranked " +
    "purely by score."
  );
}
