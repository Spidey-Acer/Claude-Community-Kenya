/**
 * `buildResultsPdf`'s render-progress callback — the render half of the
 * export's stage sequence (the other half, `generateTeamAnalyses`'s own
 * progress, is covered in `export-analysis-progress.test.ts`).
 *
 * Asserts the three honesty properties a streamed progress bar depends on:
 * fractions are reported in increasing order, they never leave `[0, 1]`, and
 * the very last one fires before the returned buffer resolves — never after,
 * which would let a client believe the render had already finished.
 */

import { describe, expect, it, vi } from "vitest"
import { buildResultsExport, type ExportSource, type SourceTeam } from "../export-data"
import { IMPACT_LAB_RUBRIC } from "../judging"

// `buildResultsPdf` awaits `brandingForCohort`, which — for a cohort this
// event-store has never heard of — falls through to a DB lookup. Mocked out
// so this test exercises pdfkit's real render path without needing Prisma.
vi.mock("../event-branding", () => ({
  brandingForCohort: vi.fn(async () => ({
    titleLead: "Test:",
    titleAccent: "Cohort",
    title: "Test: Cohort",
    dates: "1 Jan 2026",
    host: "Claude Community Kenya",
    location: "Nairobi, Kenya",
    formatNote: "A test fixture, not a real event.",
  })),
  REPORT_PRODUCER: "Claude Community Kenya",
}))

import { buildResultsPdf } from "../export-pdf"

function scoreSheet(value: number): Record<string, number> {
  return Object.fromEntries(IMPACT_LAB_RUBRIC.criteria.map((c) => [c.key, value]))
}

function team(id: string, name: string): SourceTeam {
  return { id, name, memberIds: [] }
}

function fixtureSource(teamCount: number): ExportSource {
  const teams = Array.from({ length: teamCount }, (_, i) => team(`t${i}`, `Table ${i + 1}`))
  return {
    cohort: "impact-lab-test",
    publishedAt: null,
    snapshot: null,
    teams,
    participants: [],
    submissions: teams.map((t) => ({
      teamId: t.id,
      projectName: `Project ${t.id}`,
      pitch: "A one-line pitch.",
      problemTackled: "A problem worth solving.",
      description: "What it does.",
      worksVsMocked: "Working: the core flow. Mocked: payments.",
      claudeUsage: "Used Claude Code for the whole build.",
      repoUrl: "https://example.com/repo",
      demoUrl: null,
      videoUrl: null,
      slidesUrl: null,
    })),
    scores: teams.map((t) => ({
      teamId: t.id,
      judgeEmail: "judge@example.com",
      judgeName: "A Judge",
      sheet: scoreSheet(4),
      feedback: null,
      writeupOnly: false,
    })),
    reviews: [],
    tracks: [],
  }
}

describe("buildResultsPdf — render progress", () => {
  it("reports fractions in non-decreasing order, each within [0, 1]", async () => {
    const data = buildResultsExport(fixtureSource(2), IMPACT_LAB_RUBRIC)
    const events: { label: string; fraction: number }[] = []

    const buffer = await buildResultsPdf(data, new Map(), (label, fraction) => {
      events.push({ label, fraction })
    })

    expect(events.length).toBeGreaterThan(0)
    for (const { fraction } of events) {
      expect(fraction).toBeGreaterThanOrEqual(0)
      expect(fraction).toBeLessThanOrEqual(1)
    }
    const fractions = events.map((e) => e.fraction)
    expect(fractions).toEqual([...fractions].sort((a, b) => a - b))
    expect(Buffer.isBuffer(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it("reports one event per team profile, in team order, before finalising", async () => {
    const data = buildResultsExport(fixtureSource(3), IMPACT_LAB_RUBRIC)
    const labels: string[] = []

    await buildResultsPdf(data, new Map(), (label) => labels.push(label))

    const profileLabels = labels.filter((l) => l.startsWith("Rendering team profiles"))
    expect(profileLabels).toEqual([
      "Rendering team profiles (1/3)",
      "Rendering team profiles (2/3)",
      "Rendering team profiles (3/3)",
    ])
    expect(labels.indexOf(profileLabels[profileLabels.length - 1])).toBeLessThan(
      labels.indexOf("Finalising the document")
    )
  })

  it("reports 'Finalising the document' exactly once, as the last event before doc.end()", async () => {
    const data = buildResultsExport(fixtureSource(1), IMPACT_LAB_RUBRIC)
    const labels: string[] = []

    const buffer = await buildResultsPdf(data, new Map(), (label) => labels.push(label))

    expect(labels.filter((l) => l === "Finalising the document")).toHaveLength(1)
    expect(labels[labels.length - 1]).toBe("Finalising the document")
    expect(buffer.length).toBeGreaterThan(0)
  })

  it("omitting the callback leaves the render entirely unaffected", async () => {
    const data = buildResultsExport(fixtureSource(1), IMPACT_LAB_RUBRIC)
    const buffer = await buildResultsPdf(data)
    expect(buffer.length).toBeGreaterThan(0)
  })
})
