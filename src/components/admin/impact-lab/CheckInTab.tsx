"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Search, UserCheck, UserX } from "lucide-react"
import { apiGet, apiSend } from "./api"
import { TeamLookup } from "./TeamLookup"
import type { ParticipantRow } from "./types"

interface CheckInTabProps {
  cohort: string
}

/**
 * Door check-in list for organisers. Optimized for speed on a phone: search,
 * one tap to toggle, and a running count — not the full participant editor.
 */
export function CheckInTab({ cohort }: CheckInTabProps) {
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setParticipants(await apiGet<ParticipantRow[]>(`/api/admin/impact-lab/participants?cohort=${cohort}`))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [cohort])

  useEffect(() => { void load() }, [load])

  async function toggle(p: ParticipantRow) {
    setTogglingId(p.id)
    setError(null)
    const nextCheckedIn = !p.checkedInAt
    try {
      const updated = await apiSend<ParticipantRow>(
        `/api/admin/impact-lab/participants/${p.id}/check-in`,
        "PATCH",
        { checkedIn: nextCheckedIn }
      )
      setParticipants((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update check-in")
    } finally {
      setTogglingId(null)
    }
  }

  const checkedInCount = useMemo(
    () => participants.filter((p) => p.checkedInAt).length,
    [participants]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return participants
    return participants.filter(
      (p) => p.fullName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
    )
  }, [participants, search])

  return (
    <div className="space-y-4">
      <TeamLookup cohort={cohort} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-mono text-[#555]">
          <span className="text-[#00ff41] font-semibold">{checkedInCount}</span> / {participants.length} checked in
        </p>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[#444] pointer-events-none" />
          <label htmlFor="checkin-search" className="sr-only">Search by name or email</label>
          <input
            id="checkin-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="pl-7 pr-2 py-2 w-64 bg-[#111] border border-[#1e1e1e] rounded text-[13px] font-mono text-[#e0e0e0] placeholder:text-[#444] focus:outline-none focus:border-[#00ff41]/40"
          />
        </div>
      </div>

      {error && (
        <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">{error}</div>
      )}

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-[#333] mx-auto" /></div>
        ) : participants.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono text-[#555]">No participants yet.</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono text-[#555]">No participants match &quot;{search}&quot;.</div>
        ) : (
          <ul className="divide-y divide-[#141414]">
            {filtered.map((p) => {
              const checkedIn = Boolean(p.checkedInAt)
              const busy = togglingId === p.id
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${checkedIn ? "bg-[#00ff41]" : "bg-[#333]"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-mono text-[#e0e0e0] truncate">{p.fullName}</div>
                    <div className="text-[11px] font-mono text-[#555] truncate">
                      {p.email} · {p.primaryRole}
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(p)}
                    disabled={busy}
                    aria-pressed={checkedIn}
                    aria-label={checkedIn ? `Check out ${p.fullName}` : `Check in ${p.fullName}`}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded border text-[11px] font-mono transition-all disabled:opacity-40 ${
                      checkedIn
                        ? "bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41] hover:bg-[#00ff41]/20"
                        : "bg-[#1a1a1a] border-[#1e1e1e] text-[#888] hover:bg-[#222]"
                    }`}
                  >
                    {busy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : checkedIn ? (
                      <UserCheck className="w-3.5 h-3.5" />
                    ) : (
                      <UserX className="w-3.5 h-3.5" />
                    )}
                    {checkedIn ? "Here" : "Not here"}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
