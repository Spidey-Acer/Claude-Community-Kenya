"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Download, Loader2, Trophy } from "lucide-react"
import { apiGet } from "./api"
import {
  trackWinners,
  type JudgingCriterion,
  type JudgingRubric,
  type TeamStanding,
} from "@/lib/impact-lab/judging"

interface LeaderboardTeam {
  teamId: string
  teamName: string
  memberCount: number
  submission: { projectName: string } | null
}

interface JudgingData {
  finalRunId: string | null
  teams: LeaderboardTeam[]
  standings: TeamStanding[]
  /**
   * Optional only for the transition while the API route is being made
   * cohort-aware. Falls back to Impact Lab, which is what every stored score
   * predating this field was made with.
   */
  rubric?: JudgingRubric
}

/**
 * Organiser-facing leaderboard. Reuses the same `standings` the judge screen
 * writes to — this is not a second aggregation, just a second view of it.
 * `standings()` only returns teams that have at least one score, so a team
 * nobody has touched never appears there; those are the ones most likely to
 * be missed at 5am, so they get their own flagged section here instead of
 * silently sorting to the bottom.
 */
export function LeaderboardTab({ cohort }: { cohort: string }) {
  const [data, setData] = useState<JudgingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await apiGet<JudgingData>(`/api/admin/impact-lab/judging?cohort=${cohort}`))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load standings")
    } finally {
      setLoading(false)
    }
  }, [cohort])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#333]" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]">
        {error ?? "No data"}
      </div>
    )
  }

  if (!data.finalRunId) {
    return (
      <p className="p-8 text-center text-sm font-mono text-[#555]">
        No final run published yet — mark a run final to start judging.
      </p>
    )
  }

  // No fallback rubric: this table is what winners get announced off. Guessing
  // the rubric would label columns and quote totals against criteria the judges
  // never scored, and it would look right.
  const rubric = data.rubric
  if (!rubric) {
    return (
      <p className="p-8 text-center text-sm font-mono text-[#ff3333]" role="alert">
        The judging rubric for this cohort did not load — the leaderboard is
        hidden rather than shown against the wrong criteria. Reload before
        announcing anything.
      </p>
    )
  }

  const nameByTeam = new Map(data.teams.map((t) => [t.teamId, t]))
  const teamNameById = new Map(data.teams.map((t) => [t.teamId, t.teamName]))
  const scoredIds = new Set(data.standings.map((s) => s.teamId))
  const unscored = data.teams.filter((t) => !scoredIds.has(t.teamId))
  const { winners, champion } = trackWinners(data.standings, teamNameById)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-[#555]">
          <span className="font-semibold text-[#00ff41]">{data.standings.length}</span> /{" "}
          {data.teams.length} teams have at least one score
        </p>
        <a
          href={`/api/admin/impact-lab/judging/export?cohort=${cohort}`}
          className="flex items-center gap-1.5 rounded border border-[#1e1e1e] bg-[#1a1a1a] px-3 py-1.5 text-[11px] font-mono text-[#888] hover:bg-[#222]"
        >
          <Download className="h-3 w-3" /> Download results CSV
        </a>
      </div>

      {/* The program promises a per-track winner AND an overall champion — the
          ranked table below answers "who scored highest overall", not "who won
          Kilimo", so both need their own surface rather than making someone
          eyeball it off the full list at 5am. */}
      {champion && (
        <div className="flex items-center gap-3 rounded-lg border border-[#ffb000]/40 bg-[#ffb000]/10 p-4">
          <Trophy className="h-6 w-6 shrink-0 text-[#ffb000]" />
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#ffb000]">
              Overall champion
            </p>
            <p className="text-base font-mono font-bold text-[#e0e0e0]">{champion.teamName}</p>
            <p className="text-[11px] font-mono text-[#888]">
              {champion.track} · {champion.average}/{rubric.totalOutOf} · {champion.judgeCount} judge
              {champion.judgeCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      )}

      {winners.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-mono uppercase tracking-wider text-[#555]">
            Track winners
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {winners.map((w) => (
              <div
                key={w.track}
                className={`rounded-lg border p-3 ${
                  w.teamId === champion?.teamId
                    ? "border-[#ffb000]/40 bg-[#ffb000]/5"
                    : "border-[#1e1e1e] bg-[#0d0d0d]"
                }`}
              >
                <p className="truncate text-[9px] font-mono uppercase tracking-wider text-[#555]">
                  {w.track}
                </p>
                <p className="mt-0.5 truncate text-[12px] font-mono font-semibold text-[#e0e0e0]">
                  {w.teamName}
                </p>
                <p className="text-[11px] font-mono text-[#00ff41]">{w.average}/{rubric.totalOutOf}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {unscored.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-3 text-[11px] font-mono text-[#ff3333]"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Not yet scored by any judge:{" "}
            {unscored.map((t) => t.teamName).join(", ")}
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-[#1e1e1e] bg-[#0d0d0d]">
        {data.standings.length === 0 ? (
          <p className="p-8 text-center text-sm font-mono text-[#555]">No scores recorded yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {[
                  "Rank",
                  "Team",
                  "Project",
                  "Judges",
                  "Average",
                  ...rubric.criteria.map((c: JudgingCriterion) => c.label),
                ].map(
                  (h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-mono font-semibold uppercase tracking-wider text-[#555]"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {data.standings.map((s, i) => {
                const team = nameByTeam.get(s.teamId)
                return (
                  <tr key={s.teamId} className="hover:bg-[#111]">
                    <td className="px-4 py-3 text-[11px] font-mono text-[#555]">{i + 1}</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-[#e0e0e0]">
                      {team?.teamName ?? s.teamId}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-[#888]">
                      {team?.submission?.projectName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-[#888]">
                      {s.judgeCount}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono font-semibold text-[#00ff41]">
                      {s.average}
                    </td>
                    {rubric.criteria.map((c: JudgingCriterion) => (
                      <td key={c.key} className="px-4 py-3 text-[11px] font-mono text-[#888]">
                        {s.criterionAverages[c.key] ?? 0}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
