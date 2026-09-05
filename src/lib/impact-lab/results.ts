/**
 * Impact Lab results — the published snapshot.
 *
 * Pure and dependency-free (no Prisma, no Next) so the rules that decide what
 * 93 builders are told can be asserted by a script.
 *
 * Two rules carry all the weight:
 *
 * 1. Announced winners hold the placing the panel gave them, whatever the
 *    arithmetic says. The panel watched every demo and deliberated; no
 *    combination of the recorded scores reproduces their decision, and the
 *    announcement is already public. Recomputing it would contradict what
 *    people were told to their faces. What was announced is not always a
 *    podium — see `ResultsInput.announcementMode`: an overall podium (ranks
 *    1-3) or one winner per track are both real shapes an event can produce,
 *    and the snapshot must say which happened rather than assume the first.
 * 2. Everyone else ranks below them by score. Scores order the list but are
 *    never printed in it — publishing them would place a 76.9 at 4th above a
 *    75.3 at 1st, which is the contradiction this ranking exists to remove.
 *    A team's own numbers live on its own private card.
 */

import { trackOf, type TeamStanding } from "./judging"
import { REVIEW_SIGNATURE, type TeamJudgeNote } from "./reviews"

/** How a team's placing was arrived at. */
export type ResultBasis = "announced" | "demo" | "submission"

export interface RankedTeam {
  rank: number
  teamId: string
  projectName: string
  track: string
  /** Orders the ranking. Never rendered in the public table. */
  average: number
  basis: ResultBasis
}

export interface AnnouncedWinner {
  rank: number
  teamId: string
  projectName: string
}

export interface ResultsTrackWinner {
  track: string
  teamId: string
  projectName: string
  /**
   * How this track award was arrived at.
   *
   * - `announced` — the panel called this team out by name: as the overall
   *   podium in podium mode (the champion leads its own track), or as this
   *   track's own declared winner in tracks mode. See
   *   `ResultsInput.announcementMode`.
   * - `score` — the top score within that track's table group.
   * - `organiser` — an organiser assigned it, overriding score order. Teams
   *   were matched into a track before building and judged at that track's
   *   tables, so a team that builds outside its track can top the group with
   *   a project that does not belong to it. Correcting that is a judgement
   *   call, not arithmetic, and the artefacts must not claim otherwise —
   *   which is the whole reason this value is distinct from `score`.
   *
   * `buildTrackWinners` only ever emits the first two. `organiser` is written
   * into a published snapshot by hand and must be justified in writing.
   */
  basis: "announced" | "score" | "organiser"
}

/**
 * A team that submitted, took part, and was never scored.
 *
 * Kept apart from `ranking` rather than appended to the bottom of it: a rank
 * implies the panel placed the team, and placing a team nobody watched below
 * every team they did watch is a claim about its work that nobody made. These
 * teams participated, and that is the whole of what the snapshot asserts.
 */
export interface UnrankedTeam {
  teamId: string
  projectName: string
  track: string
}

/** Served only to members of that team. */
export interface TeamCard {
  rank: number
  criterionAverages: Record<string, number>
  /** `null` when no range was recorded — distinct from an earned zero. */
  low: number | null
  /** `null` when no range was recorded — distinct from an earned zero. */
  high: number | null
  basis: "demo" | "submission"
}

export interface ResultsSnapshot {
  publishedAt: string
  /**
   * What kind of announcement produced this snapshot.
   *
   * Optional because snapshots published before this field existed do not
   * carry it. Every reader must default a missing value to `"podium"` — the
   * only shape that existed before `"tracks"` was added — rather than assume
   * it is present; a stored snapshot is never recomputed, so the old shape is
   * permanent. See `ResultsInput.announcementMode`.
   */
  announcementMode?: "podium" | "tracks"
  /** The overall podium, in `"podium"` mode. Always `[]` in `"tracks"` mode — there is no podium to hold. */
  overall: AnnouncedWinner[]
  trackWinners: ResultsTrackWinner[]
  ranking: RankedTeam[]
  perTeam: Record<string, TeamCard>
  /**
   * Teams published as participants because nobody scored them.
   *
   * Optional because snapshots published before this existed do not carry it.
   * Every reader must default it to `[]` rather than assume it is present — a
   * stored snapshot is never recomputed, so the old shape is permanent.
   */
  unranked?: UnrankedTeam[]
}

