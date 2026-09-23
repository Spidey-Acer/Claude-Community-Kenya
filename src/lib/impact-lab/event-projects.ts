/**
 * Public "Projects" tab — every project a team submitted before the lock, in
 * the linked cohort's published run.
 *
 * Hackhouse Africa's LinkedIn post ("See every project from the night")
 * linked an event page that only ever showed the six winner cards. This
 * module is the record of everyone else's build.
 *
 * `EventProject` is a hard allowlist, built field by field from the same
 * joins `buildResultsExport` (export-data.ts) uses — never by spreading a
 * submission or a participant row, so a field added to either later cannot
 * leak here by default. It carries: the project's display name, its track,
 * an honour label when the team earned one (via `cardHonours`, the same
 * source the winner cards use), members as short names, and the team's own
 * pitch, shown for every team regardless of consent. It never carries an
 * email, an institution, a score, a judge's name or note, a table number,
 * an attendance count, `worksVsMocked`, `claudeUsage`, or `problemTackled`.
 *
 * The rest of a team's submission — its description (prose-cleaned), the
 * approved community review (`publishableReview` gates it — an unapproved
 * draft never reaches this module's output either way), and its own
 * submitted links (each checked to actually be an `http(s)` URL) — is
 * consent-gated: it shows only for a team the organiser has marked
 * `showcase` on the published snapshot (`ResultsSnapshot.showcase`, set from
 * the admin Cards tab after the team replies "feature me"). A team that has
 * not opted in still appears, with its name, track, honour, members and
 * pitch — just not its write-up, review or links. `EventProject.showcased`
 * carries the flag through so the renderer can tell the two cases apart.
 *
 * `buildEventProjects` is pure (no Prisma, no Next) so the allowlist and the
 * ordering can be asserted by fixtures; `loadEventProjects` is the thin
 * Prisma wrapper the event page calls.
 */

import { prisma } from "@/lib/prisma"
import { validCohort } from "./event-lifecycle"
import { getEventByCohort } from "./event-store"
import { extractFrozenTeams } from "./member"
import { resolveTeamTrack, trackLabelIndex, type TrackedTeam } from "./judging"
import { cleanProse, markdownToPlainText } from "./export-data"
import { isChampion, cardHonours, placementTitle, shortName, type CardCopyInput, type Honour } from "./result-card"
import { isResultsSnapshot, isShowcased, placementFor, type ResultsSnapshot } from "./results"
import { publishableReview, REVIEW_SIGNATURE, type ReviewGateInput } from "./reviews"

// ─── Public shape ────────────────────────────────────────────────────────────

export interface EventProjectLink {
  label: "Code" | "Demo" | "Video"
  url: string
}

export interface EventProjectReview {
  text: string
  /** Always REVIEW_SIGNATURE — carried in-band so the byline travels with the words. */
  signedBy: string
}

/** One team's project, as the public Projects tab may show it. Nothing beyond this shape reaches the client. */
export interface EventProject {
  teamId: string
  name: string
  track: string
  /** "Champion", "Second overall", "Kilimo winner", etc — `null` when the team holds no honour. */
  honour: string | null
  /** Short names joined with " · " — never a full name or an email. */
  members: string
  /** `null` when the team left the field blank. */
  pitch: string | null
  /**
   * Cleaned, markdown-stripped paragraphs — the renderer caps how many it
   * shows up front. Always `[]` for a team not marked `showcased` — see the
   * module doc comment.
   */
  descriptionParagraphs: string[]
  /**
   * The approved community review, or `null` when none is approved yet, or
   * when the team is not marked `showcased` — see the module doc comment.
   */
  review: EventProjectReview | null
  /** Always `[]` for a team not marked `showcased` — see the module doc comment. */
  links: EventProjectLink[]
  /**
   * True when the organiser has recorded this team's consent to show its
   * full submission publicly. Gates `descriptionParagraphs`, `review` and
   * `links` above — see the module doc comment.
   */
  showcased: boolean
}

// ─── Source rows (what the loader hands in) ──────────────────────────────────

export interface EventProjectSourceTeam extends TrackedTeam {
  id: string
  name: string
  memberIds: string[]
}

export interface EventProjectSourceParticipant {
  id: string
  fullName: string
}

export interface EventProjectSourceSubmission {
  teamId: string
  projectName: string
  pitch: string
  description: string
  repoUrl: string
  demoUrl: string | null
  videoUrl: string | null
}

/** A review row, ungated — `buildEventProjects` runs it through `publishableReview` itself. */
export type EventProjectSourceReview = ReviewGateInput & { teamId: string }

