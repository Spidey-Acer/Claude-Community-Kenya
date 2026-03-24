"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Trash2, Loader2 } from "lucide-react"

interface CommunityActionsProps {
  id: string
  title: string
  currentStatus: string
}

export function CommunityActions({ id, title, currentStatus }: CommunityActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleStatusChange(newStatus: string) {
    setError(null)
    startTransition(async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token")
        const { csrfToken } = await csrfRes.json()

        const res = await fetch(`/api/admin/community/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({ status: newStatus }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to update status")
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token")
        const { csrfToken } = await csrfRes.json()

        const res = await fetch(`/api/admin/community/${id}`, {
          method: "DELETE",
          headers: { "x-csrf-token": csrfToken },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to delete")
        router.push("/admin/community")
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
          {error}
        </div>
      )}

      {currentStatus !== "APPROVED" && (
        <button
          onClick={() => handleStatusChange("APPROVED")}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[11px] font-mono font-semibold text-[#00ff41] transition-all disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Approve
        </button>
      )}

      {currentStatus !== "REJECTED" && (
        <button
          onClick={() => handleStatusChange("REJECTED")}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#ffb000]/10 hover:bg-[#ffb000]/20 border border-[#ffb000]/30 rounded text-[11px] font-mono font-semibold text-[#ffb000] transition-all disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
          Reject
        </button>
      )}

      {showDeleteConfirm ? (
        <div className="space-y-2">
          <p className="text-[11px] font-mono text-[#ff3333]">
            Delete &ldquo;{title}&rdquo;? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#ff3333]/10 hover:bg-[#ff3333]/20 border border-[#ff3333]/30 rounded text-[11px] font-mono font-semibold text-[#ff3333] transition-all disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Confirm
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isPending}
              className="flex-1 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#888] transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#ff3333]/10 hover:bg-[#ff3333]/20 border border-[#ff3333]/30 rounded text-[11px] font-mono font-semibold text-[#ff3333] transition-all"
        >
          <Trash2 className="w-3 h-3" />
          Delete Submission
        </button>
      )}
    </div>
  )
}
