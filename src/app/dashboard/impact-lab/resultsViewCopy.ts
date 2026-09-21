/**
 * Pure copy helpers for ResultsView.tsx's mode-aware sentences.
 *
 * Split out from the component so the string logic is unit testable on its
 * own, the same way `placingBasisLabel` (export-excel.ts) is. The component
 * itself is rendered to static markup under vitest's "node" environment in
 * `ResultsView.test.ts` (react-dom/server needs no DOM), which covers the
 * layout; these tests cover the words.
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
 * The label shown beside a team's own project name — "2nd of 19 overall"
 * for every scored team, or "Took part" for a team with no card.
 *
 * The team's own position in score order is shown to that team in every
 * announcement mode (Build Day ruling, 2026-09-21): it is their own
 * standing, stated as a position among the `ofRanked` scored teams, never
 * as a score. `decidedByNote` below still says what the panel announced
 * and what was ranked by score, so the two together stay true.
 */
export function yourTeamOverallLabel(hasCard: boolean, rank: number, ofRanked: number): string {
  if (!hasCard) return "Took part";
  return `${ordinal(rank)} of ${ofRanked} overall`;
}

/** "2nd of 6 in Delight": the team's placing within its track, the same count `placementFor` makes. */
export function yourTeamTrackLabel(position: number, of: number, track: string): string {
  return `${ordinal(position)} of ${of} in ${track}`;
}

/**
 * The page header's subtitle. Once results are published it says so to
 * everyone, and names the viewer's own project when they are on a ranked
 * team; before that, the live event's prompt or the closed event's record
 * line as before. `projectName` is only ever a ranked team's — the caller
 * passes `null` for an unranked or absent team, so the subtitle never
 * promises a result the page does not show.
 */
export function resultsSubtitle(input: {
  cohortActive: boolean;
  published: boolean;
  projectName: string | null;
}): string {
  if (input.published) {
    return input.projectName ? `Results are in. Here is how ${input.projectName} did.` : "Results are in.";
  }
  return input.cohortActive
    ? "Complete your matching profile, then check back here for your team."
    : "The event has wrapped — this is your record of it.";
}

/**
 * The one line an unranked viewer sees in place of "your team": only when
 * they had a team (a team that never reached the ranking did not submit,
 * or was not scored); a member with no team is told nothing, since there
 * is nothing to explain.
 */
export function didNotSubmitLine(hadTeam: boolean): string | null {
  return hadTeam ? "Your team did not submit, so it is not ranked." : null;
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
