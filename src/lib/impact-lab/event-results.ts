/**
 * The public winners section on an event page, as data.
 *
 * Pure. Given a published `ResultsSnapshot` it decides exactly what the
 * public event page may show: the podium row and the track winners row as
 * cards (the same rows `buildWinnerCards` gives the dashboard), each linking
 * to that team's public card page, plus the organiser commendations. Nothing
 * else leaves the snapshot: no ranking, no scores, no non-winning teams
 * beyond a commendation that names one, and never an attendance figure.
 */

import { buildWinnerCards, type WinnerCardCell } from "./results-cards"
import type { ResultsSnapshot } from "./results"

export interface EventWinnerCard extends WinnerCardCell {
  /** The team's public card page (relative), or null when no card URL can be derived. */
  href: string | null
}

export interface EventCommendation {
  projectName: string
  text: string
}

export interface EventResults {
  /** Champion, second, third (or the announced podium). Empty in tracks mode. */
  podium: EventWinnerCard[]
  /** One per track winner, in track order. */
  tracks: EventWinnerCard[]
  /** In ranking order, then the unranked; a commendation for a team the snapshot does not name is dropped. */
  commendations: EventCommendation[]
  /** "20 September 2026", the day the results email went out (Nairobi time). */
  emailedOn: string
}

/** ISO publish instant as a Nairobi calendar date, "20 September 2026". Falls back to the raw string. */
export function publishDateLine(publishedAt: string): string {
  const at = new Date(publishedAt)
  if (Number.isNaN(at.getTime())) return publishedAt
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  }).format(at)
}

/**
 * Commendations with the project they belong to. Team names come only from
 * rows the snapshot already publishes (`ranking`, then `unranked`), so a
 * commendation keyed to a team the snapshot never mentions is not shown.
 */
export function eventCommendations(snapshot: ResultsSnapshot): EventCommendation[] {
  const map = snapshot.commendations ?? {}
  const named = [...snapshot.ranking, ...(snapshot.unranked ?? [])]
  const out: EventCommendation[] = []
  for (const row of named) {
    const text = map[row.teamId]?.trim()
    // The name is trimmed too: the line prints it immediately before a full
    // stop, where a stored trailing space reads as a typo.
    if (text) out.push({ projectName: row.projectName.trim(), text })
  }
  return out
}

/**
 * Everything the section renders. `cardPathFor` resolves a team's public
 * card page (the caller supplies it because the slug needs the signing
 * secret); `null` means no cards, and the cells fall back to their captions.
 */
export function buildEventResults(
  snapshot: ResultsSnapshot,
  eventName: string,
  cardPathFor: (teamId: string) => string | null
): EventResults {
  const withHref = (cell: WinnerCardCell): EventWinnerCard => ({ ...cell, href: cardPathFor(cell.teamId) })
  const cards = buildWinnerCards(snapshot, eventName, cardPathFor)
  return {
    podium: cards.podium.map(withHref),
    tracks: cards.tracks.map(withHref),
    commendations: eventCommendations(snapshot),
    emailedOn: publishDateLine(snapshot.publishedAt),
  }
}
