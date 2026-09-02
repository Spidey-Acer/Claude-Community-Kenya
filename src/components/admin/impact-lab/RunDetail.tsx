"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { apiGet } from "./api"
import type { MatchResult } from "./types"

/** The subset of GET /runs/[id]'s response this view renders. */
interface RunDetailData {
  id: string
  result: MatchResult
  /** Explanations frozen at save time (usually Claude's); null on legacy runs. */
  explanations: { teamId: string; summary: string; source: "deterministic" | "ai" }[] | null
}

/** Minimal shape needed to resolve a member id to a display name. */
interface DirectoryEntry {
  fullName: string
}

const DIMENSION_LABEL: Record<string, string> = {
  roleCoverage: "Role coverage",
  skillBalance: "Skill diversity",
  experienceBalance: "Experience balance",
  interestAlignment: "Shared interests",
  availabilityOverlap: "Availability",
  participantPreferences: "Preferences",
}

interface RunDetailProps {
  runId: string
  /** Participant directory (id → name) for the run's cohort, loaded by the parent tab. */
  directory: Map<string, DirectoryEntry>
}

/** Expanded-row detail for a saved matching run: teams, members, scores, warnings. */
export function RunDetail({ runId, directory }: RunDetailProps) {
  const [detail, setDetail] = useState<RunDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiGet<RunDetailData>(`/api/admin/impact-lab/runs/${runId}`)
      .then((data) => { if (!cancelled) setDetail(data) })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load run detail") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [runId])

  if (loading) {
    return (
      <div className="p-6 text-center bg-[#0a0a0a] border-t border-[#1e1e1e]">
        <Loader2 className="w-4 h-4 animate-spin text-[#333] mx-auto" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-3 bg-[#0a0a0a] border-t border-[#1e1e1e] text-[11px] font-mono text-[#ff3333]">
        {error}
      </div>
    )
  }

  if (!detail) return null

  const { result } = detail
  const summaryByTeam = new Map(
    (detail.explanations ?? []).map((e) => [e.teamId, e])
  )

  return (
    <div className="p-4 space-y-3 bg-[#0a0a0a] border-t border-[#1e1e1e]">
      {result.warnings.length > 0 && (
        <div className="p-2 bg-[#ffb000]/5 border border-[#ffb000]/20 rounded text-[11px] font-mono text-[#ffb000] space-y-0.5">
          {result.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {result.teams.map((team) => (
          <div key={team.id} className="p-3 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono text-[#e0e0e0]">
                {team.name}
                {team.locked && <span className="ml-2 text-[10px] text-[#ffb000]">[locked]</span>}
                {team.trackKey && (
                  <span className="ml-2 rounded border border-[#00d4ff]/30 px-1.5 py-0.5 text-[9px] text-[#00d4ff]">
                    {team.trackKey}
                  </span>
                )}
              </div>
              <div className="text-xs font-mono font-bold text-[#00ff41]">
                {team.score.total}<span className="text-[#444]">/100</span>
              </div>
            </div>

            <div className="space-y-1">
              {team.memberIds.map((id) => (
                <div key={id} className="text-[11px] font-mono text-[#aaa]">
                  {directory.get(id)?.fullName ?? id}
                </div>
              ))}
            </div>

            {summaryByTeam.has(team.id) && (
              <p className="text-[11px] leading-relaxed text-[#8a8a8a] border-l-2 border-[#00ff41]/30 pl-2">
                {summaryByTeam.get(team.id)!.summary}
                {summaryByTeam.get(team.id)!.source === "ai" && (
                  <span className="ml-1.5 text-[9px] font-mono uppercase text-[#00ff41]/60">claude</span>
                )}
              </p>
            )}

            <div className="space-y-1 pt-1">
              {team.score.dimensions.map((d) => (
                <div key={d.key} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[#555] w-28 flex-shrink-0">{DIMENSION_LABEL[d.key] ?? d.key}</span>
                  <div className="flex-1 h-1.5 bg-[#161616] rounded overflow-hidden">
                    <div className="h-full bg-[#00ff41]/60" style={{ width: `${Math.round(d.raw * 100)}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-[#666] w-8 text-right">{Math.round(d.raw * 100)}%</span>
                </div>
              ))}
            </div>

            {team.score.penalties.length > 0 && (
              <div className="text-[10px] font-mono text-[#ff3333]/80 space-y-0.5">
                {team.score.penalties.map((p, i) => <div key={i}>−{p.points} {p.reason}</div>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {result.unassignedIds.length > 0 && (
        <div className="p-2 bg-[#0d0d0d] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#888]">
          <span className="text-[#555]">Unassigned:</span>{" "}
          {result.unassignedIds.map((id) => directory.get(id)?.fullName ?? id).join(", ")}
        </div>
      )}
    </div>
  )
}
