"use client"

import { useEffect, useState, useCallback } from "react"
import { Check, Star, X, Loader2, RefreshCw } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

type ModerationStatus = "PENDING" | "APPROVED" | "FEATURED" | "REJECTED"
type QueueKind = "question" | "contribution"

interface QueueRow {
  kind: QueueKind
  id: string
  body: string
  submitterName: string
  county: string
  status: ModerationStatus
  createdAt: string
  eventId: string
  eventTitle: string
  context: string
}

const STATUS_TABS: { value: ModerationStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "FEATURED", label: "Featured" },
  { value: "REJECTED", label: "Rejected" },
]

/**
 * The combined EventQuestion / EventContribution moderation feed. Reused by
 * the Moderation tab (both kinds) and the Q&A tab (kindFilter="question").
 * 2-tap: one tap picks the row's target status, the row leaves the current
 * filter immediately (optimistic) since the common case is clearing PENDING.
 */
export function ModerationQueue({ eventId, kindFilter }: { eventId: string; kindFilter?: QueueKind }) {
  const [status, setStatus] = useState<ModerationStatus>("PENDING")
  const [rows, setRows] = useState<QueueRow[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingRowId, setPendingRowId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/moderation?eventId=${eventId}&status=${status}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load queue")
      const allRows: QueueRow[] = data.data
      setRows(kindFilter ? allRows.filter((r) => r.kind === kindFilter) : allRows)
      setCounts(data.counts ?? {})
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [eventId, status, kindFilter])

  useEffect(() => {
    load()
  }, [load])

  async function moderate(row: QueueRow, target: Exclude<ModerationStatus, "PENDING">) {
    setPendingRowId(row.id)
    setError(null)
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "PATCH",
        headers: await csrfHeaders(),
        body: JSON.stringify({ kind: row.kind, id: row.id, status: target }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update")
      // Optimistic: row leaves this filtered view immediately.
      setRows((prev) => prev.filter((r) => r.id !== row.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setPendingRowId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`px-2.5 py-1.5 rounded text-[11px] font-mono border transition-all ${
              status === tab.value
                ? "bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]"
                : "bg-[#111] border-[#1e1e1e] text-[#666] hover:text-[#ccc]"
            }`}
          >
            {tab.label}
            {counts[tab.value] ? <span className="ml-1 text-[#444]">({counts[tab.value]})</span> : null}
          </button>
        ))}
        <button
          onClick={load}
          disabled={loading}
          aria-label="Refresh queue"
          className="ml-auto p-1.5 text-[#555] hover:text-[#ccc] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
          {error}
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 text-[#555] animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs font-mono text-[#333] py-6 text-center">Nothing here.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={`${row.kind}-${row.id}`} className="bg-[#111] border border-[#1a1a1a] rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-mono text-[#ccc] font-semibold truncate">
                    {row.submitterName} <span className="text-[#444] font-normal">· {row.county}</span>
                  </div>
                  <div className="text-[10px] font-mono text-[#00d4ff]">
                    {row.kind === "question" ? "Question" : "Contribution"} · {row.context}
                  </div>
                </div>
              </div>
              <p className="text-xs font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap mb-3">{row.body}</p>
              {/* Comfortable at 390px — three full-width stacked buttons, not a cramped row. */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => moderate(row, "APPROVED")}
                  disabled={pendingRowId === row.id}
                  className="flex items-center justify-center gap-1 px-2 py-2.5 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[11px] font-mono font-semibold text-[#00ff41] transition-all disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button
                  onClick={() => moderate(row, "FEATURED")}
                  disabled={pendingRowId === row.id}
                  className="flex items-center justify-center gap-1 px-2 py-2.5 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/30 rounded text-[11px] font-mono font-semibold text-[#00d4ff] transition-all disabled:opacity-50"
                >
                  <Star className="w-3.5 h-3.5" />
                  Feature
                </button>
                <button
                  onClick={() => moderate(row, "REJECTED")}
                  disabled={pendingRowId === row.id}
                  className="flex items-center justify-center gap-1 px-2 py-2.5 bg-[#ff3333]/10 hover:bg-[#ff3333]/20 border border-[#ff3333]/30 rounded text-[11px] font-mono font-semibold text-[#ff3333] transition-all disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