export interface ResultsInput {
  publishedAt: string
  /**
   * Whether `announcedTeamIds` names an overall podium or a set of per-track
   * winners. Defaults to `"podium"` — the shape every cohort before this
   * field existed actually used.
   *
   * `"podium"`: `announcedTeamIds` is ranks 1-N of an overall podium (rank 1
   * is the champion).
   * `"tracks"`: `announcedTeamIds` is one declared winner per track, in no
   * particular order relative to each other. There is no overall podium —
   * `buildSnapshot` leaves `overall` empty — and the full ranking stays pure
   * score order; each announced team instead leads its own track in
   * `buildTrackWinners`.
   */
  announcementMode?: "podium" | "tracks"
  /**
   * Announced winners. In `"podium"` mode, in announced (podium) order.
   * In `"tracks"` mode, one team per track, order irrelevant. Empty is legal.
   */
  announcedTeamIds: string[]
  standings: TeamStanding[]
  teams: Map<string, { projectName: string; track: string }>
  /** Teams scored from the written submission rather than a live demo. */
  writeupOnly: Set<string>
  /** Lowest and highest weighted total across that team's judges. */
  range: Map<string, { low: number; high: number }>
  /**
   * Teams that submitted but were never scored, to publish as participants.
   *
   * Optional so every existing caller keeps its behaviour: omitted means the
   * snapshot has no unranked section at all, which is what publishing without
   * `allowUnscored` produces. The caller is responsible for keeping these
   * disjoint from `announcedTeamIds` — a team cannot hold a rank and be
   * unscored in the same snapshot.
   */
  unrankedTeamIds?: string[]
}

const UNKNOWN_TRACK = "Unassigned"

function metaOf(
  input: ResultsInput,
  teamId: string
): { projectName: string; track: string } {
  const meta = input.teams.get(teamId)
  if (meta) return meta
  // A team present in standings but absent from the run JSON should not be able
  // to crash publication; it appears with its id rather than vanishing.
  return { projectName: teamId, track: UNKNOWN_TRACK }
}

/**
 * `"podium"` mode: announced winners first in announced order, then everyone
 * else by average descending. `"tracks"` mode: pure score order throughout —
 * a per-track winner is not an overall placing, so it does not jump the
 * queue here (see `buildTrackWinners` for where it does apply). Ties break by
 * teamId so two loads never reorder themselves.
 */
export function buildRanking(input: ResultsInput): RankedTeam[] {
  const mode = input.announcementMode ?? "podium"
  const announced = new Set(input.announcedTeamIds)
  const byTeam = new Map(input.standings.map((s) => [s.teamId, s]))

  const rows: RankedTeam[] = []

  if (mode === "podium") {
    for (const teamId of input.announcedTeamIds) {
      const meta = metaOf(input, teamId)
      rows.push({
        rank: rows.length + 1,
        teamId,
        projectName: meta.projectName,
        track: meta.track || trackOf(meta.projectName),
        average: byTeam.get(teamId)?.average ?? 0,
        basis: "announced",
      })
    }
  }

  const rest = input.standings
    .filter((s) => !(mode === "podium" && announced.has(s.teamId)))
    .sort((a, b) => b.average - a.average || a.teamId.localeCompare(b.teamId))

  for (const s of rest) {
    const meta = metaOf(input, s.teamId)
    rows.push({
      rank: rows.length + 1,
      teamId: s.teamId,
      projectName: meta.projectName,
      track: meta.track || trackOf(meta.projectName),
      average: s.average,
      basis: input.writeupOnly.has(s.teamId) ? "submission" : "demo",
    })
  }

  // Tracks mode: a team the panel declared its track's winner may hold no
  // score at all (nobody judged it) — podium mode still gives such a team a
  // rank via `average ?? 0` above; pure score order does not, since a team
  // with no standing never enters `rest`. Append it here, ranked last, with
  // the same zero-average fallback, so a track's announced winner never
  // vanishes from the ranking just because it was never scored.
  if (mode === "tracks") {
    for (const teamId of input.announcedTeamIds) {
      if (byTeam.has(teamId)) continue
      const meta = metaOf(input, teamId)
      rows.push({
        rank: rows.length + 1,
        teamId,
        projectName: meta.projectName,
        track: meta.track || trackOf(meta.projectName),
        average: 0,
        basis: "demo",
      })
    }
  }

  return rows
}

/**
 * One winner per track. An announced overall winner (podium mode) or an
 * announced track winner (tracks mode) leads its own track — so the champion
 * never appears to lose its own category on the same page that crowns it,
 * and a track's declared winner is never outranked by score inside its own
 * table. Tracks with no announced winner go to their highest-ranked team.
 *
 * `announcedTeamIds` carries the tracks-mode announcements — `ranking`
 * itself never marks those rows `basis: "announced"` (see `buildRanking`),
 * so without this second signal a tracks-mode ranking would look identical
 * to an unpublished one and every track would fall back to score order.
 * Podium mode does not need it: those rows already carry `basis: "announced"`
 * on `ranking`, so an empty default set changes nothing.
 */
