"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Loader2 } from "lucide-react"

interface CommentActionsProps {
  commentId: string
  submissionId: string
  currentStatus: string
}

export function CommentActions({ commentId, submissionId, currentStatus }: CommentActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleStatusChange(newStatus: string) {
    setError(null)
    startTransition(async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token")
        const { csrfToken } = await csrfRes.json()

        const res = await fetch(`/api/admin/community/${submissionId}/comments/${commentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({ status: newStatus }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to update comment")
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      {error && (
        <span className="text-[10px] font-mono text-[#ff3333]">{error}</span>
      )}
      {currentStatus !== "APPROVED" && (
        <button
          onClick={() => handleStatusChange("APPROVED")}
          disabled={isPending}
          className="p-1 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[#00ff41] transition-all disabled:opacity-50"
          title="Approve comment"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </button>
      )}
      {currentStatus !== "REJECTED" && (
        <button
          onClick={() => handleStatusChange("REJECTED")}
          disabled={isPending}
          className="p-1 bg-[#ff3333]/10 hover:bg-[#ff3333]/20 border border-[#ff3333]/30 rounded text-[#ff3333] transition-all disabled:opacity-50"
          title="Reject comment"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        </button>
      )}
    </div>
  )
}
