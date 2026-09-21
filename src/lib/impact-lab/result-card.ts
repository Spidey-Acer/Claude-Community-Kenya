/**
 * Impact Lab result cards — the facts a team may show the world.
 *
 * Two things live here, both pure (no Prisma, no Next) so `email.ts` can
 * import them and vitest can assert them:
 *
 * 1. `placementFor` — where a team finished within its own track, read off
 *    the published snapshot. This is what the results email leads with
 *    ("Winner · Kilimo: Nitapata?") and what the public card prints.
 * 2. `resultCardSlug` — the non-guessable token in the public card URL.
 *    Derived (HMAC of run + team under a server secret) rather than stored,
 *    so nothing new is written to the database and a token cannot be
 *    enumerated from a team id.
 *
 * Everything on the public card is placement, names and the event. Scores,
 * ranges, judge notes and reviews never leave the private email/dashboard —
 * `toPublicResultCard` builds its object field by field for the same reason
 * `buildMemberPayload` does: a field added to the snapshot later must not
 * leak by default.
 */

import { createHmac } from "node:crypto"
import type { ResultsSnapshot } from "./results"

/** Track placings that get the celebratory hero. Everything below is "built". */
export const PODIUM_DEPTH = 3

export type Placement =
  | {
      kind: "ranked"
      track: string
      /** 1-based position within `track`. 1 is always the published track winner. */
      position: number
      /** How many ranked teams share this track. */
      of: number
      /** The team's overall rank across all tracks (the snapshot's `rank`). */
      overallRank: number
      /** True when the panel announced this team as an overall winner in the room. */
      announced: boolean
    }
  | {
      /** Took part, never scored — no position, no rank. */
      kind: "participant"
      track: string
    }

// `placementFor` lives in results.ts (which client components import and
// which must stay free of `node:crypto`); it is re-exported here so every
// caller keeps its import.
export { placementFor } from "./results"

/** The headline a placement earns. Podium places get their title; everyone else built. */
export function placementTitle(placement: Placement | null): string {
  if (placement?.kind === "ranked") {
    if (placement.position === 1) return "Winner"
    if (placement.position === 2) return "Runner-up"
    if (placement.position === 3) return "Third place"
  }
  return "Built"
}

/** True for the three track placings that get the celebratory variant. */
export function isPodium(placement: Placement | null): placement is Extract<Placement, { kind: "ranked" }> {
  return placement?.kind === "ranked" && placement.position <= PODIUM_DEPTH
}

// ─── Slug ────────────────────────────────────────────────────────────────────

/**
 * The secret the slug is derived under. The auth secret is what production
 * already trusts; CSRF_SECRET is the fallback for a dev box. There is no
 * further fallback on purpose — a public URL token derived from a constant
 * would be guessable, so with no secret configured there are no cards at
 * all (the email omits the share link and the page 404s).
 */
export function resultCardSecret(): string | null {
  return process.env.AUTH_SECRET || process.env.CSRF_SECRET || null
}

const SLUG_LENGTH = 24

/**
 * Deterministic, non-guessable slug for one team's card in one run.
 * 24 base64url characters of an HMAC-SHA256 — 144 bits, stored nowhere.
 */
export function resultCardSlug(runId: string, teamId: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`impact-lab-result-card:${runId}:${teamId}`)
    .digest("base64url")
    .slice(0, SLUG_LENGTH)
}

/** Cheap pre-check so the page can 404 malformed slugs without touching the database. */
export function looksLikeResultCardSlug(slug: string): boolean {
  return /^[A-Za-z0-9_-]{24}$/.test(slug)
}

// ─── Public card ─────────────────────────────────────────────────────────────

/** What the public card and its OG image may print. Nothing else. */
export interface PublicResultCard {
  eventName: string
  /** The event's own `dates` string, verbatim (e.g. "Wed 2 Sep 2026"). */
  eventDates: string
  projectName: string
  track: string
  /** "Winner" | "Runner-up" | "Third place" | "Built" */
  title: string
  /**
   * True only for the single overall champion of a `"champion"`-mode
   * announcement (`snapshot.overall[0]`). A champion is also its track's
   * winner (`title` stays "Winner", see `buildTrackWinners`), so this flag
   * is what lets the card read "Champion" rather than "Delight winner". Never
   * true under the podium or tracks modes — see `isChampion`.
   */
  champion: boolean
  /**
   * The team's overall position across all tracks in score order (the
   * snapshot's `rank`), or `null` for a team that took part unscored. A
   * position, not a score: Build Day's ruling is that second and third
   * overall are announced facts a card may print.
   */
  overallRank: number | null
  /** "Jane K." style — first name plus last initial, never a full surname. */
  members: string[]
}