export function buildTrackWinners(
  ranking: RankedTeam[],
  announcedTeamIds: ReadonlySet<string> = new Set()
): ResultsTrackWinner[] {
  const best = new Map<string, ResultsTrackWinner>()

  // First pass: an announced winner leads its own track regardless of where
  // it falls in `ranking` — podium mode already sorts those rows first, but
  // tracks mode does not, since that ranking is pure score order throughout.
  // Two announced teams landing in the same track cannot both lead it; the
  // first one reached in `ranking` order wins.
  for (const row of ranking) {
    if (best.has(row.track)) continue
    if (row.basis !== "announced" && !announcedTeamIds.has(row.teamId)) continue
    best.set(row.track, {
      track: row.track,
      teamId: row.teamId,
      projectName: row.projectName,
      basis: "announced",
    })
  }

  // Second pass: tracks with no announced winner go to their highest-ranked
  // team — `ranking` is already ordered by score (or announced-then-score in
  // podium mode), so the first sighting of a track here is its winner.
  for (const row of ranking) {
    if (best.has(row.track)) continue
    best.set(row.track, {
      track: row.track,
      teamId: row.teamId,
      projectName: row.projectName,
      basis: "score",
    })
  }

  return [...best.values()].sort((a, b) => a.track.localeCompare(b.track))
}

/** A ranking row as participants may receive it. */
export type PublicRankedTeam = Omit<RankedTeam, "average">

/**
 * The ranking with scores removed, for anything that crosses the wire to a
 * participant.
 *
 * `average` orders the ranking and must stay in the stored snapshot — the
 * ordering has to be reproducible from what was published. But sending it to a
 * browser would let anyone with devtools read every team's score off a page
 * that shows none, which is the contradiction the announced-winner override
 * exists to remove. Strip it here, once, rather than trusting each route to
 * remember.
 *
 * Built field-by-field rather than destructure-and-omit: this project's
 * eslint config runs `@typescript-eslint/no-unused-vars` with no
 * `varsIgnorePattern`, so a discarded `average` binding — even underscore-
 * prefixed — would still surface as a lint warning.
 */
export function toPublicRanking(ranking: RankedTeam[]): PublicRankedTeam[] {
  return ranking.map((row) => ({
    rank: row.rank,
    teamId: row.teamId,
    projectName: row.projectName,
    track: row.track,
    basis: row.basis,
  }))
}

/**
 * The two streams of written feedback a team may receive, kept apart by
 * construction (see @/lib/impact-lab/reviews): a judge's own quoted words
 * under that judge's name, and the community's review under the community's.
 */
export interface TeamFeedback {
  /** Notes a judge actually wrote, quoted (spelling/casing corrected only). */
  judgeNotes: TeamJudgeNote[]
  /** The approved community review, or null when none is approved yet. */
  review: string | null
}

/** The community review as one participant receives it — text plus signer. */
export interface TeamReviewPayload {
  text: string
  /** Always REVIEW_SIGNATURE — carried in-band so the label crosses the wire with the words. */
  signedBy: string
}

/** The published result as one participant may receive it. Flat member shape — no `data` wrapper. */
export interface MemberResultsPayload {
  success: true
  published: boolean
  results?: {
    publishedAt: string
    overall: AnnouncedWinner[]
    trackWinners: ResultsTrackWinner[]
    ranking: PublicRankedTeam[]
    /** Teams that took part but were never scored. Empty on most snapshots. */
    unranked: UnrankedTeam[]
  }
  yourTeam?: {
    teamId: string
    projectName: string
    /**
     * Absent exactly when this team is in `unranked` — it took part and no
     * judge ever scored it, so there is no rank, no criterion average and no
     * range to show. The view says so in words instead of rendering zeros
     * that would read as an earned result.
     */
    card?: TeamCard
    /** True when this team took part but was not scored in the finals. */
    unranked?: true
    /** Present only when a judge left a note on this team. */
    judgeNotes?: TeamJudgeNote[]
    /** Present only when the organiser has approved this team's review. */
    review?: TeamReviewPayload
  }
}

/**
 * The published result as one participant may receive it.
 *
 * Lives here rather than inline in the route so the privacy properties can be
 * asserted: the snapshot holds every team's private card and a score on every
 * ranking row, and neither may cross the wire. Building the payload by naming
 * each field — never by spreading the snapshot — means a field added to the
 * snapshot later does not leak by default.
 *
 * `viewerTeamId` is the caller's own team, or `null` when it could not be
 * resolved (not registered, not on a team in the frozen run, or a stale id).
 * `yourTeam` is omitted from the returned object entirely in that case, and
 * also when the resolved team has neither a card nor a place in `unranked` —
 * never set to `null` or an empty object, so `"yourTeam" in payload` is the
 * true test of whether anything was attached.
 *
 * A team in `unranked` gets a `yourTeam` WITHOUT a card. That is the one case
 * where a ranking row is not required: the team took part, nobody scored it,
 * and telling its members nothing at all is worse than telling them that.
 */
