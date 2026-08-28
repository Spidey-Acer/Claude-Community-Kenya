"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

/**
 * Attaches a ConversationsPage to an event with kit defaults, then navigates
 * to the manage page for it. Config edits happen there, not on this button.
 */
export function AttachPageButton({ eventId }: { eventId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAttach() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/conversations", {
          method: "POST",
          headers: await csrfHeaders(),
          body: JSON.stringify({ eventId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to attach page")
        router.push(`/admin/conversations/${eventId}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  return (
    <div className="inline-flex items-center gap-2">
      {error && <span className="text-[10px] font-mono text-[#ff3333]">{error}</span>}
      <button
        onClick={handleAttach}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[11px] font-mono font-semibold text-[#00ff41] transition-all disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        Attach Page
      </button>
    </div>
  )
}