/**
 * Whether `teamId` is the announced overall champion. Only a `"champion"`-mode
 * snapshot names one: its `overall` holds exactly that team at rank 1 (see
 * `ResultsInput.announcementMode`). A podium-mode rank 1 is a podium place,
 * announced as such, and keeps its "Winner" wording.
 */
export function isChampion(snapshot: ResultsSnapshot, teamId: string): boolean {
  return (snapshot.announcementMode ?? "podium") === "champion" && snapshot.overall[0]?.teamId === teamId
}

/**
 * The teams ranked second and third in score order (`snapshot.ranking`
 * rows 2 and 3), shaped like announced winners so the email's winners
 * strip can seat them beside the champion. The same source as the hero's
 * "2nd overall" pill and the card's "SECOND OVERALL" line — Build Day
 * ruling, 2026-09-21: the overall position is an announced fact.
 */
export function overallRunnersUp(snapshot: Pick<ResultsSnapshot, "ranking">): { rank: number; teamId: string; projectName: string }[] {
  return snapshot.ranking
    .filter((r) => r.rank === 2 || r.rank === 3)
    .sort((a, b) => a.rank - b.rank)
    .map((r) => ({ rank: r.rank, teamId: r.teamId, projectName: r.projectName }))
}

/**
 * One name token as it should print: "simon" → "Simon", "JOSEPH" →
 * "Joseph", "McHaro" → "McHaro". Only an all-lowercase or all-uppercase
 * token is re-cased; anything with mixed case was typed deliberately and
 * is left alone.
 */
function titleCaseToken(token: string): string {
  const letters = token.replace(/[^\p{L}]/gu, "")
  const uniform = letters === letters.toLowerCase() || letters === letters.toUpperCase()
  if (!uniform) return token
  return token[0].toUpperCase() + token.slice(1).toLowerCase()
}

/**
 * A typed name, title-cased token by token, for the greeting and anywhere
 * a participant's name is printed in full. Whitespace-tolerant.
 */
export function titleCaseName(fullName: string): string {
  return fullName.trim().split(/\s+/).filter(Boolean).map(titleCaseToken).join(" ")
}

/**
 * "Wanjiru Kamau" → "Wanjiru K.", "JOSEPH MACHARIA" → "Joseph M."; a
 * single-token name stays whole. Participants type their own names, so
 * each token goes through `titleCaseToken` — "simon" on a public poster
 * reads as a typo.
 */
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean).map(titleCaseToken)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

/**
 * "Table 36 · Kilimo 3", or just "Table 36" when the team is named after
 * its table (organisers rename teams to "Table N" once tables are fixed,
 * which otherwise printed "Table 36 · Table 36"), or just the name when
 * the run predates tables. Empty when there is neither.
 */
export function teamPlaceLabel(table: number | null, teamName: string, track?: string | null): string {
  let name = teamName.trim().replace(/\s+/g, " ")
  const tableLabel = table !== null ? `Table ${table}` : null
  if (tableLabel !== null) {
    // "Table 40 · Everyday" (the rename-by-table-and-track form) carries the
    // table in its own name; keep only the track so it never prints
    // "Table 40 · Table 40 · Everyday" (Build Day 2026-09-20).
    const prefix = `${tableLabel} · `
    if (name.toLowerCase().startsWith(prefix.toLowerCase())) name = name.slice(prefix.length).trim()
    if (name.toLowerCase() === tableLabel.toLowerCase()) name = ""
  }
  // When what is left is just the track and the caller already prints the
  // track next to this label, drop it: "Everyday track · Table 32", not
  // "Everyday track · Table 32 · Everyday" (results email, same event).
  if (track && name.toLowerCase() === track.trim().toLowerCase()) name = ""
  return [tableLabel, name === "" ? null : name]
    .filter((s): s is string => s !== null)
    .join(" · ")
}

export function toPublicResultCard(input: {
  eventName: string
  eventDates: string
  projectName: string
  placement: Placement
  /** From `isChampion`. Defaults to false: the claim must be earned. */
  champion?: boolean
  memberFullNames: string[]
}): PublicResultCard {
  return {
    eventName: input.eventName,
    eventDates: input.eventDates,
    projectName: input.projectName,
    track: input.placement.track,
    title: placementTitle(input.placement),
    champion: input.champion === true,
    overallRank: input.placement.kind === "ranked" ? input.placement.overallRank : null,
    members: input.memberFullNames.map(shortName).filter((n) => n !== ""),
  }
}

// ─── Card copy ───────────────────────────────────────────────────────────────

