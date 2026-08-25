"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Loader2 } from "lucide-react"

interface ReportActionsProps {
  id: string
}

/**
 * Resolve buttons for a single row in the reports queue.
 *
 * Mirrors CommunityActions.tsx's fetch-with-CSRF-token pattern: pull a fresh
 * token, PATCH the resolve endpoint, then refresh the server-rendered list so
 * the row drops out of the OPEN queue.
 */
export function ReportActions({ id }: ReportActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function resolve(status: "ACTIONED" | "DISMISSED") {
    setError(null)
    startTransition(async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token")
        const { csrfToken } = await csrfRes.json()

        const res = await fetch(`/api/admin/reports/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({ status }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to resolve report")
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-[10px] font-mono text-[#ff3333]">{error}</span>}
      <button
        onClick={() => resolve("ACTIONED")}
        disabled={isPending}
        className="flex items-center gap-1 px-2 py-1 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[11px] font-mono font-semibold text-[#00ff41] transition-all disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        Actioned
      </button>
      <button
        onClick={() => resolve("DISMISSED")}
        disabled={isPending}
        className="flex items-center gap-1 px-2 py-1 bg-[#666]/10 hover:bg-[#666]/20 border border-[#444]/30 rounded text-[11px] font-mono font-semibold text-[#888] transition-all disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        Dismissed
      </button>
    </div>
  )
}