export function buildMemberPayload(
  snapshot: ResultsSnapshot,
  viewerTeamId: string | null,
  /**
   * Written feedback for the viewer's own team ONLY — the caller must never
   * pass another team's. It rides inside `yourTeam`, so a viewer with no
   * resolvable team can receive none of it by construction.
   */
  feedback?: TeamFeedback
): MemberResultsPayload {
  const payload: MemberResultsPayload = {
    success: true,
    published: true,
    results: {
      publishedAt: snapshot.publishedAt,
      overall: snapshot.overall,
      trackWinners: snapshot.trackWinners,
      ranking: toPublicRanking(snapshot.ranking),
      unranked: snapshot.unranked ?? [],
    },
  }

  const card = viewerTeamId ? snapshot.perTeam[viewerTeamId] : undefined
  const rankingRow = viewerTeamId
    ? snapshot.ranking.find((r) => r.teamId === viewerTeamId)
    : undefined
  const unrankedRow = viewerTeamId
    ? (snapshot.unranked ?? []).find((r) => r.teamId === viewerTeamId)
    : undefined

  if (viewerTeamId && card && rankingRow) {
    payload.yourTeam = {
      teamId: viewerTeamId,
      projectName: rankingRow.projectName,
      card,
    }
  } else if (viewerTeamId && unrankedRow) {
    payload.yourTeam = {
      teamId: viewerTeamId,
      projectName: unrankedRow.projectName,
      unranked: true,
    }
  }

  // Judge notes and the community review ride on whichever branch attached a
  // team. An unscored team can still have been written to — a judge may have
  // left a note without completing a sheet — and withholding those words is
  // exactly the silence this branch exists to end.
  if (payload.yourTeam) {
    if (feedback && feedback.judgeNotes.length > 0) {
      payload.yourTeam.judgeNotes = feedback.judgeNotes
    }
    if (feedback && feedback.review !== null) {
      payload.yourTeam.review = { text: feedback.review, signedBy: REVIEW_SIGNATURE }
    }
  }

  return payload
}

/**
 * Cheap duck-typed shape check on a stored `resultsSnapshot` JSON value before
 * it is cast to `ResultsSnapshot`. Not full schema validation — just enough
 * that a malformed or legacy-shaped snapshot fails cleanly wherever it is
 * read (the notify route, the email preview route) rather than throwing an
 * unhandled exception mid-request (e.g. on `snapshot.perTeam[id]` for a
 * `perTeam` that isn't actually an object).
 */
export function isResultsSnapshot(value: unknown): value is ResultsSnapshot {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.overall) &&
    Array.isArray(v.trackWinners) &&
    Array.isArray(v.ranking) &&
    typeof v.perTeam === "object" &&
    v.perTeam !== null
  )
}

export function buildSnapshot(input: ResultsInput): ResultsSnapshot {
  const mode = input.announcementMode ?? "podium"
  const ranking = buildRanking(input)
  const standingById = new Map(input.standings.map((s) => [s.teamId, s]))

  const perTeam: Record<string, TeamCard> = {}
  for (const row of ranking) {
    const standing = standingById.get(row.teamId)
    const range = input.range.get(row.teamId)
    perTeam[row.teamId] = {
      rank: row.rank,
      criterionAverages: standing?.criterionAverages ?? {},
      low: range?.low ?? null,
      high: range?.high ?? null,
      basis: input.writeupOnly.has(row.teamId) ? "submission" : "demo",
    }
  }

  // Ranked teams cannot also be unranked. The publish route already excludes
  // announced winners, but a ranking row can arrive from a standings row too,
  // so the snapshot filters again rather than trusting its caller.
  const rankedIds = new Set(ranking.map((row) => row.teamId))
  const unranked: UnrankedTeam[] = (input.unrankedTeamIds ?? [])
    .filter((teamId) => !rankedIds.has(teamId))
    .map((teamId) => {
      const meta = metaOf(input, teamId)
      return {
        teamId,
        projectName: meta.projectName,
        track: meta.track || trackOf(meta.projectName),
      }
    })

  return {
    publishedAt: input.publishedAt,
    announcementMode: mode,
    // Tracks mode has no overall podium — publishing one anyway is exactly
    // the bug this field exists to remove (see the module doc comment).
    overall:
      mode === "tracks"
        ? []
        : input.announcedTeamIds.map((teamId, i) => ({
            rank: i + 1,
            teamId,
            projectName: metaOf(input, teamId).projectName,
          })),
    trackWinners: buildTrackWinners(ranking, new Set(input.announcedTeamIds)),
    ranking,
    perTeam,
    unranked,
  }
}