export interface EventProjectsSource {
  eventName: string
  /** The published snapshot — required: there is no "projects" tab before publication (see `loadEventProjects`). */
  snapshot: ResultsSnapshot
  teams: readonly EventProjectSourceTeam[]
  participants: readonly EventProjectSourceParticipant[]
  submissions: readonly EventProjectSourceSubmission[]
  reviews: readonly EventProjectSourceReview[]
  tracks?: readonly { key: string; label: string }[]
}

// ─── Assembly ────────────────────────────────────────────────────────────────

/** `true` only for a non-empty, actually-`http(s)` URL — never a bare domain or a `mailto:`. */
function isHttpUrl(url: string | null | undefined): url is string {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim())
}

function buildLinks(sub: EventProjectSourceSubmission): EventProjectLink[] {
  const links: EventProjectLink[] = []
  if (isHttpUrl(sub.repoUrl)) links.push({ label: "Code", url: sub.repoUrl.trim() })
  if (isHttpUrl(sub.demoUrl)) links.push({ label: "Demo", url: sub.demoUrl.trim() })
  if (isHttpUrl(sub.videoUrl)) links.push({ label: "Video", url: sub.videoUrl.trim() })
  return links
}

/**
 * Honour kinds this tab may show — every one the panel actually announced:
 * the champion, a track's own winner, and second/third overall. Explicitly
 * NOT `track-runner-up` or `track-third` (`cardHonours`' fallback for a
 * team that placed but was never named) or `built` (no honour at all) —
 * printing those would let a reader reconstruct every track's top three
 * from this public tab, which is exactly the score-adjacent ranking the
 * rest of this module goes out of its way never to publish.
 */
const ANNOUNCED_HONOUR_KINDS = new Set<Honour["kind"]>([
  "champion",
  "track-winner",
  "second-overall",
  "third-overall",
])

/**
 * The honour badge, or `null` for a team with no announced honour — the
 * same primary honour `cardHonours` gives the winner cards (Champion, a
 * track winner, second/third overall), sentence-cased for a badge next to a
 * name rather than the poster's all-caps line. `null` also for a team the
 * snapshot never ranked (took part, never scored), and for a team whose
 * only honour is an un-announced track placing — see `ANNOUNCED_HONOUR_KINDS`.
 */
function primaryHonourLabel(
  snapshot: ResultsSnapshot,
  teamId: string,
  fallbackTrack: string,
  eventName: string
): string | null {
  const placement = placementFor(snapshot, teamId)
  if (!placement || placement.kind !== "ranked") return null
  const input: CardCopyInput = {
    title: placementTitle(placement),
    champion: isChampion(snapshot, teamId),
    track: placement.track || fallbackTrack,
    eventName,
    overallRank: placement.overallRank,
  }
  const honour = cardHonours(input)[0]
  if (!ANNOUNCED_HONOUR_KINDS.has(honour.kind)) return null
  return honour.label.charAt(0).toUpperCase() + honour.label.slice(1)
}

/**
 * Assemble every submitted project's public record.
 *
 * Ordering: the announced podium first (in announced order), then any
 * remaining track winners not already shown, then everyone else
 * alphabetically by display name. No numbering — see the module doc for why
 * (a rank is a score-adjacent fact this tab does not print).
 */
