/**
 * Impact Lab public recap — the story of one cohort, told with nothing that
 * leaks.
 *
 * Pure and dependency-free (no Prisma, no Next), like `result-card.ts` and
 * `results.ts`, so the privacy shape can be asserted with a fixture. Every
 * field on `PublicRecap` is named explicitly rather than spread from a
 * snapshot or an export row, for the same reason `toPublicResultCard` and
 * `buildMemberPayload` build field-by-field: a field added to the snapshot
 * or the export later must not leak onto this page by default.
 *
 * What may appear here: team names as their project names, track names, a
 * track's own declared problem, and the event's own numbers. No scores, no
 * averages, no judge names or notes, no participant names, no submission
 * write-ups, no links (repo/demo/slides/video) — every one of those lives in
 * the private export and the team's own dashboard, never on a page anyone
 * can open.
 */

import type { ResultsSnapshot, ResultsTrackWinner } from "./results"
import type { Track } from "./tracks"

export interface PublicRecapEvent {
  name: string
  /** The event's own human-authored dates string (e.g. "Wed 2 Sep 2026"), never reformatted. */
  dates: string
  /** Null when no linked public Event resolved — see `findLinkedPublicEvent`. */
  venue: string | null
  city: string | null
  /** `/events/[slug]` when a linked public Event resolved, else null — never a guessed link. */
  eventHref: string | null
}

export interface PublicRecapNumbers {
  checkedIn: number
  /**
   * Whether `checkedIn` is an organiser's own recorded door count rather than
   * the platform's self-service check-in count. Two systems can run at once
   * and the site's own only ever counts someone who tapped its own check-in
   * link — see `publicCheckedIn`. The page must render a recorded count with
   * a trailing "+" and the site's own count labelled "checked in on site",
   * never the reverse.
   */
  checkedInIsRecorded: boolean
  teamsFormed: number
  projectsSubmitted: number
  judges: number
  tracksCount: number
}

export interface PublicRecapTrack {
  key: string
  label: string
  englishName: string | null
  /** The problem statement an organiser wrote for this track, or null when none was ever authored. */
  problem: string | null
  description: string | null
}

export interface PublicRecapWinner {
  track: string
  projectName: string
  /** A word, never a number — see `basisLabel`. */
  basisLabel: string
}

export interface PublicRecapChampion {
  projectName: string
}

export interface PublicRecap {
  cohort: string
  publishedAt: string
  event: PublicRecapEvent
  numbers: PublicRecapNumbers
  tracks: PublicRecapTrack[]
  /** Null in `"tracks"` mode (no overall placing was ever announced) or before publication. */
  champion: PublicRecapChampion | null
  trackWinners: PublicRecapWinner[]
}

/**
 * Whether the room's check-in figure is an organiser's own recorded door
 * count or the platform's own self-service count.
 *
 * Mirrors the rule the (unmerged, at time of writing) `checkedInIsRecorded`
 * in `export-data.ts` establishes for the PDF/Excel exports: an override,
 * when one exists, is presented as plain attendance; without one, the site's
 * own count — partial by construction, since it only sees someone who
 * tapped its own check-in link — is labelled as what it is, never dressed up
 * as the room's full attendance. Kept as an independent, two-line rule here
 * rather than imported, because `main` does not carry that field yet.
 */
export function publicCheckedIn(
  siteCount: number,
  recordedCount: number | null
): { checkedIn: number; checkedInIsRecorded: boolean } {
  return recordedCount !== null
    ? { checkedIn: recordedCount, checkedInIsRecorded: true }
    : { checkedIn: siteCount, checkedInIsRecorded: false }
}

/** A track's basis for words a reader can trust — never the number behind it. */
export function basisLabel(basis: ResultsTrackWinner["basis"]): string {
  switch (basis) {
    case "announced":
      return "Announced by the panel"
    case "score":
      return "Highest score in its track"
    case "organiser":
      return "Organiser's decision"
  }
}

/** The event's own tracks, with only the participant-facing guide copy carried through. */
export function publicRecapTracks(tracks: Track[]): PublicRecapTrack[] {
  return tracks.map((t) => ({
    key: t.key,
    label: t.label,
    englishName: t.englishName ?? null,
    problem: t.problem ?? null,
    description: t.description ?? null,
  }))
}

/**
 * The overall champion, or null. `"tracks"` mode has no overall placing —
 * `snapshot.overall` is already `[]` there (see `results.ts`'s module doc
 * comment) — and `"podium"`/`"champion"` mode both put the champion at
 * `overall`'s rank 1. Only the champion is surfaced here: the public page
 * tells the room's own three-track story, not a full podium.
 */
export function championFromSnapshot(snapshot: ResultsSnapshot): PublicRecapChampion | null {
  const winner = snapshot.overall.find((w) => w.rank === 1)
  return winner ? { projectName: winner.projectName } : null
}

/** One winner per track, in track order, each carrying its basis as a word. */
export function trackWinnersFromSnapshot(snapshot: ResultsSnapshot): PublicRecapWinner[] {
  return snapshot.trackWinners
    .map((w) => ({ track: w.track, projectName: w.projectName, basisLabel: basisLabel(w.basis) }))
    .sort((a, b) => a.track.localeCompare(b.track))
}
