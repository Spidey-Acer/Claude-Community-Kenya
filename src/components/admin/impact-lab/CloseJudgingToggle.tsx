"use client"

/**
 * Freeze (or reopen) judging for the final run, independent of publish.
 *
 * Closing sets `judgingClosedAt`, the column the judging POST route already
 * refuses new score writes against once it is non-null (see
 * judge-events/route.ts) — the same effect publish has as its last step,
 * without publish's winner snapshot, announced-winners freeze, or results
 * emails. An organiser correcting a wrong track (or auditing a scorecard)
 * wants scores held still first, well before "publish" is the right button.
 *
 * Self-contained fetch/write, the same shape as `OnStagePanel`: one GET on
 * mount, refetch after every write, so a second admin tab's change is never
 * silently overwritten by an optimistic guess about what the server holds.
 * Reopening a published run is refused server-side (409) — this panel shows
 * that refusal as the write error rather than trying to predict it.
 */

import { useCallback, useEffect, useState } from "react"
import { Loader2, Lock, Unlock } from "lucide-react"
import { apiGet, apiSend } from "./api"

/** The slice of the run payload this panel reads. */
interface RunPayload {
  judgingClosedAt: string | null
}

export function CloseJudgingToggle({ runId }: { runId: string }) {
  const [closedAt, setClosedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const run = await apiGet<RunPayload>(`/api/admin/impact-lab/runs/${runId}`)
      setClosedAt(run.judgingClosedAt)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load judging state")
    } finally {
      setLoading(false)
    }
  }, [runId])

  useEffect(() => {
    void load()
  }, [load])

  async function toggle() {
    const closed = closedAt !== null
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/admin/impact-lab/runs/${runId}`, "PATCH", { closeJudging: !closed })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change judging state")
    } finally {
      setBusy(false)
    }
  }

  const closed = closedAt !== null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-3">
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#333]" />
      ) : (
        <>
          <span className="text-[11px] font-mono text-[#888]">
            {closed ? (
              <>
                Judging closed{" "}
                <span className="text-[#555]">— no new scores are accepted</span>
              </>
            ) : (
              "Judging is open"
            )}
          </span>
          <button
            type="button"
            onClick={() => void toggle()}
            disabled={busy}
            className={
              closed
                ? "flex items-center gap-1.5 rounded border border-[#1e1e1e] bg-[#1a1a1a] px-2.5 py-1 text-[11px] font-mono text-[#aaa] hover:bg-[#222] disabled:opacity-40"
                : "flex items-center gap-1.5 rounded border border-[#ffb000]/30 bg-[#ffb000]/10 px-2.5 py-1 text-[11px] font-mono text-[#ffb000] hover:bg-[#ffb000]/20 disabled:opacity-40"
            }
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : closed ? (
              <Unlock className="h-3 w-3" />
            ) : (
              <Lock className="h-3 w-3" />
            )}
            {closed ? "Reopen judging" : "Close judging"}
          </button>
        </>
      )}
      {error && (
        <span role="alert" className="text-[11px] font-mono text-[#ff3333]">
          {error}
        </span>
      )}
    </div>
  )
}
