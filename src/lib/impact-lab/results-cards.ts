/**
 * The Build Day cards as the member results page shows them: the viewer's
 * own cards (one per honour, as on the public page) and the winners as
 * cards (the overall podium row, then the track winners row).
 *
 * Pure: the public card URL needs the signing secret, so the caller (the
 * member results route) passes a `cardUrlFor` that resolves it, and this
 * module only decides which teams, which honour of each and what caption.
 * Nothing here reads a score — every input is the published snapshot's own
 * public fact (announced winners, score-order ranks, track placings).
 */

import { cardHonours, isChampion, overallRunnersUp, placementFor, placementTitle, type Honour } from "./result-card"
import type { ResultsSnapshot } from "./results"

/** One card on the winners rows. `imageUrl` is `null` when no card URL can be derived (no signing secret). */
export interface WinnerCardCell {
  teamId: string
  projectName: string
  /** "Champion", "Second overall", "1st place", "Delight winner": the terminal-label caption before the project name. */
  caption: string
  /** The square PNG of the honour this cell stands for, or `null`. */
  imageUrl: string | null
}

export interface WinnerCards {
  /** Champion, second overall, third overall (champion mode); the announced podium (podium mode); empty in tracks mode. */
  podium: WinnerCardCell[]
  /** One per track winner, in track order. */
  tracks: WinnerCardCell[]
}

/** The viewer's own cards, one per honour, exactly as the public page lists them. */
export interface YourTeamCards {
  /** The public card page, absolute. */
  url: string
  honours: Pick<Honour, "kind" | "label" | "slug" | "placingLine">[]
}

const ORDINALS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" }
function ordinal(rank: number): string {
  return ORDINALS[rank] ?? `${rank}th`
}

/** The card copy input for one team off the snapshot, or `null` when the snapshot does not rank it. */
function copyInputFor(snapshot: ResultsSnapshot, teamId: string, eventName: string) {
  const placement = placementFor(snapshot, teamId)
  if (!placement) return null
  return {
    title: placementTitle(placement),
    champion: isChampion(snapshot, teamId),
    track: placement.track,
    eventName,
    overallRank: placement.kind === "ranked" ? placement.overallRank : null,
  }
}

/** `${cardUrl}/card/square`, plus `?honour=<i>` past the primary, or `null` without a card URL. */
function squareImageUrl(cardUrl: string | null, honourIndex: number): string | null {
  if (cardUrl === null || honourIndex < 0) return null
  return honourIndex === 0 ? `${cardUrl}/card/square` : `${cardUrl}/card/square?honour=${honourIndex}`
}

function cell(
  snapshot: ResultsSnapshot,
  eventName: string,
  cardUrlFor: (teamId: string) => string | null,
  team: { teamId: string; projectName: string },
  caption: string,
  kind: Honour["kind"]
): WinnerCardCell {
  const input = copyInputFor(snapshot, team.teamId, eventName)
  const index = input ? cardHonours(input).findIndex((h) => h.kind === kind) : -1
  return {
    teamId: team.teamId,
    projectName: team.projectName,
    caption,
    imageUrl: squareImageUrl(cardUrlFor(team.teamId), index),
  }
}

/**
 * The winners as cards. Champion mode: the champion, then second and third
 * in score order (`overallRunnersUp`, the same source as the email strip
 * and the hero pill), then the track winners. Podium mode: the announced
 * podium as 1st/2nd/3rd, then the track winners. Tracks mode: the track
 * winners alone. A team on both rows appears twice, each time with the
 * card of that honour (the champion's track card is its second card).
 */
export function buildWinnerCards(
  snapshot: ResultsSnapshot,
  eventName: string,
  cardUrlFor: (teamId: string) => string | null
): WinnerCards {
  const mode = snapshot.announcementMode ?? "podium"
  const podium: WinnerCardCell[] = []
  if (mode === "champion") {
    const champion = snapshot.overall[0]
    if (champion) podium.push(cell(snapshot, eventName, cardUrlFor, champion, "Champion", "champion"))
    for (const w of overallRunnersUp(snapshot)) {
      podium.push(
        cell(snapshot, eventName, cardUrlFor, w, w.rank === 2 ? "Second overall" : "Third overall", w.rank === 2 ? "second-overall" : "third-overall")
      )
    }
  } else if (mode === "podium") {
    for (const w of snapshot.overall) {
      // The podium's first place is its track's winner too, and that gold
      // card is the one it gets; second and third overall have their own.
      const kind: Honour["kind"] = w.rank === 1 ? "track-winner" : w.rank === 2 ? "second-overall" : w.rank === 3 ? "third-overall" : "built"
      podium.push(cell(snapshot, eventName, cardUrlFor, w, `${ordinal(w.rank)} place`, kind))
    }
  }
  const tracks = [...snapshot.trackWinners]
    .sort((a, b) => a.track.localeCompare(b.track))
    .map((w) => cell(snapshot, eventName, cardUrlFor, w, `${w.track} winner`, "track-winner"))
  return { podium, tracks }
}

/**
 * The viewer's own cards: every honour its card carries, for a team the
 * snapshot ranks; `null` for an unranked team, a team the snapshot does
 * not mention, or when no card URL can be derived.
 */
export function buildYourTeamCards(
  snapshot: ResultsSnapshot,
  teamId: string,
  eventName: string,
  cardUrl: string | null
): YourTeamCards | null {
  if (cardUrl === null) return null
  const placement = placementFor(snapshot, teamId)
  if (placement?.kind !== "ranked") return null
  const input = copyInputFor(snapshot, teamId, eventName)
  if (!input) return null
  return {
    url: cardUrl,
    honours: cardHonours(input).map((h) => ({ kind: h.kind, label: h.label, slug: h.slug, placingLine: h.placingLine })),
  }
}
