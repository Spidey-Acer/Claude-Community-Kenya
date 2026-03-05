"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react"

interface ReviewFormProps {
  id: string
  currentStatus: string
  apiPath: string // e.g. "/api/admin/speakers"
}

export function ReviewForm({ id, currentStatus, apiPath }: ReviewFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleAction(action: "APPROVED" | "REJECTED" | "UNDER_REVIEW") {
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        // Get CSRF token
        const csrfRes = await fetch("/api/csrf-token")
        const { csrfToken } = await csrfRes.json()

        const res = await fetch(`${apiPath}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({ status: action, reviewNotes: notes }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to update")
        setSuccess(`Status updated to ${action.replace("_", " ")}`)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  if (currentStatus === "APPROVED" || currentStatus === "REJECTED") {
    return (
      <div className={`p-3 rounded border text-xs font-mono flex items-center gap-2 ${
        currentStatus === "APPROVED"
          ? "bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]"
          : "bg-[#ff3333]/10 border-[#ff3333]/30 text-[#ff3333]"
      }`}>
        {currentStatus === "APPROVED" ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
        This application has been {currentStatus.toLowerCase()}.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`review-notes-${id}`} className="block text-[11px] font-mono text-[#555] mb-1.5">Review Notes (optional)</label>
        <textarea
          id={`review-notes-${id}`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Add internal notes about this application..."
          className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50 resize-none"
        />
      </div>

      {error && (
        <div className="p-2.5 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
          {error}
        </div>
      )}
      {success && (
        <div className="p-2.5 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41]">
          {success}
        </div>
      )}

      <div className="flex gap-2">
        {currentStatus === "PENDING" && (
          <button
            onClick={() => handleAction("UNDER_REVIEW")}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/30 rounded text-[11px] font-mono font-semibold text-[#00d4ff] transition-all disabled:opacity-50"
          >
            <Clock className="w-3 h-3" />
            Mark Under Review
          </button>
        )}
        <button
          onClick={() => handleAction("APPROVED")}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[11px] font-mono font-semibold text-[#00ff41] transition-all disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          Approve
        </button>
        <button
          onClick={() => handleAction("REJECTED")}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#ff3333]/10 hover:bg-[#ff3333]/20 border border-[#ff3333]/30 rounded text-[11px] font-mono font-semibold text-[#ff3333] transition-all disabled:opacity-50"
        >
          <XCircle className="w-3 h-3" />
          Reject
        </button>
      </div>
    </div>
  )
}
