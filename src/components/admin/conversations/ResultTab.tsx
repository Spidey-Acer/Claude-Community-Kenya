"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2, Trash2, Send, Plus, X } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"
import type { ResultEntry, ConversationsResult } from "./types"

interface ApprovedContribution {
  id: string
  body: string
  submitterName: string
  county: string
  context: string
}

const MAX_RUNNERS_UP = 2
const EMPTY_ENTRY: ResultEntry = { title: "", statement: "" }

/**
 * The Saturday-5pm tab: publish or clear the room's decided problem. Entries
 * can be picked from this event's APPROVED/FEATURED contributions or typed
 * free-text — the room's dot vote is sovereign, this just records its output.
 */
export function ResultTab({
  eventId,
  initialResult,
}: {
  eventId: string
  initialResult: ConversationsResult | null
}) {
  const [result, setResult] = useState<ConversationsResult | null>(initialResult)
  const [pool, setPool] = useState<ApprovedContribution[]>([])
  const [winner, setWinner] = useState<ResultEntry>(EMPTY_ENTRY)
  const [runnersUp, setRunnersUp] = useState<ResultEntry[]>([])
  const [note, setNote] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPool() {
      try {
        const [approved, featured] = await Promise.all([
          fetch(`/api/admin/moderation?eventId=${eventId}&status=APPROVED`).then((r) => r.json()),
          fetch(`/api/admin/moderation?eventId=${eventId}&status=FEATURED`).then((r) => r.json()),
        ])
        const rows = [...(approved.data ?? []), ...(featured.data ?? [])].filter(
          (r: { kind: string }) => r.kind === "contribution"
        )
        setPool(rows)
      } catch {
        // Non-fatal — free-text entry still works without the pool.
      }
    }
    loadPool()
  }, [eventId])

  function applyPick(entry: ResultEntry, setEntry: (e: ResultEntry) => void, contributionId: string) {
    const picked = pool.find((c) => c.id === contributionId)
    if (!picked) return
    setEntry({ title: `${picked.submitterName}, ${picked.county}`, statement: picked.body })
  }

  function addRunnerUp() {
    if (runnersUp.length >= MAX_RUNNERS_UP) return
    setRunnersUp((prev) => [...prev, EMPTY_ENTRY])
  }

  function updateRunnerUp(index: number, entry: ResultEntry) {
    setRunnersUp((prev) => prev.map((r, i) => (i === index ? entry : r)))
  }

  function removeRunnerUp(index: number) {
    setRunnersUp((prev) => prev.filter((_, i) => i !== index))
  }

  function publish() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/conversations/${eventId}/result`, {
          method: "PUT",
          headers: await csrfHeaders(),
          body: JSON.stringify({ winner, runnersUp, note: note || undefined }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to publish result")
        setResult(data.data.result)
        setConfirming(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  function clearResult() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/conversations/${eventId}/result`, {
          method: "DELETE",
          headers: await csrfHeaders(),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to clear result")
        setResult(null)
        setClearing(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
          {error}
        </div>
      )}

      {result && (
        <div className="bg-[#00ff41]/5 border border-[#00ff41]/30 rounded-lg p-4 space-y-2">
          <div className="text-[11px] font-mono font-semibold text-[#00ff41] uppercase tracking-wider">Published</div>
          <div className="text-sm font-mono text-[#e0e0e0] font-semibold">{result.winner.title}</div>
          <p className="text-xs font-mono text-[#aaa]">{result.winner.statement}</p>
          {result.runnersUp.length > 0 && (
            <div className="pt-1 space-y-1">
              {result.runnersUp.map((r, i) => (
                <div key={i} className="text-xs font-mono text-[#888]">
                  Runner-up: {r.title}
                </div>
              ))}
            </div>
          )}
          <div className="text-[10px] font-mono text-[#444] pt-1">
            Published {new Date(result.publishedAt).toLocaleString()}
          </div>
          {clearing ? (
            <div className="flex gap-2 pt-2">
              <button
                onClick={clearResult}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#ff3333]/10 hover:bg-[#ff3333]/20 border border-[#ff3333]/30 rounded text-[11px] font-mono font-semibold text-[#ff3333] transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Confirm clear
              </button>
              <button
                onClick={() => setClearing(false)}
                className="flex-1 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#888] transition-all"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setClearing(true)}
              className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-[#ff3333] hover:underline"
            >
              <Trash2 className="w-3 h-3" />
              Clear result
            </button>
          )}
        </div>
      )}

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4 space-y-4">
        <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">
          {result ? "Republish" : "Publish result"}
        </h2>

        <ResultEntryFields
          label="Winner"
          entry={winner}
          onChange={setWinner}
          pool={pool}
          onPick={(id) => applyPick(winner, setWinner, id)}
        />

        {runnersUp.map((entry, i) => (
          <div key={i} className="relative">
            <ResultEntryFields
              label={`Runner-up ${i + 1}`}
              entry={entry}
              onChange={(e) => updateRunnerUp(i, e)}
              pool={pool}
              onPick={(id) => applyPick(entry, (e) => updateRunnerUp(i, e), id)}
            />
            <button
              onClick={() => removeRunnerUp(i)}
              aria-label={`Remove runner-up ${i + 1}`}
              className="absolute top-0 right-0 p-1 text-[#555] hover:text-[#ff3333] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {runnersUp.length < MAX_RUNNERS_UP && (
          <button
            onClick={addRunnerUp}
            className="flex items-center gap-1.5 text-[11px] font-mono text-[#555] hover:text-[#00ff41] transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add runner-up
          </button>
        )}

        <div>
          <label className="block text-[11px] font-mono text-[#555] mb-1.5">Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50 resize-none"
          />
        </div>

        {confirming ? (
          <div className="flex gap-2">
            <button
              onClick={publish}
              disabled={isPending || !winner.title || !winner.statement}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-xs font-mono font-semibold text-[#00ff41] transition-all disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Confirm publish — Nairobi picked this
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-4 py-3 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-xs font-mono text-[#888] transition-all"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            disabled={!winner.title || !winner.statement}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-xs font-mono font-semibold text-[#00ff41] transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Publish
          </button>
        )}
      </div>
    </div>
  )
}

function ResultEntryFields({
  label, entry, onChange, pool, onPick,
}: {
  label: string
  entry: ResultEntry
  onChange: (entry: ResultEntry) => void
  pool: ApprovedContribution[]
  onPick: (contributionId: string) => void
}) {
  return (
    <div className="space-y-2 bg-[#111] border border-[#1a1a1a] rounded-lg p-3">
      <div className="text-[11px] font-mono text-[#555] uppercase tracking-wider">{label}</div>
      {pool.length > 0 && (
        <select
          defaultValue=""
          onChange={(e) => e.target.value && onPick(e.target.value)}
          className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50"
        >
          <option value="">Pick from approved contributions…</option>
          {pool.map((c) => (
            <option key={c.id} value={c.id}>
              {c.submitterName} ({c.county}) — {c.body.slice(0, 60)}
              {c.body.length > 60 ? "…" : ""}
            </option>
          ))}
        </select>
      )}
      <input
        value={entry.title}
        onChange={(e) => onChange({ ...entry, title: e.target.value })}
        placeholder="Title"
        maxLength={150}
        className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50"
      />
      <textarea
        value={entry.statement}
        onChange={(e) => onChange({ ...entry, statement: e.target.value })}
        placeholder="Statement"
        rows={2}
        maxLength={600}
        className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50 resize-none"
      />
    </div>
  )
}
