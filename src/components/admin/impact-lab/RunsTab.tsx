"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Trash2, Download, CheckCircle2 } from "lucide-react"
import { apiGet, apiSend } from "./api"
import type { RunSummary } from "./types"

interface RunsTabProps {
  cohort: string
  refreshKey: number
}

export function RunsTab({ cohort, refreshKey }: RunsTabProps) {
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="space-y-4">
      {error && <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">{error}</div>}
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
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-[#111]">
                  <td className="px-4 py-3">
                    <div className="text-sm font-mono text-[#e0e0e0]">{run.name}</div>
                    {run.notes && <div className="text-[11px] font-mono text-[#444]">{run.notes}</div>}
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
                      <a href={`/api/admin/impact-lab/runs/${run.id}/export`} title="Export teams CSV" className="text-[#00d4ff]/70 hover:text-[#00d4ff]"><Download className="w-3.5 h-3.5" /></a>
                      <button onClick={() => remove(run.id)} disabled={busy} title="Delete" className="text-[#ff3333]/70 hover:text-[#ff3333] disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
