"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Download, Loader2 } from "lucide-react"
import { apiGet } from "./api"
import { JUDGING_CRITERIA } from "@/lib/impact-lab/judging"

interface LeaderboardTeam {
  teamId: string
  teamName: string
  memberCount: number
  submission: { projectName: string } | null
}

interface Standing {
  teamId: string
  average: number
  judgeCount: number
  criterionAverages: Record<string, number>
}

interface JudgingData {
  finalRunId: string | null
  teams: LeaderboardTeam[]
  standings: Standing[]
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

  const nameByTeam = new Map(data.teams.map((t) => [t.teamId, t]))
  const scoredIds = new Set(data.standings.map((s) => s.teamId))
  const unscored = data.teams.filter((t) => !scoredIds.has(t.teamId))

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
                {["Rank", "Team", "Project", "Judges", "Average", ...JUDGING_CRITERIA.map((c) => c.label)].map(
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
                    {JUDGING_CRITERIA.map((c) => (
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