/** The fields the card's copy reads. `overallRank` may be absent on a legacy caller. */
export type CardCopyInput = Pick<PublicResultCard, "title" | "champion" | "track" | "eventName"> &
  Partial<Pick<PublicResultCard, "overallRank">>

export type HonourKind =
  | "champion"
  | "track-winner"
  | "second-overall"
  | "third-overall"
  | "track-runner-up"
  | "track-third"
  | "built"

/**
 * One thing a team may print a card for. A team with two honours (the
 * champion also won its track; a track winner also placed third overall)
 * gets one card per honour, in `cardHonours` order — Build Day ruling,
 * 2026-09-21: "since they win also a track, shouldn't we put up two cards
 * for them?"
 */
export interface Honour {
  kind: HonourKind
  /** Which of the four card surfaces this honour prints on. */
  surface: CardStyle["kind"]
  /** The placing line, in the poster's caps: "CHAMPION", "DELIGHT WINNER", "THIRD OVERALL". */
  placingLine: string
  /** The smaller line under the placing, or `null`: the track placing on an overall card. */
  subline: string | null
  /** Sentence case, for a heading beside the second card and beyond: "third overall", "Delight winner". */
  label: string
  /** Filename fragment: "champion", "everyday-winner", "third-overall". */
  slug: string
}

function fileSlug(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "result"
  )
}

/**
 * Every honour a card may print, in this order: champion; track winner;
 * second overall; third overall. A team with none of those gets its track
 * runner-up or third place, and a team with nothing at all gets "built".
 * A pure lookup over `title` + `champion` + `overallRank` + `track` — the
 * placing itself is `placementFor`'s and is not re-derived here. The
 * first honour is the primary card: the one the OG image, the email hero
 * and the routes without an `honour` index render.
 *
 * A track runner-up who is second overall gets the overall card only (its
 * track placing becomes that card's subline); a track winner who is third
 * overall gets both, because each is its own announced fact.
 */
export function cardHonours(card: CardCopyInput): Honour[] {
  const track = card.track.trim()
  const TRACK = track.toUpperCase()
  const honours: Honour[] = []

  if (card.champion) {
    honours.push({ kind: "champion", surface: "winner", placingLine: "CHAMPION", subline: null, label: "champion", slug: "champion" })
  }
  if (card.title === "Winner") {
    honours.push({
      kind: "track-winner",
      surface: "winner",
      placingLine: `${TRACK} WINNER`,
      subline: null,
      label: `${track} winner`,
      slug: fileSlug(`${track} winner`),
    })
  }
  if (card.overallRank === 2 || card.overallRank === 3) {
    // The track placing beneath, or the track alone when the team holds no
    // podium place there (a track winner's win has its own card above).
    const subline =
      card.title === "Runner-up" ? `Runner-up in ${track}` : card.title === "Third place" ? `Third in ${track}` : track ? `${track} track` : null
    honours.push(
      card.overallRank === 2
        ? { kind: "second-overall", surface: "runner-up", placingLine: "SECOND OVERALL", subline, label: "second overall", slug: "second-overall" }
        : { kind: "third-overall", surface: "third", placingLine: "THIRD OVERALL", subline, label: "third overall", slug: "third-overall" }
    )
  }
  if (honours.length > 0) return honours

  if (card.title === "Runner-up") {
    return [{ kind: "track-runner-up", surface: "runner-up", placingLine: `RUNNER-UP IN ${TRACK}`, subline: null, label: `runner-up in ${track}`, slug: fileSlug(`runner-up ${track}`) }]
  }
  if (card.title === "Third place") {
    return [{ kind: "track-third", surface: "third", placingLine: `THIRD IN ${TRACK}`, subline: null, label: `third in ${track}`, slug: fileSlug(`third ${track}`) }]
  }
  return [{ kind: "built", surface: "built", placingLine: `BUILT AT ${cardEventShortName(card.eventName)}`, subline: null, label: "built", slug: "built" }]
}

/** The primary honour's placing line — "CHAMPION", "DELIGHT WINNER", "SECOND OVERALL", "BUILT AT BUILD DAY". */
export function cardPlacingLine(card: CardCopyInput): string {
  return cardHonours(card)[0].placingLine
}

/** The primary honour's subline, or `null`. */
export function cardSubline(card: CardCopyInput): string | null {
  return cardHonours(card)[0].subline
}

/**
 * The `?honour=` query value as an index into `cardHonours`: `null` or
 * empty means the primary card; a whole number is that honour; anything
 * else is `undefined` (the caller answers 400). Range is the caller's
 * check, since it needs the card.
 */
