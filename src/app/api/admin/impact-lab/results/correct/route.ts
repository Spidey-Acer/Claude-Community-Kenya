import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { rateLimit } from "@/lib/rate-limit"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { getEventByCohort, resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { buildResultsInputFromRun, looksLikePerTrackWinners } from "@/lib/impact-lab/results-input"
import {
  buildSnapshot,
  isResultsSnapshot,
  type AnnouncedWinner,
  type ResultsInput,
  type ResultsSnapshot,
  type ResultsTrackWinner,
} from "@/lib/impact-lab/results"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"

/**
 * Correct an already-published result. The only door back into a run
 * `publish/route.ts` has already frozen.
 *
 * `publish/route.ts` refuses a second POST once `resultsPublishedAt` is set
 * (its own step 2, `ALREADY_PUBLISHED`) — deliberately: publishing closes
 * judging and queues 85 emails, and a second click must never queue a second
 * batch. That refusal is correct for a fresh announcement and wrong for
 * fixing one that was announced incorrectly, which is what this route is
 * for. It is the mirror image of publish's own guard: it REQUIRES the run to
 * already be published, and it never re-touches `resultsPublishedAt`,
 * `submissionsCloseAt`, `judgingClosedAt`, or `impactLabResultsEmail` — only
 * `announcedWinners` and `resultsSnapshot` change.
 *
 * Built on the same `buildResultsInputFromRun` → `buildSnapshot` path publish
 * uses, so there is exactly one function that turns a run's data plus an
 * announcement into a snapshot — never a second implementation that could
 * quietly disagree with the first.
 */

const bodySchema = z.object({
  cohort: z.string().max(60).optional(),
  announcedTeamIds: z.array(z.string().min(1).max(64)).max(20),
  announcementMode: z.enum(["podium", "tracks"]).optional().default("podium"),
  confirm: z.string(),
  /**
   * Overrides the `PODIUM_LOOKS_LIKE_TRACK_WINNERS` refusal below — same flag,
   * same meaning as `publish/route.ts`'s own `confirmPodium`. A correction can
   * reproduce the Impact Lab 02 shape exactly as easily as a first publish
   * can, so it gets the same guard, not a weaker one.
   */
  confirmPodium: z.boolean().optional().default(false),
})

/** What the transaction decided — translated into a response after it commits. */
type CorrectOutcome =
  | { ok: true; publishedAt: string }
  | { ok: false; status: number; error: string; code?: string }

interface AnnouncementView {
  announcementMode: "podium" | "tracks"
  overall: AnnouncedWinner[]
  trackWinners: ResultsTrackWinner[]
}

/**
 * GET — the current announcement, and (when `announcedTeamIds` is given)
 * what the proposed mode and ids would produce instead, so the admin panel
 * can render current-vs-proposed before the operator types CORRECT.
 *
 * Read-only: this never checks the correction's own validation (duplicates,
 * no-submission teams) — a stale or partial proposal here just renders
 * whatever `buildSnapshot` makes of it, exactly like the pre-publish preview
 * in `preview-email/route.ts`. The POST below is the one place those rules
 * are enforced.
 */
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const cohort = await resolveAdminCohort(request.nextUrl.searchParams.get("cohort"))
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, resultsPublishedAt: true, resultsSnapshot: true },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "No final run for this cohort." },
      { status: 409 }
    )
  }
  if (!run.resultsPublishedAt || !isResultsSnapshot(run.resultsSnapshot)) {
    return NextResponse.json(
      {
        success: false,
        error: "Results have not been published yet — there is nothing to correct.",
        code: "NOT_PUBLISHED",
      },
      { status: 409 }
    )
  }
  const currentSnapshot = run.resultsSnapshot as unknown as ResultsSnapshot
  const current: AnnouncementView = {
    announcementMode: currentSnapshot.announcementMode ?? "podium",
    overall: currentSnapshot.overall,
    trackWinners: currentSnapshot.trackWinners,
  }

  // Comma-separated team ids — the same query-param shape preview-email uses
  // for its own `?announced=`. Capped and de-duplicated before it ever
  // reaches the snapshot builder.
  const proposedParam = (request.nextUrl.searchParams.get("announcedTeamIds") ?? "").trim()
  const proposedTeamIds =
    proposedParam === ""
      ? []
      : [
          ...new Set(
            proposedParam
              .split(",")
              .map((id) => id.trim())
              .filter((id) => id !== "" && id.length <= 64)
          ),
        ].slice(0, 20)
  const proposedMode: "podium" | "tracks" =
    request.nextUrl.searchParams.get("announcementMode") === "tracks" ? "tracks" : "podium"

  let proposed: AnnouncementView | null = null
  if (proposedTeamIds.length > 0) {
    const rubric = await resolveRubric(cohort)
    const event = await getEventByCohort(cohort)
    const { input: inputBase } = await buildResultsInputFromRun(
      prisma,
      run.id,
      run.result,
      rubric,
      event?.tracks ?? []
    )
    const input: ResultsInput = {
      ...inputBase,
      publishedAt: run.resultsPublishedAt.toISOString(),
      announcementMode: proposedMode,
      announcedTeamIds: proposedTeamIds,
    }
    const snapshot = buildSnapshot(input)
    proposed = {
      announcementMode: proposedMode,
      overall: snapshot.overall,
      trackWinners: snapshot.trackWinners,
    }
  }

  return NextResponse.json({ success: true, data: { current, proposed } })
}

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  // Same gate as publish: "edit", not "view" — MODERATOR must not reach a
  // route that rewrites the public results record.
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const rl = await rateLimit(request, {
    maxRequests: 10,
    windowInSeconds: 300,
    identifier: () => `impact-lab-correct:${check.user.id}`,
  })
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Wait a moment and try again." },
      { status: 429, headers: rl.headers }
    )
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Pick the announced winners and confirm." },
      { status: 400 }
    )
  }

  // A typed confirmation, checked before any query runs — same insurance
  // publish takes, with its own word: CORRECT, not PUBLISH, so a mistyped
  // muscle-memory "PUBLISH" from the publish screen refuses here instead of
  // silently doing the wrong-sounding-right thing.
  if (parsed.data.confirm !== "CORRECT") {
    return NextResponse.json(
      { success: false, error: "Type CORRECT to confirm.", code: "CONFIRM_REQUIRED" },
      { status: 400 }
    )
  }

  const cohort = await resolveAdminCohort(parsed.data.cohort)
  const existing = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "No final run for this cohort." },
      { status: 409 }
    )
  }
  const runId = existing.id

  // Loaded before the transaction — same reasoning as publish/route.ts:
  // `getEventByCohort` uses the module-level Prisma client, and calling it
  // inside `$transaction` would open a second connection while this one
  // holds a row lock.
  const event = await getEventByCohort(cohort)

  const outcome = await prisma.$transaction(async (tx): Promise<CorrectOutcome> => {
    // Lock the run row so two corrections (or a correction racing a stray
    // publish retry) cannot interleave their writes.
    await tx.$queryRaw`SELECT id FROM impact_lab_match_runs WHERE id = ${runId} FOR UPDATE`

    const run = await tx.impactLabMatchRun.findUnique({
      where: { id: runId },
      select: { id: true, result: true, resultsPublishedAt: true },
    })
    if (!run) return { ok: false, status: 404, error: "Run not found." }

    // The mirror image of publish's own step 2: that route refuses unless
    // this is null, this route refuses unless it is set. A run that was
    // never published has nothing to correct — publish/route.ts is the door
    // for it.
    if (!run.resultsPublishedAt) {
      return {
        ok: false,
        status: 409,
        error: "Results have not been published yet — there is nothing to correct.",
        code: "NOT_PUBLISHED",
      }
    }

    const rubric = await resolveRubric(cohort)
    const { input: inputBase, teamIds, submittedTeamIds, scoredTeamIds, displayName } =
      await buildResultsInputFromRun(tx, runId, run.result, rubric, event?.tracks ?? [])

    // Announced winners must be real teams in this run, named once each, and
    // must have a submission — identical to publish's own step 4, so a
    // correction can never announce a team publish itself would have
    // refused to.
    const seen = new Set<string>()
    for (const id of parsed.data.announcedTeamIds) {
      if (seen.has(id)) {
        return {
          ok: false,
          status: 400,
          error: `"${displayName(id)}" is listed twice as an announced winner.`,
          code: "DUPLICATE_ANNOUNCED",
        }
      }
      seen.add(id)
      if (!teamIds.has(id)) {
        return {
          ok: false,
          status: 400,
          error: `"${id}" is not a team in this run.`,
          code: "UNKNOWN_ANNOUNCED",
        }
      }
      if (!submittedTeamIds.has(id)) {
        return {
          ok: false,
          status: 400,
          error: `"${displayName(id)}" has no submission and cannot be announced as a winner.`,
          code: "ANNOUNCED_NO_SUBMISSION",
        }
      }
    }

    // The same Impact Lab 02 fingerprint publish/route.ts guards against
    // (see that route's own comment): three teams ticked as an overall
    // podium that were actually the panel's separate per-track calls. A
    // correction can reproduce this exactly as easily as a first publish —
    // arguably more easily, since it is the tool reached for after the
    // wrong podium was already caught, under pressure to fix it fast.
    if (
      parsed.data.announcementMode === "podium" &&
      !parsed.data.confirmPodium &&
      looksLikePerTrackWinners(
        parsed.data.announcedTeamIds,
        inputBase.teams,
        new Set([...inputBase.teams.values()].map((t) => t.track))
      )
    ) {
      const named = parsed.data.announcedTeamIds
        .map((id) => `${displayName(id)} (${inputBase.teams.get(id)?.track ?? "unknown track"})`)
        .join(", ")
      return {
        ok: false,
        status: 409,
        error:
          `This looks like one winner per track, not an overall podium: ${named}. ` +
          'If this really is an announced overall podium, resend with confirmPodium: true. ' +
          'If the panel actually named one winner per track, switch announcementMode to "tracks" instead.',
        code: "PODIUM_LOOKS_LIKE_TRACK_WINNERS",
      }
    }

    // Unscored submitted teams: judging closed the moment this run was
    // first published (`judgingClosedAt` was set then), so `scoredTeamIds`
    // cannot have grown since — whether an unscored team gets published at
    // all was already decided at publish time and is not this route's
    // decision to re-litigate. Any unscored, non-announced team is simply
    // excluded from the ranking here, exactly as `allowUnscored: true` would
    // have applied when this run was first published.
    const announced = new Set(parsed.data.announcedTeamIds)
    const unrankedTeamIds = [...submittedTeamIds]
      .filter((id) => !scoredTeamIds.has(id) && !announced.has(id))
      .sort()

    const input: ResultsInput = {
      ...inputBase,
      // The original announcement instant, never `new Date()` — preserving
      // `resultsPublishedAt` is the entire reason this route exists apart
      // from publish/route.ts. A correction is not a fresh announcement.
      publishedAt: run.resultsPublishedAt.toISOString(),
      announcementMode: parsed.data.announcementMode,
      announcedTeamIds: parsed.data.announcedTeamIds,
      unrankedTeamIds,
    }
    const snapshot = buildSnapshot(input)

    // Rewrites the frozen record in place. `resultsPublishedAt`,
    // `submissionsCloseAt` and `judgingClosedAt` are deliberately absent from
    // this update.
    //
    // NEVER touches `impactLabResultsEmail`: no enqueue, no status change, no
    // new rows, here or anywhere else in this file. The 85 emails already
    // sent for the wrong announcement stay sent — a correction rewrites what
    // the results pages and share cards say from this point on; it does not
    // re-announce anything by email. (Test coverage for this route should
    // assert the email table's row count is unchanged after a correction.)
    await tx.impactLabMatchRun.update({
      where: { id: runId },
      data: {
        announcedWinners: JSON.parse(JSON.stringify(snapshot.overall)),
        resultsSnapshot: JSON.parse(JSON.stringify(snapshot)),
      },
    })

    return { ok: true, publishedAt: run.resultsPublishedAt.toISOString() }
  })

  if (!outcome.ok) {
    return NextResponse.json(
      { success: false, error: outcome.error, ...(outcome.code ? { code: outcome.code } : {}) },
      { status: outcome.status }
    )
  }

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "CORRECT",
    entity: "ImpactLabMatchRun",
    entityId: runId,
    changes: {
      announcedTeamIds: parsed.data.announcedTeamIds,
      announcementMode: parsed.data.announcementMode,
      confirmPodium: parsed.data.confirmPodium,
    },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: { publishedAt: outcome.publishedAt } })
}
