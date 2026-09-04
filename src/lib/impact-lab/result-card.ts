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

/**
 * A team's placing within its track, or `null` when the snapshot does not
 * mention the team at all (never submitted, or a stale id).
 *
 * Position is the team's index among the ranking rows that share its track,
 * in ranking order — announced winners first, then by score — which is
 * exactly how `buildTrackWinners` picks a track's winner. One deliberate
 * extra: the entry named in `snapshot.trackWinners` is moved to the front of
 * its track before positions are counted. For `announced`/`score` winners
 * that is a no-op; for an `organiser`-assigned winner it is what keeps
 * position 1 equal to the track winner every other artefact names, so no
 * team is ever told "runner-up" under a headline that crowns it.
 */
export function placementFor(snapshot: ResultsSnapshot, teamId: string): Placement | null {
  const row = snapshot.ranking.find((r) => r.teamId === teamId)
  if (!row) {
    const unranked = (snapshot.unranked ?? []).find((u) => u.teamId === teamId)
    return unranked ? { kind: "participant", track: unranked.track } : null
  }

  const inTrack = snapshot.ranking.filter((r) => r.track === row.track)
  const winnerId = snapshot.trackWinners.find((w) => w.track === row.track)?.teamId
  const ordered =
    winnerId && inTrack.some((r) => r.teamId === winnerId)
      ? [...inTrack.filter((r) => r.teamId === winnerId), ...inTrack.filter((r) => r.teamId !== winnerId)]
      : inTrack

  return {
    kind: "ranked",
    track: row.track,
    position: ordered.findIndex((r) => r.teamId === teamId) + 1,
    of: ordered.length,
    overallRank: row.rank,
    announced: snapshot.overall.some((w) => w.teamId === teamId),
  }
}

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
  /** "Jane K." style — first name plus last initial, never a full surname. */
  members: string[]
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
export function teamPlaceLabel(table: number | null, teamName: string): string {
  const name = teamName.trim()
  const tableLabel = table !== null ? `Table ${table}` : null
  const nameIsTable =
    tableLabel !== null && name.replace(/\s+/g, " ").toLowerCase() === tableLabel.toLowerCase()
  return [tableLabel, nameIsTable || name === "" ? null : name]
    .filter((s): s is string => s !== null)
    .join(" · ")
}

export function toPublicResultCard(input: {
  eventName: string
  eventDates: string
  projectName: string
  placement: Placement
  memberFullNames: string[]
}): PublicResultCard {
  return {
    eventName: input.eventName,
    eventDates: input.eventDates,
    projectName: input.projectName,
    track: input.placement.track,
    title: placementTitle(input.placement),
    members: input.memberFullNames.map(shortName).filter((n) => n !== ""),
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

/** Runner-up graphite, top to bottom, plus its silver pill colour. */
export const CARD_GRAPHITE = { from: "#2A2A2E", to: "#3A3A40", silver: "#C0C0C8" } as const

/** Third-place bronze, top to bottom. */
export const CARD_BRONZE = { from: "#4E2A14", to: "#8C5A2B" } as const

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
   * gold's own warmth; the brand orange everywhere else (graphite, bronze,
   * built), which is dark enough to read against those surfaces.
   */
  accent: string
  /** Small placement pill — `null` where the design has none (third, built). */
  pill: { label: string; color: string } | null
}

/**
 * The one of four visual treatments a printed placement title earns — a
 * pure lookup over `PublicResultCard.title`, no placement arithmetic. Used
 * by both the page and the OG poster so the two never drift.
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
      pill: { label: "1st overall", color: CARD_DARK.clay },
    }
  }
  if (title === "Runner-up") {
    return {
      kind: "runner-up",
      gradient: [CARD_GRAPHITE.from, CARD_GRAPHITE.to],
      angle: "to bottom",
      ink: CARD_DARK.text,
      muted: CARD_DARK.muted,
      accent: CARD_DARK.orange,
      pill: { label: "2nd overall", color: CARD_GRAPHITE.silver },
    }
  }
  if (title === "Third place") {
    return {
      kind: "third",
      gradient: [CARD_BRONZE.from, CARD_BRONZE.to],
      angle: "to bottom",
      ink: CARD_DARK.text,
      muted: CARD_DARK.muted,
      accent: CARD_DARK.orange,
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
