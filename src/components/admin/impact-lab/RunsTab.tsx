"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { Loader2, Trash2, Download, CheckCircle2, ChevronRight, ChevronDown, Pencil, Save, X, Send } from "lucide-react"
import { apiGet, apiSend } from "./api"
import { RunDetail } from "./RunDetail"
import type { ParticipantRow, RunSummary } from "./types"

interface RunsTabProps {
  cohort: string
  refreshKey: number
}

export function RunsTab({ cohort, refreshKey }: RunsTabProps) {
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [directory, setDirectory] = useState<Map<string, ParticipantRow> | null>(null)
  const [directoryLoading, setDirectoryLoading] = useState(false)

  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [nameDraft, setNameDraft] = useState("")
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState("")

  const [notifyingRunId, setNotifyingRunId] = useState<string | null>(null)
  const [notifyResult, setNotifyResult] = useState<{ sent: number; failed: number; recipients: number } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRuns(await apiGet<RunSummary[]>(`/api/admin/impact-lab/runs?cohort=${cohort}`))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [cohort])

  useEffect(() => { void load() }, [load, refreshKey])
  // Reset the participant directory and any open rows when the cohort changes —
  // ids from one cohort's directory must never resolve names for another's.
  useEffect(() => { setDirectory(null); setExpanded(new Set()) }, [cohort])

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    if (!directory && !directoryLoading) {
      setDirectoryLoading(true)
      apiGet<ParticipantRow[]>(`/api/admin/impact-lab/participants?cohort=${cohort}`)
        .then((rows) => setDirectory(new Map(rows.map((p) => [p.id, p]))))
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load participants"))
        .finally(() => setDirectoryLoading(false))
    }
  }

  async function markFinal(id: string) {
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/admin/impact-lab/runs/${id}`, "PATCH", { isFinal: true })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to mark final")
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setBusy(true)
    try {
      await apiSend(`/api/admin/impact-lab/runs/${id}`, "DELETE")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete")
    } finally {
      setBusy(false)
    }
  }

  async function saveName(id: string) {
    const name = nameDraft.trim()
    if (!name) return
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/admin/impact-lab/runs/${id}`, "PATCH", { name })
      setEditingNameId(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename")
    } finally {
      setBusy(false)
    }
  }

  async function saveNotes(id: string) {
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/admin/impact-lab/runs/${id}`, "PATCH", { notes: notesDraft.trim() || null })
      setEditingNotesId(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save notes")
    } finally {
      setBusy(false)
    }
  }

  async function emailReveal(run: RunSummary) {
    if (!window.confirm("Email every matched participant that their team is ready? This sends real email.")) return
    setNotifyingRunId(run.id)
    setError(null)
    setNotifyResult(null)
    try {
      const result = await apiSend<{ sent: number; failed: number; recipients: number }>(
        "/api/admin/impact-lab/notify",
        "POST",
        { type: "reveal" }
      )
      setNotifyResult(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send emails")
    } finally {
      setNotifyingRunId(null)
    }
  }

  return (
    <div className="space-y-4">
      {error && <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">{error}</div>}
      {notifyResult && (
        <div role="status" className="p-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41] flex items-center justify-between gap-2">
          <span>
            Sent {notifyResult.sent} of {notifyResult.recipients} emails
            {notifyResult.failed > 0 && <span className="text-[#ff3333]">, {notifyResult.failed} failed</span>}
          </span>
          <button onClick={() => setNotifyResult(null)} aria-label="Dismiss notification status" className="text-[#00ff41]/60 hover:text-[#00ff41]">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-[#333] mx-auto" /></div>
        ) : runs.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono text-[#555]">No saved runs yet — generate and save from the Matching tab.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Name", "Teams", "Avg", "Unassigned", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {runs.map((run) => {
                const isExpanded = expanded.has(run.id)
                return (
                  <Fragment key={run.id}>
                    <tr className="hover:bg-[#111]">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <button
                            onClick={() => toggleExpand(run.id)}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? `Collapse ${run.name}` : `Expand ${run.name}`}
                            className="mt-0.5 text-[#555] hover:text-[#888] flex-shrink-0"
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            {editingNameId === run.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  aria-label={`Rename ${run.name}`}
                                  value={nameDraft}
                                  onChange={(e) => setNameDraft(e.target.value)}
                                  className="bg-[#111] border border-[#1e1e1e] rounded px-1.5 py-0.5 text-sm font-mono text-[#e0e0e0] w-40"
                                />
                                <button onClick={() => saveName(run.id)} disabled={busy || !nameDraft.trim()} title="Save name" aria-label="Save name" className="text-[#00ff41]/70 hover:text-[#00ff41] disabled:opacity-40">
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditingNameId(null)} title="Cancel" aria-label="Cancel rename" className="text-[#555] hover:text-[#888]">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-mono text-[#e0e0e0]">{run.name}</span>
                                <button
                                  onClick={() => { setEditingNameId(run.id); setNameDraft(run.name) }}
                                  title="Rename"
                                  aria-label={`Rename ${run.name}`}
                                  className="text-[#555] hover:text-[#888]"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            {editingNotesId === run.id ? (
                              <div className="mt-1 space-y-1">
                                <textarea
                                  aria-label={`Notes for ${run.name}`}
                                  value={notesDraft}
                                  onChange={(e) => setNotesDraft(e.target.value)}
                                  rows={2}
                                  className="w-full bg-[#111] border border-[#1e1e1e] rounded px-1.5 py-1 text-[11px] font-mono text-[#e0e0e0]"
                                />
                                <div className="flex items-center gap-2">
                                  <button onClick={() => saveNotes(run.id)} disabled={busy} className="text-[10px] font-mono text-[#00ff41] hover:underline disabled:opacity-40">Save notes</button>
                                  <button onClick={() => setEditingNotesId(null)} className="text-[10px] font-mono text-[#555] hover:underline">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingNotesId(run.id); setNotesDraft(run.notes ?? "") }}
                                className="mt-0.5 block text-[11px] font-mono text-[#444] hover:text-[#666] text-left"
                              >
                                {run.notes || "+ add notes"}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-[#888]">{run.teamCount}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-[#00ff41]">{run.averageScore}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-[#888]">{run.unassignedCount}</td>
                      <td className="px-4 py-3">
                        {run.isFinal ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41]">FINAL</span>
                        ) : (
                          <span className="text-[10px] font-mono text-[#555]">draft</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!run.isFinal && (
                            <button onClick={() => markFinal(run.id)} disabled={busy} title="Mark final" className="text-[#00ff41]/70 hover:text-[#00ff41] disabled:opacity-40"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                          )}
                          {run.isFinal && (
                            <button
                              onClick={() => emailReveal(run)}
                              disabled={busy || notifyingRunId !== null}
                              title="Email team reveal"
                              aria-label={`Email team reveal for ${run.name}`}
                              className="text-[#ffb000]/70 hover:text-[#ffb000] disabled:opacity-40"
                            >
                              {notifyingRunId === run.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <a href={`/api/admin/impact-lab/runs/${run.id}/export`} title="Export teams CSV" className="text-[#00d4ff]/70 hover:text-[#00d4ff]"><Download className="w-3.5 h-3.5" /></a>
                          <button onClick={() => remove(run.id)} disabled={busy} title="Delete" className="text-[#ff3333]/70 hover:text-[#ff3333] disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <RunDetail runId={run.id} directory={directory ?? new Map()} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
