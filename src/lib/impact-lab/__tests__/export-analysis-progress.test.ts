/**
 * `generateTeamAnalyses`'s `onProgress` callback — the only source of
 * granularity inside the export's slowest phase (one Sonnet call per team,
 * four concurrent). Asserts it fires once per team with submission,
 * `completed` strictly increasing to `total`, regardless of whether a given
 * team's generation succeeds or fails soft (see the module's fail-soft rule
 * — a rejected call must still advance the count, or the bar would stall on
 * exactly the team a flaky call landed on).
 */

import { describe, expect, it, vi } from "vitest"
import type { ExportTeam } from "../export-data"

const generateObjectMock = vi.fn()
vi.mock("ai", () => ({ generateObject: (...args: unknown[]) => generateObjectMock(...args) }))
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: () => (model: string) => model,
}))

import { generateTeamAnalyses } from "../export-analysis"

function team(id: string, withSubmission: boolean): ExportTeam {
  return {
    teamId: id,
    teamName: `Table ${id}`,
    projectDisplayName: `Project ${id}`,
    tableLabel: `Table ${id}`,
    track: "Elimu",
    members: [],
    submission: withSubmission
      ? {
          projectName: `Project ${id}`,
          pitch: "A pitch",
          problemTackled: "A problem",
          description: "A description",
          worksVsMocked: "Working: X. Mocked: Y.",
          claudeUsage: "Used Claude Code throughout.",
          repoUrl: "https://example.com/repo",
          demoUrl: null,
          videoUrl: null,
          slidesUrl: null,
        }
      : null,
    judgeScores: [],
    average: null,
    scoreLow: null,
    scoreHigh: null,
    judgeCount: 0,
    criterionAverages: {},
    finalRank: null,
    finalRankBasis: null,
    scoreRank: null,
    scoredFromWriteup: false,
    isTrackWinner: false,
    isChampion: false,
    communityReview: null,
  }
}

describe("generateTeamAnalyses — onProgress", () => {
  it("reports one completion per team with a submission, in increasing order, up to the total", async () => {
    generateObjectMock.mockResolvedValue({ object: { whatTheyBuilt: "x", whoItServes: "y", workingVsMocked: "z", claudeUse: "w" } })
    const teams = [team("1", true), team("2", true), team("3", true), team("4", false)]

    const calls: { completed: number; total: number }[] = []
    const analyses = await generateTeamAnalyses(teams, (completed, total) => {
      calls.push({ completed, total })
    })

    expect(calls).toHaveLength(3) // only the 3 teams with a submission count
    expect(calls.every((c) => c.total === 3)).toBe(true)
    const completions = calls.map((c) => c.completed).sort((a, b) => a - b)
    expect(completions).toEqual([1, 2, 3])
    expect(analyses.size).toBe(3)
  })

  it("still advances the count when a team's generation fails soft", async () => {
    generateObjectMock
      .mockResolvedValueOnce({ object: { whatTheyBuilt: "x", whoItServes: "y", workingVsMocked: "z", claudeUse: "w" } })
      .mockRejectedValueOnce(new Error("model unavailable"))
    const teams = [team("1", true), team("2", true)]

    const calls: { completed: number; total: number }[] = []
    const analyses = await generateTeamAnalyses(teams, (completed, total) => {
      calls.push({ completed, total })
    })

    expect(calls).toHaveLength(2) // the failed team is counted, not skipped
    expect(calls.map((c) => c.completed).sort((a, b) => a - b)).toEqual([1, 2])
    expect(analyses.size).toBe(1) // but its analysis is simply absent — fail-soft
  })

  it("never calls onProgress when no team has a submission", async () => {
    const onProgress = vi.fn()
    await generateTeamAnalyses([team("1", false)], onProgress)
    expect(onProgress).not.toHaveBeenCalled()
  })
})