export function parseHonourIndex(raw: string | null): number | undefined {
  if (raw === null || raw.trim() === "") return 0
  return /^\d{1,2}$/.test(raw.trim()) ? Number(raw.trim()) : undefined
}

/**
 * The event as the built card names it: "BUILD DAY" for any Build Day
 * edition (the poster's own format line), otherwise the event name in caps.
 */
function cardEventShortName(eventName: string): string {
  return /build day/i.test(eventName) ? "BUILD DAY" : eventName.trim().toUpperCase()
}

/** Up to `max` members, then "and N more" — the card has one line for names. */
export function cardMembersLine(members: readonly string[], max = 6): string {
  if (members.length <= max) return members.join(" · ")
  return `${members.slice(0, max).join(" · ")} and ${members.length - max} more`
}

/**
 * The one-line headline for titles, alt text and link previews — for one
 * honour, the primary by default.
 */
export function cardHeadline(card: CardCopyInput & Pick<PublicResultCard, "projectName">, honour: Honour = cardHonours(card)[0]): string {
  switch (honour.kind) {
    case "champion":
      return `Champion of ${card.eventName}: ${card.projectName}`
    case "track-winner":
      return `Winner in ${card.track}: ${card.projectName}`
    case "second-overall":
      return `Second overall at ${card.eventName}: ${card.projectName}`
    case "third-overall":
      return `Third overall at ${card.eventName}: ${card.projectName}`
    case "track-runner-up":
      return `Runner-up in ${card.track}: ${card.projectName}`
    case "track-third":
      return `Third place in ${card.track}: ${card.projectName}`
    default:
      return `${card.projectName}, built at ${card.eventName}`
  }
}

// ─── Dark premium palette ────────────────────────────────────────────────────

/**
 * The public card's dark premium palette — literal hex, shared by the page
 * and its OG poster. Karibu's paper/ink tokens re-define themselves under
 * `prefers-color-scheme` and an explicit `data-theme`; this card must look
 * identical no matter the visitor's theme, so nothing here may read a CSS
 * variable. `page.tsx` cannot import these values into its Tailwind
 * arbitrary-value classes (the compiler only picks up a literal class string,
 * not one built from a JS constant), so its class strings hardcode the same
 * hex codes — keep the two in sync if the palette ever changes.
 */
export const CARD_DARK = {
  pageBg: "#0B0A09",
  card: "#16140F",
  elevated: "#1E1B15",
  hairline: "#2A261E",
  text: "#F4EEE3",
  muted: "#B8AE9C",
  dim: "#7C7365",
  orange: "#D97757",
  orangeAlt: "#E58A6B",
  /** Deeper clay — the Karibu accent colour, used only on the gold winner
   *  surface where #D97757 loses contrast against the gold's own warmth. */
  clay: "#A84E2D",
} as const

/**
 * Track-winner gold — warmer and richer than a flat mustard, on a slight
 * diagonal (165deg, not straight down) with a highlight line at the very
 * top, a translucent inner border, and a faint top-left radial highlight.
 */
export const CARD_GOLD = {
  from: "#B8860B",
  mid: "#D4AF37",
  to: "#F0D77A",
  highlight: "#F3DFA0",
  innerBorder: "rgba(243, 223, 160, 0.45)",
  radialHighlight: "rgba(255, 255, 255, 0.10)",
  ink: "#16140F",
} as const

/**
 * The Build Day poster's own field and text colours (the event kit's clay,
 * ink and paper). The "built" share card is the poster's sibling and paints
 * exactly these; the clay is the same brand orange as `CARD_DARK.orange`.
 */
export const CARD_POSTER = { clay: CARD_DARK.orange, ink: "#141413", paper: "#FAF9F5" } as const

/**
 * Runner-up silver — metallic, on the same 165deg diagonal as the gold and
 * with the same faint top-left highlight, so the two read as one family.
 * Ink text, like gold. Replaces the flat graphite that read as matte next
 * to the gold (Build Day, 2026-09-21).
 */
export const CARD_SILVER = {
  from: "#8E8E96",
  mid: "#C9C9D1",
  to: "#F2F2F6",
  radialHighlight: "rgba(255, 255, 255, 0.10)",
  ink: "#141413",
} as const

/**
 * Third-place copper — metallic, on the gold's and silver's 165deg diagonal
 * with the same faint highlight, so the three podium surfaces read as one
 * family. Ink text, like them. Deep red-brown to a light copper: the red
 * keeps it apart from the gold, the warmth from the silver. Replaces the
 * flat copper-red that read as matte next to the two metallics (Build
 * Day, 2026-09-21).
 */
