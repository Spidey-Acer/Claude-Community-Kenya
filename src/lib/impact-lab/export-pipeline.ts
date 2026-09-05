/**
 * Impact Lab results export — the shared build pipeline.
 *
 * Everything `GET /api/admin/impact-lab/results/export` used to do inline:
 * validate the request, load the run and its records, assemble the
 * `ResultsExport`, generate team analyses, and hand off to the Excel or PDF
 * builder. Extracted so the plain (byte-streamed) export route and the
 * progress-streaming route (`export/stream/route.ts`) run the exact same
 * pipeline instead of two copies that could drift — and so a stream consumer
 * never triggers a second, paid pass of `generateTeamAnalyses` just to watch
 * the first one work.
 *
 * `buildExportArtefact` takes an optional `ExportProgressListener` (see
 * `export-progress.ts`); the plain route calls it with none, which costs
 * nothing beyond the reporter's own no-op branch.
 */

import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { getEventByCohort, resolveAdminCohort } from "./event-store"
import { extractFrozenTeams } from "./member"
import type { ScoreSheet } from "./judging"
import { resolveRubric } from "./rubric-store"
import { buildResultsExport, parseResultsSnapshot, type ExportSource } from "./export-data"
import { buildResultsWorkbook } from "./export-excel"
import { buildResultsPdf } from "./export-pdf"
import { publishableReview } from "./reviews"
import { generateTeamAnalyses, type TeamAnalysis } from "./export-analysis"
import { createProgressReporter, type ExportProgressListener } from "./export-progress"

/** A validation or not-found failure the route layer turns into a JSON response. */
export class ExportError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = "ExportError"
    this.status = status
  }
}

export interface ExportArtefact {
  buffer: Buffer
  filename: string
  contentType: string
}

const CONTENT_TYPES = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const

/**
 * Build the requested export end to end. Throws `ExportError` for anything
 * that must reach the caller as a 4xx (bad `format`, malformed or
 * out-of-range `checkedIn`, no final run) — everything else propagates as an
 * ordinary error, exactly as the original inline route left unhandled
 * failures to Next's default 500.
 */
export async function buildExportArtefact(
  request: NextRequest,
  onProgress?: ExportProgressListener
): Promise<ExportArtefact> {
  const reporter = createProgressReporter(onProgress)

  const cohort = await resolveAdminCohort(request.nextUrl.searchParams.get("cohort"))
  const format = request.nextUrl.searchParams.get("format")
  if (format !== "xlsx" && format !== "pdf") {
    throw new ExportError("format must be xlsx or pdf", 400)
  }

  // A whole-number string only — `Number("1e2")` and `Number(" 5 ")` both
  // pass `Number.isInteger`, and neither is what an organiser typed.
  const checkedInParam = request.nextUrl.searchParams.get("checkedIn")
  let checkedInRecorded: number | undefined
  if (checkedInParam !== null) {
    if (!/^[1-9]\d*$/.test(checkedInParam)) {
      throw new ExportError("checkedIn must be a positive whole number.", 400)
    }
    checkedInRecorded = Number(checkedInParam)
  }

  reporter.report("loading", "Loading event data", 2)

  const run = await prisma.impactLabMatchRun.findFirst({
    where: { cohort, isFinal: true },
    orderBy: { createdAt: "desc" },
    select: { id: true, result: true, resultsPublishedAt: true, resultsSnapshot: true },
  })
  if (!run) {
    throw new ExportError("No final run for this cohort yet.", 404)
  }

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

  reporter.report("loading", "Loading event data", 8)

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
    throw new ExportError(
      `checkedIn (${checkedInRecorded}) cannot exceed the ${source.participants.length} registered participant(s).`,
      400
    )
  }

  // `resolveRubric`, not the code constant: an organiser-authored rubric for
  // this cohort must win, exactly as it does for the judging routes.
  const rubric = await resolveRubric(cohort)
  const data = buildResultsExport(source, rubric, undefined, { checkedInRecorded })
  const stamp = data.generatedAt.toISOString().slice(0, 10)

  // One generation pass per export run — both builders read the same map.
  const wantAnalyses = request.nextUrl.searchParams.get("analyses") !== "off"
  let analyses: ReadonlyMap<string, TeamAnalysis> = new Map()
  if (wantAnalyses) {
    const total = data.teams.filter((t) => t.submission !== null).length
    reporter.report("analysing", `Generating team analyses (0/${total})`, 8)
    analyses = await generateTeamAnalyses(data.teams, (completed, teamTotal) => {
      // 8–70: by far the slowest phase — one model call per team, four
      // concurrent. Collapses to a single jump were `wantAnalyses` false,
      // which the branch below (no analyses at all) already handles.
      const percent = teamTotal > 0 ? 8 + (62 * completed) / teamTotal : 70
      reporter.report("analysing", `Generating team analyses (${completed}/${teamTotal})`, percent)
    })
  }

  reporter.report(
    "rendering",
    format === "xlsx" ? "Building the workbook" : "Building the PDF",
    70
  )

  const includeContacts = request.nextUrl.searchParams.get("contacts") !== "off"

  let buffer: Buffer
  if (format === "xlsx") {
    // exceljs's build is synchronous CPU work over data already in memory —
    // materially faster than the PDF's per-team layout pass, so one report
    // before and after is honest; a spinner alone would not be, since this
    // phase still spends the same 8–70 band on `generateTeamAnalyses` above
    // when analyses are requested (the default).
    buffer = await buildResultsWorkbook(data, analyses, includeContacts)
    reporter.report("rendering", "Building the workbook", 96)
  } else {
    buffer = await buildResultsPdf(data, analyses, (label, fraction) => {
      reporter.report("rendering", label, 70 + fraction * 27)
    })
  }

  reporter.report("finalising", "Preparing your download", 99)

  const artefact: ExportArtefact = {
    buffer,
    filename: `impact-lab-results-${cohort}-${stamp}.${format}`,
    contentType: CONTENT_TYPES[format],
  }

  // The one call to `done()` in this whole pipeline, placed after `artefact`
  // is fully built — never before. `export/stream/route.ts` sends its own
  // separate terminal `{type:"done", data:…}` frame carrying the artefact
  // itself once this function returns; this event exists so a listener that
  // only cares about the percentage (not the bytes) still gets an honest
  // 100 the moment the file is real, not a moment before.
  reporter.done("Your download is ready")

  return artefact
}
