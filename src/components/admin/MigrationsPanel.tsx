"use client"

/**
 * Database migrations panel for the settings page: shows which shipped
 * Prisma migration files the database has applied, and applies a pending
 * one after an inline confirm. Talks to /api/admin/db/migrations.
 */
import { useCallback, useEffect, useState } from "react"
import { Database, Loader2, RefreshCw } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

interface Status {
  tableMissing: boolean
  databaseHost: string
  applied?: string[]
  pending?: string[]
  modified?: string[]
  failed?: string[]
}

const ROW = "flex items-center justify-between gap-3 py-1.5 border-b border-[#1e1e1e] last:border-b-0"

export function MigrationsPanel() {
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch("/api/admin/db/migrations", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? `HTTP ${res.status}`)
      setStatus(json.data as Status)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function apply(name: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/db/migrations", {
        method: "POST",
        headers: await csrfHeaders(),
        body: JSON.stringify({ names: [name], confirm: "apply" }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error ?? `HTTP ${res.status}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apply failed")
    } finally {
      setConfirming(null)
      setBusy(false)
      await load()
    }
  }

  const groups: [string, string[] | undefined, string][] = [
    ["Pending", status?.pending, "text-[#ffb000]"],
    ["Failed", status?.failed, "text-[#ff3333]"],
    ["Modified", status?.modified, "text-[#ff3333]"],
    ["Applied", status?.applied, "text-[#666]"],
  ]

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#00d4ff]" />
          <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Database migrations</h2>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 text-[11px] font-mono text-[#666] hover:text-[#00ff41]"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
      <p className="text-[11px] font-mono text-[#666] mb-3">
        {status ? `Database ${status.databaseHost}` : "Loading status"}
        {status?.tableMissing ? ". No _prisma_migrations table: this database was never migrated by Prisma." : ""}
      </p>
      {error && <p className="text-[11px] font-mono text-[#ff3333] mb-3">{error}</p>}
      {status && !status.tableMissing && (
        <div className="space-y-3">
          {groups.map(([label, names, color]) =>
            names && names.length > 0 ? (
              <div key={label}>
                <p className={`text-[10px] font-mono uppercase tracking-wider mb-1 ${color}`}>
                  {label} ({names.length})
                </p>
                {names.map((name) => (
                  <div key={name} className={ROW}>
                    <span className="text-[11px] font-mono text-[#e0e0e0] break-all">{name}</span>
                    {label === "Pending" &&
                      (confirming === name ? (
                        <span className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void apply(name)}
                            className="text-[11px] font-mono px-2 py-1 rounded border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000]/10 disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Apply now"}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirming(null)}
                            className="text-[11px] font-mono text-[#666] hover:text-[#e0e0e0]"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirming(name)}
                          className="shrink-0 text-[11px] font-mono px-2 py-1 rounded border border-[#1e1e1e] text-[#e0e0e0] hover:border-[#00ff41]/40 hover:text-[#00ff41]"
                        >
                          Apply
                        </button>
                      ))}
                  </div>
                ))}
              </div>
            ) : null,
          )}
          {groups.every(([, names]) => !names || names.length === 0) && (
            <p className="text-[11px] font-mono text-[#666]">No migration files found.</p>
          )}
        </div>
      )}
    </div>
  )
}