export const CARD_BRONZE = {
  from: "#8C4A1F",
  mid: "#C47A3A",
  to: "#E8B07A",
  radialHighlight: "rgba(255, 255, 255, 0.10)",
  ink: "#141413",
} as const

export type CardStyle = {
  kind: "winner" | "runner-up" | "third" | "built"
  /** Panel background, gradient stops (2 or 3), in the direction of `angle`. */
  gradient: readonly string[]
  /** CSS `linear-gradient()` direction — `to bottom` except the winner's slight diagonal. */
  angle: string
  /** Body text colour against that panel. */
  ink: string
  /** Secondary text colour against that panel. */
  muted: string
  /**
   * Eyebrow, pill border/text and rule colour. Clay (`#A84E2D`) on the gold
   * winner surface, where the brighter Claude orange loses contrast against
   * gold's own warmth, and on the silver and copper surfaces for the same
   * reason; the brand orange on the flat built surface, where it reads.
   */
  accent: string
  /** Small placement pill — `null` where the design has none (third, built). */
  pill: { label: string; color: string } | null
}

/**
 * The one of four visual treatments a printed placement title earns — a
 * pure lookup over `PublicResultCard.title`, no placement arithmetic. Used
 * by both the page and the OG poster so the two never drift.
 *
 * The pills say "Track winner" and "2nd in track", never "1st overall" or
 * "2nd overall". `placementFor` derives `position` WITHIN a track, so a
 * title of "Winner" means first in its track and nothing more — the earlier
 * "1st overall" label printed an overall ranking on every track winner's
 * public card, including at Impact Lab 02 where no overall ranking was ever
 * announced. The wording above is true under both announcement modes: an
 * announced overall champion also leads its own track (see
 * `buildTrackWinners`), so it loses no claim it had earned.
 */
export function cardStyleForTitle(title: string): CardStyle {
  if (title === "Winner") {
    return {
      kind: "winner",
      gradient: [CARD_GOLD.from, CARD_GOLD.mid, CARD_GOLD.to],
      angle: "165deg",
      ink: CARD_GOLD.ink,
      muted: CARD_GOLD.ink,
      accent: CARD_DARK.clay,
      pill: { label: "Track winner", color: CARD_DARK.clay },
    }
  }
  if (title === "Runner-up") {
    return {
      kind: "runner-up",
      gradient: [CARD_SILVER.from, CARD_SILVER.mid, CARD_SILVER.to],
      angle: "165deg",
      ink: CARD_SILVER.ink,
      muted: CARD_SILVER.ink,
      accent: CARD_DARK.clay,
      pill: { label: "2nd in track", color: CARD_DARK.clay },
    }
  }
  if (title === "Third place") {
    return {
      kind: "third",
      gradient: [CARD_BRONZE.from, CARD_BRONZE.mid, CARD_BRONZE.to],
      angle: "165deg",
      ink: CARD_BRONZE.ink,
      muted: CARD_BRONZE.ink,
      accent: CARD_DARK.clay,
      pill: null,
    }
  }
  return {
    kind: "built",
    gradient: [CARD_DARK.elevated, CARD_DARK.elevated],
    angle: "to bottom",
    ink: CARD_DARK.text,
    muted: CARD_DARK.muted,
    accent: CARD_DARK.orange,
    pill: null,
  }
}

/** Path of the public card under the site root. */
export function resultCardPath(slug: string): string {
  return `/impact-lab/results/${slug}`
}

/**
 * The absolute URL of one team's public card, or `null` when no signing
 * secret is configured — callers omit the share link rather than send a
 * link that would 404.
 */
export function resultCardUrl(baseUrl: string, runId: string, teamId: string): string | null {
  const secret = resultCardSecret()
  if (!secret) return null
  return `${baseUrl}${resultCardPath(resultCardSlug(runId, teamId, secret))}`
}

/**
 * Whether the published placings are simply the panel's scores in order.
 *
 * True when the announced overall winners are the top of the score-derived
 * order (same tie-break as `buildRanking`) and no track winner was assigned
 * by an organiser. Impact Lab 02's placings were exactly that, so its email
 * must not claim a deliberation that never happened; an edition where the
 * panel did override the arithmetic gets the "decided after discussion"
 * wording instead. With no announced winners this is vacuously true and the
 * caller's no-winners wording applies anyway.
 */
export function placingsFollowScores(snapshot: ResultsSnapshot): boolean {
  if (snapshot.trackWinners.some((w) => w.basis === "organiser")) return false
  const byScore = [...snapshot.ranking].sort(
    (a, b) => b.average - a.average || a.teamId.localeCompare(b.teamId)
  )
  return snapshot.overall.every((w, i) => byScore[i]?.teamId === w.teamId)
}
