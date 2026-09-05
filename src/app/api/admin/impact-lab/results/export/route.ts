import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { getEventByCohort, resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import type { ScoreSheet } from "@/lib/impact-lab/judging"
import { resolveRubric } from "@/lib/impact-lab/rubric-store"
import {
  buildResultsExport,
  parseResultsSnapshot,
  type ExportSource,
} from "@/lib/impact-lab/export-data"
import { buildResultsWorkbook } from "@/lib/impact-lab/export-excel"
import { buildResultsPdf } from "@/lib/impact-lab/export-pdf"
import { publishableReview } from "@/lib/impact-lab/reviews"
import { generateTeamAnalyses, type TeamAnalysis } from "@/lib/impact-lab/export-analysis"

/**
 * GET /api/admin/impact-lab/results/export?cohort=…&format=xlsx|pdf[&analyses=off][&contacts=off][&checkedIn=N]
 *
 * The complete results record — Excel workbook or PDF — generated on request
 * and streamed straight to the browser. Deliberately never persisted to disk
 * or a bucket: the workbook carries every participant's name and email, and
 * participant data has leaked from an artefact-on-disk before. (The PDF, the
 * artefact built for sharing, omits contact details entirely, regardless of
 * `contacts`.)
 *
 * Per-team project analyses are generated at export time from the teams' own
 * submissions (see export-analysis for the honesty rules) — pass
 * `analyses=off` for a fast pull without them. Generation failures degrade
 * to an export without the affected sections, never to an error artefact.
 *
 * `contacts=off` (xlsx only) omits every participant and judge email column,
 * for a workbook that can be shared outside the organising team — sponsors,
 * a co-organiser at another institution. Defaults to `on` so the existing
 * organiser-facing behaviour is unchanged; ignored for `format=pdf`, which
 * never carried contact details to begin with.
 *
 * `checkedIn=<positive integer>` overrides — for this one export only — an
 * organiser's own door count (e.g. read off Luma), recorded alongside the
 * system's own when the two disagree — see
 * `ExportSummary.participantsCheckedInRecorded`. Must be a whole number no
 * greater than the number of registered participants; anything else is a
 * 400, not a silently ignored or clamped value, because this figure ends up
 * printed on the cover of a document built to be read by Anthropic. Absent
 * the query parameter, the run's own `checkedInRecorded` column — set from
 * the export panel's "Checked in at the door (Luma)" field — is used
 * instead, so a recorded door count survives across every future export of
 * the same cohort without having to be re-typed into the URL each time.
 *
 * Gated on `edit` (not `view`): the file is built to leave the building —
 * sponsors, community — so producing it is treated as an organiser action,
 * one notch above reading the leaderboard.
 */
export const maxDuration = 300
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const cohort = await resolveAdminCohort(request.nextUrl.searchParams.get("cohort"))
  const format = request.nextUrl.searchParams.get("format")
  if (format !== "xlsx" && format !== "pdf") {
    return NextResponse.json(
      { success: false, error: "format must be xlsx or pdf" },
      { status: 400 }
    )
  }

  // A whole-number string only — `Number("1e2")` and `Number(" 5 ")` both
  // pass `Number.isInteger`, and neither is what an organiser typed.
  const checkedInParam = request.nextUrl.searchParams.get("checkedIn")
  let checkedInParamValue: number | undefined
  if (checkedInParam !== null) {
    if (!/^[1-9]\d*$/.test(checkedInParam)) {
      return NextResponse.json(
        { success: false, error: "checkedIn must be a positive whole number." },
        { status: 400 }
      )
    }
    checkedInParamValue = Number(checkedInParam)
  }

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      result: true,
      resultsPublishedAt: true,
      resultsSnapshot: true,
      checkedInRecorded: true,
    },
  })
  if (!run) {
    return NextResponse.json(
      { success: false, error: "No final run for this cohort yet." },
      { status: 404 }
    )
  }

  // The query parameter overrides the run's own stored door count for a
  // one-off; with neither given, `undefined` falls through to
  // `buildResultsExport`'s own "no override" honesty rules.
  const checkedInRecorded = checkedInParamValue ?? run.checkedInRecorded ?? undefined

  const teams = extractFrozenTeams(run.result) ?? []

  // Read outside the Promise.all below alongside the other independent
  // lookups — same reasoning as publish/route.ts: `getEventByCohort` uses
  // the module-level Prisma client, so it is a plain query, not something
  // that needs to share a transaction with anything else here.
  const event = await getEventByCohort(cohort)

  const [participants, submissions, scores, reviewRows] = await Promise.all([
    prisma.impactLabParticipant.findMany({
      where: { cohort },
      select: {
        id: true,
        fullName: true,
        email: true,
        primaryRole: true,
        institution: true,
        checkedInAt: true,
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.impactLabSubmission.findMany({
      where: { runId: run.id },
      select: {
        teamId: true,
        projectName: true,
        pitch: true,
        problemTackled: true,
        description: true,
        worksVsMocked: true,
        claudeUsage: true,
        repoUrl: true,
        demoUrl: true,
        videoUrl: true,
        slidesUrl: true,
      },
    }),
    prisma.impactLabScore.findMany({
      where: { runId: run.id },
      select: {
        teamId: true,
        judgeEmail: true,
        judgeName: true,
        scores: true,
        feedback: true,
        writeupOnly: true,
      },
    }),
    prisma.impactLabTeamReview.findMany({
      where: { runId: run.id },
      select: { teamId: true, text: true, approvedAt: true },
    }),
  ])

  const source: ExportSource = {
    cohort,
    publishedAt: run.resultsPublishedAt?.toISOString() ?? null,
    snapshot: parseResultsSnapshot(run.resultsSnapshot),
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      memberIds: t.memberIds,
      leaderId: (t as { leaderId?: string | null }).leaderId ?? null,
      track: (t as { track?: string }).track,
      trackKey: (t as { trackKey?: string }).trackKey,
    })),
    participants: participants.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      email: p.email,
      primaryRole: p.primaryRole,
      institution: p.institution,
      checkedIn: p.checkedInAt !== null,
    })),
    submissions,
    scores: scores.map((s) => ({
      teamId: s.teamId,
      judgeEmail: s.judgeEmail,
      judgeName: s.judgeName,
      sheet: (s.scores ?? {}) as ScoreSheet,
      feedback: s.feedback,
      writeupOnly: s.writeupOnly,
    })),
    // Approved reviews only — publishableReview is the gate every
    // participant-facing surface shares; drafts never leave the admin panel.
    reviews: reviewRows.flatMap((r) => {
      const text = publishableReview(r)
      return text === null ? [] : [{ teamId: r.teamId, text }]
    }),
    tracks: event?.tracks ?? [],
  }

  // Checked against the real registered count, not trusted from the query
  // string alone — an organiser fat-fingering a door count into a figure
  // larger than the guest list would otherwise land on the cover unchallenged.
  if (checkedInRecorded !== undefined && checkedInRecorded > source.participants.length) {
    return NextResponse.json(
      {
        success: false,
        error: `checkedIn (${checkedInRecorded}) cannot exceed the ${source.participants.length} registered participant(s).`,
      },
      { status: 400 }
    )
  }

  // `resolveRubric`, not the code constant: an organiser-authored rubric for
  // this cohort must win, exactly as it does for the judging routes.
  const rubric = await resolveRubric(cohort)
  const data = buildResultsExport(source, rubric, undefined, { checkedInRecorded })
  const stamp = data.generatedAt.toISOString().slice(0, 10)

  // One generation pass per export run — both builders read the same map.
  const wantAnalyses = request.nextUrl.searchParams.get("analyses") !== "off"
  const analyses: ReadonlyMap<string, TeamAnalysis> = wantAnalyses
    ? await generateTeamAnalyses(data.teams)
    : new Map()

  if (format === "xlsx") {
    const includeContacts = request.nextUrl.searchParams.get("contacts") !== "off"
    const buffer = await buildResultsWorkbook(data, analyses, includeContacts)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="impact-lab-results-${cohort}-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    })
  }

  const buffer = await buildResultsPdf(data, analyses)
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="impact-lab-results-${cohort}-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}