export function buildEventProjects(source: EventProjectsSource): EventProject[] {
  const participantById = new Map(source.participants.map((p) => [p.id, p]))
  const submissionByTeam = new Map(source.submissions.map((s) => [s.teamId, s]))
  const teamById = new Map(source.teams.map((t) => [t.id, t]))

  const reviewByTeam = new Map<string, string>()
  for (const row of source.reviews) {
    const text = publishableReview(row)
    if (text !== null) reviewByTeam.set(row.teamId, cleanProse(text))
  }

  const labelByKey = trackLabelIndex(source.tracks ?? [])
  const trackById = new Map(source.teams.map((t) => [t.id, resolveTeamTrack(t, labelByKey)]))

  function buildOne(teamId: string): EventProject | null {
    const submission = submissionByTeam.get(teamId)
    if (!submission) return null // never submitted — nothing to publish

    const team = teamById.get(teamId)
    const track = trackById.get(teamId) ?? "Unassigned"
    // Printed exactly as the team wrote it — the same fallback
    // `export-data.ts`'s `projectDisplayName` uses, but no casing fix:
    // `formatDisplayName` exists to fix a person's typed-lowercase name
    // ("simon" -> "Simon"), and applying it here would silently rewrite a
    // team's own project name (e.g. "kada ya moko") into something they
    // never wrote, on the one surface that is supposed to be their own
    // words verbatim — the cards, emails and winners section never do this.
    // A blank name never falls back to the frozen team name or the raw
    // teamId on THIS tab — "Table 12" or "team-6" printed as a project name
    // reads as a real (if odd) title rather than the placeholder it is.
    const name = submission.projectName.trim() || "Untitled project"

    const members = (team?.memberIds ?? [])
      .map((id) => participantById.get(id))
      .filter((p): p is EventProjectSourceParticipant => p !== undefined)
      .map((p) => shortName(p.fullName))
      .filter((n) => n !== "")
      .join(" · ")

    const pitch = cleanProse(submission.pitch).replace(/\s+/g, " ").trim()
    const descriptionParagraphs = markdownToPlainText(submission.description)
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p !== "")

    const reviewText = reviewByTeam.get(teamId)
    // Consent, not a placing: whether THIS team agreed to show its own
    // write-up, review and links — see the module doc comment. `isShowcased`
    // reads either the current `ShowcaseEntry` shape or the legacy `true`.
    const showcased = isShowcased(source.snapshot, teamId)

    return {
      teamId,
      name,
      track,
      honour: primaryHonourLabel(source.snapshot, teamId, track, source.eventName),
      members,
      pitch: pitch === "" ? null : pitch,
      descriptionParagraphs: showcased ? descriptionParagraphs : [],
      review: showcased && reviewText !== undefined ? { text: reviewText, signedBy: REVIEW_SIGNATURE } : null,
      links: showcased ? buildLinks(submission) : [],
      showcased,
    }
  }

  const seen = new Set<string>()
  const projects: EventProject[] = []

  const podiumIds = source.snapshot.overall.map((w) => w.teamId)
  const trackWinnerIds = [...source.snapshot.trackWinners]
    .sort((a, b) => a.track.localeCompare(b.track))
    .map((w) => w.teamId)

  for (const teamId of [...podiumIds, ...trackWinnerIds]) {
    if (seen.has(teamId)) continue
    seen.add(teamId)
    const project = buildOne(teamId)
    if (project) projects.push(project)
  }

  const rest = source.submissions
    .map((s) => s.teamId)
    .filter((teamId) => !seen.has(teamId))
    .map((teamId) => buildOne(teamId))
    .filter((p): p is EventProject => p !== null)
    .sort((a, b) => a.name.localeCompare(b.name))

  return [...projects, ...rest]
}

// ─── Prisma loader ───────────────────────────────────────────────────────────

/**
 * The Projects tab's data for one cohort, or `null` when there is no final
 * run with published results (or the stored snapshot fails its shape
 * check) — the same guard `findPublicEventResults` uses, so the Winners and
 * Projects tabs always agree on whether this cohort's results are public.
 */
export async function loadEventProjects(cohortInput: string): Promise<EventProject[] | null> {
  const cohort = validCohort(cohortInput)
  if (!cohort) return null

  const [run, impactLabEvent] = await Promise.all([
    prisma.impactLabMatchRun.findFirst({
      where: { cohort, isFinal: true, resultsPublishedAt: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { id: true, result: true, resultsSnapshot: true },
    }),
    getEventByCohort(cohort),
  ])
  if (!run || !isResultsSnapshot(run.resultsSnapshot)) return null

  const teams = extractFrozenTeams(run.result) ?? []
  const memberIds = [...new Set(teams.flatMap((t) => t.memberIds))]

  const [participants, submissions, reviewRows] = await Promise.all([
    prisma.impactLabParticipant.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, fullName: true },
    }),
    prisma.impactLabSubmission.findMany({
      where: { runId: run.id },
      select: {
        teamId: true,
        projectName: true,
        pitch: true,
        description: true,
        repoUrl: true,
        demoUrl: true,
        videoUrl: true,
      },
    }),
    prisma.impactLabTeamReview.findMany({
      where: { runId: run.id },
      select: { teamId: true, text: true, approvedAt: true },
    }),
  ])

  return buildEventProjects({
    eventName: impactLabEvent?.name ?? cohort,
    snapshot: run.resultsSnapshot,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      memberIds: t.memberIds,
      track: (t as { track?: string }).track,
      trackKey: (t as { trackKey?: string }).trackKey,
    })),
    participants,
    submissions,
    reviews: reviewRows,
    tracks: impactLabEvent?.tracks ?? [],
  })
}
