"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import { apiGet } from "./api"
import { JUDGING_CRITERIA, type JudgingCriterion } from "@/lib/impact-lab/judging"

interface AuditSheet {
  teamId: string
  teamName: string
  projectName: string | null
  total: number
  scores: Record<string, number>
  writeupOnly: boolean
  scoredAt: string
}

interface JudgeAudit {
  judgeEmail: string
  judgeName: string
  teamsScored: number
  mean: number
  firstScoredAt: string
  lastScoredAt: string
  sheets: AuditSheet[]
}

interface AuditData {
  judges: JudgeAudit[]
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" })
}

/**
 * Per-judge audit.
 *
 * Four judges scored this hackathon on visibly different scales — means
 * roughly 24 points apart on a 100-point total. An aggregate leaderboard
 * hides that entirely, and it changes how the whole result should be read,
 * so the calibration gap is the first thing rendered here rather than
 * something an organiser has to compute from the sheets below.
 */
export function JudgesTab({ cohort }: { cohort: string }) {
  const [data, setData] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await apiGet<AuditData>(`/api/admin/impact-lab/judging/audit?cohort=${cohort}`))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load judge audit")
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

  if (data.judges.length === 0) {
    return (
      <p className="p-8 text-center text-sm font-mono text-[#555]">
        No final run published yet — mark a run final to see judge activity.
      </p>
    )
  }

  const toggle = (email: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  const byMean = [...data.judges].sort((a, b) => b.mean - a.mean)
  const highest = byMean[0]
  const lowest = byMean[byMean.length - 1]
  const spread = Math.round((highest.mean - lowest.mean) * 10) / 10

  return (
    <div className="space-y-4">
      {data.judges.length > 1 && (
        <div className="rounded-lg border border-[#ffb000]/40 bg-[#ffb000]/10 p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#ffb000]">
            Calibration spread
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] font-mono">
            <span className="text-[#e0e0e0]">
              Highest — <span className="text-[#00ff41]">{highest.judgeName}</span> ({highest.mean})
            </span>
            <span className="text-[#555]">vs</span>
            <span className="text-[#e0e0e0]">
              Lowest — <span className="text-[#ff3333]">{lowest.judgeName}</span> ({lowest.mean})
            </span>
            <span className="text-[#888]">
              gap: <span className="font-semibold text-[#ffb000]">{spread}</span> points out of 100
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {data.judges.map((judge) => {
          const isOpen = expanded.has(judge.judgeEmail)
          return (
            <div
              key={judge.judgeEmail}
              className="overflow-hidden rounded-lg border border-[#1e1e1e] bg-[#0d0d0d]"
            >
              <button
                onClick={() => toggle(judge.judgeEmail)}
                className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left hover:bg-[#111]"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#555]" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#555]" />
                  )}
                  <span className="text-[12px] font-mono font-semibold text-[#e0e0e0]">
                    {judge.judgeName}
                  </span>
                  <span className="text-[10px] font-mono text-[#555]">{judge.judgeEmail}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-mono text-[#888]">
                  <span>{judge.teamsScored} teams</span>
                  <span className="font-semibold text-[#00ff41]">mean {judge.mean}</span>
                  <span className="text-[#555]">
                    {formatTime(judge.firstScoredAt)} &ndash; {formatTime(judge.lastScoredAt)}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="overflow-x-auto border-t border-[#1e1e1e]">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1e1e1e]">
                        {[
                          "Team",
                          "Project",
                          ...JUDGING_CRITERIA.map((c: JudgingCriterion) => c.label),
                          "Total",
                          "Basis",
                        ].map((h) => (
                          <th
                            key={h}
                            className="whitespace-nowrap px-4 py-2 text-left text-[10px] font-mono font-semibold uppercase tracking-wider text-[#555]"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#141414]">
                      {judge.sheets.map((sheet) => (
                        <tr key={sheet.teamId} className="hover:bg-[#111]">
                          <td className="whitespace-nowrap px-4 py-2 text-[11px] font-mono text-[#e0e0e0]">
                            {sheet.teamName}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-[11px] font-mono text-[#888]">
                            {sheet.projectName ?? "—"}
                          </td>
                          {JUDGING_CRITERIA.map((c: JudgingCriterion) => (
                            <td key={c.key} className="px-4 py-2 text-[11px] font-mono text-[#888]">
                              {sheet.scores[c.key] ?? "—"}
                            </td>
                          ))}
                          <td className="px-4 py-2 text-[11px] font-mono font-semibold text-[#00ff41]">
                            {sheet.total}
                          </td>
                          <td className="whitespace-nowrap px-4 py-2 text-[11px] font-mono text-[#555]">
                            {sheet.writeupOnly ? "Write-up" : "Live demo"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
