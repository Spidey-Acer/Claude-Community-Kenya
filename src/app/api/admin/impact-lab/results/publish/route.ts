import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { rateLimit } from "@/lib/rate-limit"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { buildResultsInputFromRun } from "@/lib/impact-lab/results-input"
import { buildSnapshot, type ResultsInput } from "@/lib/impact-lab/results"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"

/**
 * Mark final. A one-way door.
 *
 * Closes submissions and judging, computes the snapshot, and queues one row per
 * recipient — all inside one row-locked transaction, so a second click cannot
 * publish twice or queue a second set of emails.
 *
 * Everything participants see afterwards is served from the stored snapshot and
 * never recomputed. This matters concretely: one team edited its submission a
 * full day after being judged, so live data demonstrably moves after the fact.
 * What 93 people are told must not move with it.
 */

const bodySchema = z.object({
  cohort: z.string().max(60).optional(),
  announcedTeamIds: z.array(z.string().min(1).max(64)).max(20),
  confirm: z.string(),
})

/** What the transaction decided — translated into a response after it commits. */
type PublishOutcome =
  | { ok: true; publishedAt: string; recipients: number }
  | { ok: false; status: number; error: string; code?: string }

/**
 * GET — whether this cohort's final run has already been published, so the
 * admin panel can render the post-publish summary (and hide the button)
 * after a page reload rather than only right after the POST that did it.
 */
export async function GET(request: NextRequest) {
  // "edit", not "view" — MODERATOR (the judge-signin role) holds only "view"
  // on impact-lab, and this endpoint's POST closes judging irreversibly.
  // "view" would let a judge account read publish status for a route it must
  // not be able to call at all; gate both handlers the same way.
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const cohort = await resolveAdminCohort(request.nextUrl.searchParams.get("cohort"))
  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, resultsPublishedAt: true },
  })

  if (!run?.resultsPublishedAt) {
    return NextResponse.json({
      success: true,
      data: { published: false, publishedAt: null, recipients: 0 },
    })
  }

  const recipients = await prisma.impactLabResultsEmail.count({ where: { runId: run.id } })

  return NextResponse.json({
    success: true,
    data: {
      published: true,
      publishedAt: run.resultsPublishedAt.toISOString(),
      recipients,
    },
  })
}

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  // "edit": publish closes judging and freezes/emails the result — strictly
  // more consequential than notify/route.ts (which requires "create"), and
  // MODERATOR (judge signin) must not be able to reach it at all.
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  // A one-way door does not need a generous quota, but refusals (already
  // published, unscored teams) must not burn it — an organiser deliberately
  // attempts this once before the real thing to see Step 4's refusal fire.
  // Scoped to the caller, not the IP, so a shared office network can't share
  // one bucket across organisers.
  const rl = await rateLimit(request, {
    maxRequests: 10,
    windowInSeconds: 300,
    identifier: () => `impact-lab-publish:${check.user.id}`,
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

  // A typed confirmation is cheap insurance on a one-way door — checked before
  // any query runs, not just before the write.
  if (parsed.data.confirm !== "PUBLISH") {
    return NextResponse.json(
      { success: false, error: 'Type PUBLISH to confirm.', code: "CONFIRM_REQUIRED" },
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

  const outcome = await prisma.$transaction(async (tx): Promise<PublishOutcome> => {
    // 1. Lock the run row so a second click cannot race this one.
    await tx.$queryRaw`SELECT id FROM impact_lab_match_runs WHERE id = ${runId} FOR UPDATE`

    const run = await tx.impactLabMatchRun.findUnique({
      where: { id: runId },
      select: { id: true, result: true, resultsPublishedAt: true, submissionsCloseAt: true },
    })
    if (!run) return { ok: false, status: 404, error: "Run not found." }

    // 2. Already published — refuse rather than silently republishing.
    if (run.resultsPublishedAt) {
      return {
        ok: false,
        status: 409,
        error: "Results have already been published for this run.",
        code: "ALREADY_PUBLISHED",
      }
    }

    // The rubric this run's totals are scored against — an organiser-authored
    // one for this cohort if there is one, else the code constant. Every
    // total and standing buildResultsInputFromRun computes below is in these
    // units.
    const rubric = await resolveRubric(cohort)

    // What an organiser actually recognises a team by — the run-JSON team
    // name is an internal id like "Table 12 — Kilimo (Agriculture)" — and
    // everything else needed to build a ResultsInput. Shared with the
    // preview-email route so the two never read the run differently.
    const { input: inputBase, teams, teamIds, submittedTeamIds, scoredTeamIds, displayName } =
      await buildResultsInputFromRun(tx, runId, run.result, rubric)

    // 3. Every submitted team must have at least one score — this is what stops
    // the four unscored teams being published as blanks.
    const unscored = [...submittedTeamIds]
      .filter((id) => !scoredTeamIds.has(id))
      .map((id) => displayName(id))
    if (unscored.length > 0) {
      return {
        ok: false,
        status: 409,
        error: `These teams submitted but have no score: ${unscored.join(", ")}`,
        code: "UNSCORED_TEAMS",
      }
    }

    // 4. Announced winners must be real teams in this run, named once each.
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
      // A team with no submission has no entry in teamsMeta below, so
      // metaOf()'s fallback would put the raw teamId in place of a project
      // name — permanently, in a snapshot that is emailed to 93 people.
      if (!submittedTeamIds.has(id)) {
        return {
          ok: false,
          status: 400,
          error: `"${displayName(id)}" has no submission and cannot be announced as a winner.`,
          code: "ANNOUNCED_NO_SUBMISSION",
        }
      }
    }

    // 5. The rest of the ResultsInput the pure snapshot builder needs.
    const publishedAt = new Date()
    const input: ResultsInput = {
      ...inputBase,
      publishedAt: publishedAt.toISOString(),
      announcedTeamIds: parsed.data.announcedTeamIds,
    }
    const snapshot = buildSnapshot(input)

    // Recipients: participants on a team that has a submission — the 93.
    const submittedTeams = teams.filter((t) => submittedTeamIds.has(t.id))
    const recipientIds = new Set<string>()
    for (const team of submittedTeams) {
      for (const memberId of team.memberIds) recipientIds.add(memberId)
    }
    const participants = await tx.impactLabParticipant.findMany({
      where: { id: { in: [...recipientIds] } },
      select: { id: true, email: true },
    })

    // 6. Update the run — this is the moment the door closes.
    await tx.impactLabMatchRun.update({
      where: { id: runId },
      data: {
        submissionsCloseAt: run.submissionsCloseAt ?? publishedAt,
        judgingClosedAt: publishedAt,
        resultsPublishedAt: publishedAt,
        announcedWinners: JSON.parse(JSON.stringify(snapshot.overall)),
        resultsSnapshot: JSON.parse(JSON.stringify(snapshot)),
      },
    })

    // 7. Queue one row per recipient. skipDuplicates makes a retried request
    // (or a second click that slipped past the lock) a no-op rather than a
    // second batch of mail.
    if (participants.length > 0) {
      await tx.impactLabResultsEmail.createMany({
        data: participants.map((p) => ({ runId, participantId: p.id, email: p.email })),
        skipDuplicates: true,
      })
    }

    return { ok: true, publishedAt: publishedAt.toISOString(), recipients: participants.length }
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
    action: "PUBLISH",
    entity: "ImpactLabMatchRun",
    entityId: runId,
    changes: {
      announcedTeamIds: parsed.data.announcedTeamIds,
      recipients: outcome.recipients,
    },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({
    success: true,
    data: { publishedAt: outcome.publishedAt, recipients: outcome.recipients },
  })
}
