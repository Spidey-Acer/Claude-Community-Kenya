"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Search } from "lucide-react"
import { apiGet } from "./api"
import { findTeamMatches, type TeamLookupMatch } from "@/lib/impact-lab/team-lookup"
import type { MatchResult, ParticipantRow, RunSummary } from "./types"

interface TeamLookupProps {
  cohort: string
}

/** The subset of GET /runs/[id]'s response this lookup needs. */
interface RunDetailData {
  id: string
  result: MatchResult
}

/** How long to wait after the last keystroke before re-filtering. */
const SEARCH_DEBOUNCE_MS = 150

/**
 * Check-in desk "which team am I in?" lookup. Loads the cohort's final run
 * (falling back to the newest draft) plus the participant directory once,
 * then filters client-side as the desk crew types — no per-keystroke API call.
 */
export function TeamLookup({ cohort }: TeamLookupProps) {
  const [teams, setTeams] = useState<MatchResult["teams"]>([])
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [sourceNote, setSourceNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rawSearch, setRawSearch] = useState("")
  const [search, setSearch] = useState("")

  useEffect(() => {
    const handle = setTimeout(() => setSearch(rawSearch), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [rawSearch])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [runs, participantRows] = await Promise.all([
          apiGet<RunSummary[]>(`/api/admin/impact-lab/runs?cohort=${cohort}`),
          apiGet<ParticipantRow[]>(`/api/admin/impact-lab/participants?cohort=${cohort}`),
        ])
        if (cancelled) return
        setParticipants(participantRows)

        if (runs.length === 0) {
          setTeams([])
          setSourceNote(null)
          return
        }
        // Runs are returned newest-first, so runs[0] is the newest draft fallback.
        const finalRun = runs.find((r) => r.isFinal)
        const chosen = finalRun ?? runs[0]
        const detail = await apiGet<RunDetailData>(`/api/admin/impact-lab/runs/${chosen.id}`)
        if (cancelled) return
        setTeams(detail.result.teams)
        setSourceNote(finalRun ? null : "No final run yet — showing the latest draft.")
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load teams")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [cohort])

  const matches: TeamLookupMatch[] = useMemo(
    () => findTeamMatches(teams, participants, search),
    [teams, participants, search]
  )

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-3 space-y-2">
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[#444] pointer-events-none" />
        <label htmlFor="team-lookup-search" className="sr-only">
          Find a person&apos;s team by name or email
        </label>
        <input
          id="team-lookup-search"
          type="search"
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
          placeholder="Find a person's team — name or email…"
          className="pl-7 pr-2 py-2 w-full bg-[#111] border border-[#1e1e1e] rounded text-[13px] font-mono text-[#e0e0e0] placeholder:text-[#444] focus:outline-none focus:border-[#00ff41]/40"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-[11px] font-mono text-[#555]">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading teams…
        </div>
      )}

      {error && (
        <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
          {error}
        </div>
      )}

      {!loading && !error && sourceNote && (
        <div className="text-[10px] font-mono text-[#ffb000]">{sourceNote}</div>
      )}

      {!loading && !error && search.trim() && (
        matches.length === 0 ? (
          <div className="text-[11px] font-mono text-[#555]">No one matches &quot;{search}&quot;.</div>
        ) : (
          <ul className="divide-y divide-[#141414]">
            {matches.map((m) => (
              <li key={m.participantId} className="py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-mono text-[#e0e0e0]">{m.fullName}</span>
                  <span className="text-[11px] font-mono text-[#555]">{m.email}</span>
                  {m.onTeam ? (
                    <>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41]">
                        {m.table != null ? `Table ${m.table} · ${m.teamName}` : m.teamName}
                      </span>
                      {m.trackKey && (
                        <span className="rounded border border-[#00d4ff]/30 px-1.5 py-0.5 text-[9px] font-mono text-[#00d4ff]">
                          {m.trackKey}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ffb000]/10 border border-[#ffb000]/30 text-[#ffb000]">
                      Not on a team yet, place at the desk
                    </span>
                  )}
                </div>
                {m.onTeam && m.teammates.length > 0 && (
                  <div className="mt-1 text-[11px] font-mono text-[#888]">
                    With: {m.teammates.join(", ")}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  )
}
