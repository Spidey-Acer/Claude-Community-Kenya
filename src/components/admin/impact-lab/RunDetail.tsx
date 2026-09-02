"use client"

import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight, Download, Loader2 } from "lucide-react"
import { apiGet, apiSend } from "./api"
import { buildFinalList, type FinalListTeamInput } from "@/lib/impact-lab/final-list"
import { extractJoinRequests } from "@/lib/impact-lab/roster"
import type { MatchResult } from "./types"

/** The subset of GET /runs/[id]'s response this view renders. */
interface RunDetailData {
  id: string
  result: MatchResult
  /** Explanations frozen at save time (usually Claude's); null on legacy runs. */
  explanations: { teamId: string; summary: string; source: "deterministic" | "ai" }[] | null
}

/** Minimal shape needed to resolve a member id to a display name and check-in state. */
interface DirectoryEntry {
  fullName: string
  /** ISO timestamp, or null/absent if this participant hasn't checked in. */
  checkedInAt?: string | null
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
  /** Notified after a successful move, so the parent's row summary (team/unassigned counts) can refresh. */
  onChanged?: () => void
}

/** Response from the move branch of PATCH /api/admin/impact-lab/runs/[id]. */
interface MoveResponse extends RunDetailData {
  warning?: string
}

/** Expanded-row detail for a saved matching run: teams, members, scores, warnings. */
export function RunDetail({ runId, directory, onChanged }: RunDetailProps) {
  const [detail, setDetail] = useState<RunDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [moveWarning, setMoveWarning] = useState<string | null>(null)
  const [movingId, setMovingId] = useState<string | null>(null)
  const [settingTableId, setSettingTableId] = useState<string | null>(null)
  const [numberingTables, setNumberingTables] = useState(false)
  const [lockBusy, setLockBusy] = useState(false)
  const [confirmingLock, setConfirmingLock] = useState(false)
  // null until the organiser toggles it explicitly — until then, the panel's
  // open state follows the lock (open once locked, closed otherwise).
  const [finalListOpen, setFinalListOpen] = useState<boolean | null>(null)

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

  /** Move a participant onto `toTeamId`, or unassign them when it's null. */
  async function move(participantId: string, toTeamId: string | null) {
    setMovingId(participantId)
    setError(null)
    setMoveWarning(null)
    try {
      const response = await apiSend<MoveResponse>(`/api/admin/impact-lab/runs/${runId}`, "PATCH", {
        move: { participantId, toTeamId },
      })
      setDetail(response)
      setMoveWarning(response.warning ?? null)
      onChanged?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to move participant")
    } finally {
      setMovingId(null)
    }
  }

  /** Set (or clear, on empty input) one team's table number. */
  async function setTable(teamId: string, table: number | null) {
    setSettingTableId(teamId)
    setError(null)
    try {
      const response = await apiSend<RunDetailData>(`/api/admin/impact-lab/runs/${runId}`, "PATCH", {
        table: { teamId, table },
      })
      setDetail(response)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set table number")
    } finally {
      setSettingTableId(null)
    }
  }

  /** Backfill table numbers for any team in this run that doesn't have one. */
  async function numberTables() {
    setNumberingTables(true)
    setError(null)
    try {
      const response = await apiSend<RunDetailData>(`/api/admin/impact-lab/runs/${runId}`, "PATCH", {
        numberTables: true,
      })
      setDetail(response)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to number tables")
    } finally {
      setNumberingTables(false)
    }
  }

  /**
   * Lock (or unlock) the roster. Locking is the "Finalize teams" action —
   * organiser move/unassign keeps working either way, only the member
   * self-service add/drop route reads this flag.
   */
  async function setRosterLock(lockRoster: boolean) {
    setLockBusy(true)
    setError(null)
    try {
      const response = await apiSend<RunDetailData>(`/api/admin/impact-lab/runs/${runId}`, "PATCH", {
        lockRoster,
      })
      setDetail(response)
      setConfirmingLock(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update the roster lock")
    } finally {
      setLockBusy(false)
    }
  }

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

  const rosterLocked = result.rosterLocked === true
  const finalListIsOpen = finalListOpen ?? rosterLocked

  const trackLabelByKey = new Map(
    (result.settingsUsed?.tracks ?? []).map((t) => [t.key, t.label])
  )
  const finalListTeams: FinalListTeamInput[] = result.teams.map((t) => ({
    id: t.id,
    name: t.name,
    table: (t as { table?: number | null }).table ?? null,
    trackKey: t.trackKey ?? null,
    memberIds: t.memberIds,
  }))
  const finalListParticipants = Array.from(directory.entries()).map(([id, entry]) => ({
    id,
    fullName: entry.fullName,
    checkedIn: Boolean(entry.checkedInAt),
  }))
  const finalList = buildFinalList(finalListTeams, finalListParticipants)
  // Stored on the run's result JSON by the member "ask to join a team" route,
  // which predates no schema for it — read tolerantly, never typed onto
  // MatchResult, so an older run simply shows zero.
  const openJoinRequests = extractJoinRequests(result).filter((r) => r.status === "open")

  return (
    <div className="p-4 space-y-3 bg-[#0a0a0a] border-t border-[#1e1e1e]">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-[#0d0d0d] border border-[#1e1e1e] rounded">
        {rosterLocked ? (
          <button
            onClick={() => setRosterLock(false)}
            disabled={lockBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41] disabled:opacity-40"
          >
            {lockBusy && <Loader2 className="w-3 h-3 animate-spin" />}
            Teams locked · Unlock
          </button>
        ) : confirmingLock ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono text-[#ffb000]">
              Lock the roster? Members lose add/drop; the desk can still move people.
            </span>
            <button
              onClick={() => setRosterLock(true)}
              disabled={lockBusy}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#ffb000]/10 hover:bg-[#ffb000]/20 border border-[#ffb000]/30 rounded text-[11px] font-mono text-[#ffb000] disabled:opacity-40"
            >
              {lockBusy && <Loader2 className="w-3 h-3 animate-spin" />}
              Confirm lock
            </button>
            <button
              onClick={() => setConfirmingLock(false)}
              disabled={lockBusy}
              className="px-2.5 py-1 text-[11px] font-mono text-[#888] hover:text-[#ccc]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingLock(true)}
            className="px-3 py-1.5 bg-[#ffb000]/10 hover:bg-[#ffb000]/20 border border-[#ffb000]/30 rounded text-[11px] font-mono font-semibold text-[#ffb000]"
          >
            Finalize teams
          </button>
        )}
      </div>

      {result.warnings.length > 0 && (
        <div className="p-2 bg-[#ffb000]/5 border border-[#ffb000]/20 rounded text-[11px] font-mono text-[#ffb000] space-y-0.5">
          {result.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}

      {moveWarning && (
        <div className="p-2 bg-[#ffb000]/5 border border-[#ffb000]/20 rounded text-[11px] font-mono text-[#ffb000]">
          ⚠ {moveWarning}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={numberTables}
          disabled={numberingTables}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[10px] font-mono text-[#888] disabled:opacity-40"
        >
          {numberingTables ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Number tables 1..N
        </button>
      </div>

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

            <div className="flex items-center gap-2 text-[10px] font-mono text-[#888]">
              {typeof team.table === "number" && <span className="text-[#ffb000]">Table {team.table}</span>}
              <label htmlFor={`table-${team.id}`} className="sr-only">
                {`Set table number for ${team.name}`}
              </label>
              <input
                id={`table-${team.id}`}
                type="number"
                min={1}
                max={200}
                placeholder="Table #"
                defaultValue={team.table ?? ""}
                disabled={settingTableId === team.id}
                onBlur={(e) => {
                  const raw = e.target.value.trim()
                  const value = raw === "" ? null : Number(raw)
                  if (value !== null && (!Number.isInteger(value) || value < 1 || value > 200)) return
                  if (value === (team.table ?? null)) return
                  setTable(team.id, value)
                }}
                className="w-16 bg-[#111] border border-[#1e1e1e] rounded px-1.5 py-0.5 text-[#ccc]"
              />
            </div>

            <div className="space-y-1">
              {team.memberIds.map((id) => (
                <div key={id} className="flex items-center justify-between gap-2 text-[11px] font-mono text-[#aaa]">
                  <span className="truncate">{directory.get(id)?.fullName ?? id}</span>
                  <select
                    aria-label={`Move ${directory.get(id)?.fullName ?? id}`}
                    value={team.id}
                    disabled={movingId === id}
                    onChange={(e) => {
                      const value = e.target.value
                      move(id, value === "__unassign__" ? null : value)
                    }}
                    className="shrink-0 bg-[#111] border border-[#1e1e1e] rounded px-1 py-0.5 text-[10px] text-[#ccc]"
                  >
                    {result.teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                    <option value="__unassign__">Unassign</option>
                  </select>
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
        <div className="p-2 bg-[#0d0d0d] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#888] space-y-1.5">
          <span className="text-[#555]">Unassigned:</span>
          {result.unassignedIds.map((id) => (
            <div key={id} className="flex items-center justify-between gap-2">
              <span className="truncate">{directory.get(id)?.fullName ?? id}</span>
              <select
                aria-label={`Add ${directory.get(id)?.fullName ?? id} to a team`}
                value=""
                disabled={movingId === id}
                onChange={(e) => {
                  if (e.target.value) move(id, e.target.value)
                }}
                className="shrink-0 bg-[#111] border border-[#1e1e1e] rounded px-1 py-0.5 text-[10px] text-[#ccc]"
              >
                <option value="" disabled>Add to…</option>
                {result.teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      <section className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setFinalListOpen(!finalListIsOpen)}
          aria-expanded={finalListIsOpen}
          className="flex w-full items-center justify-between px-3 py-2 text-left"
        >
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#888]">
            Final list
          </span>
          {finalListIsOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#555]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#555]" />
          )}
        </button>

        {finalListIsOpen && (
          <div className="border-t border-[#1e1e1e] p-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-mono text-[#888]">
                {finalList.summary.teamCount} teams · {finalList.summary.placedCount} placed ·{" "}
                {finalList.summary.checkedInCount} checked in ·{" "}
                {finalList.summary.checkedInWithoutTeamCount} checked in without a team
              </p>
              <a
                href={`/api/admin/impact-lab/runs/${runId}/export?view=final`}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[10px] font-mono text-[#00d4ff]/80 hover:text-[#00d4ff]"
              >
                <Download className="w-3 h-3" />
                Download final list
              </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {finalList.teams.map((team) => (
                <div key={team.id} className="p-2 bg-[#111] border border-[#1e1e1e] rounded space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#e0e0e0]">
                    <span>{team.name}</span>
                    {typeof team.table === "number" && (
                      <span className="text-[#ffb000]">Table {team.table}</span>
                    )}
                    {team.trackKey && (
                      <span className="text-[#00d4ff]">
                        {trackLabelByKey.get(team.trackKey) ?? team.trackKey}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-0.5">
                    {team.members.map((m) => (
                      <li key={m.id} className="flex items-center gap-1.5 text-[10px] font-mono text-[#aaa]">
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 rounded-full ${m.checkedIn ? "bg-[#00ff41]" : "bg-[#444]"}`}
                        />
                        {m.fullName}
                        <span className="text-[#555]">{m.checkedIn ? "in the room" : "not here"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#888]">
                Checked in, no team ({finalList.checkedInNoTeam.length})
              </p>
              <ul className="mt-1 space-y-0.5">
                {finalList.checkedInNoTeam.map((p) => (
                  <li key={p.id} className="text-[10px] font-mono text-[#aaa]">{p.fullName}</li>
                ))}
              </ul>
            </div>

            {/* Read-only. Accepting is the teams' job (the member dashboard
                does it); organisers just need to see who is still asking so
                they can walk the floor and place anyone nobody picked up. */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#888]">
                Open join requests: {openJoinRequests.length}
              </p>
              <ul className="mt-1 space-y-0.5">
                {openJoinRequests.map((r) => (
                  <li key={r.id} className="text-[10px] font-mono text-[#aaa]">
                    {directory.get(r.participantId)?.fullName ?? r.participantId}
                    {r.trackKey && (
                      <span className="text-[#555]">
                        {" "}
                        · {trackLabelByKey.get(r.trackKey) ?? r.trackKey}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#888]">
                On a team, not checked in ({finalList.onTeamNotCheckedIn.length})
              </p>
              <ul className="mt-1 space-y-0.5">
                {finalList.onTeamNotCheckedIn.map((p) => (
                  <li key={p.id} className="text-[10px] font-mono text-[#aaa]">{p.fullName}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
