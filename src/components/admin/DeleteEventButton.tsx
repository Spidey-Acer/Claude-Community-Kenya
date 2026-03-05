"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2, Loader2 } from "lucide-react"

interface DeleteEventButtonProps {
  id: string
  title: string
}

export function DeleteEventButton({ id, title }: DeleteEventButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token")
        const { csrfToken } = await csrfRes.json()

        const res = await fetch(`/api/admin/events/${id}`, {
          method: "DELETE",
          headers: { "x-csrf-token": csrfToken },
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to delete")
        router.push("/admin/events")
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  if (showConfirm) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-mono text-[#ff3333]">
          Delete &ldquo;{title}&rdquo;? This cannot be undone.
        </p>
        {error && (
          <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#ff3333]/10 hover:bg-[#ff3333]/20 border border-[#ff3333]/30 rounded text-[11px] font-mono font-semibold text-[#ff3333] transition-all disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Confirm Delete
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isPending}
            className="flex-1 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#888] transition-all disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#ff3333]/10 hover:bg-[#ff3333]/20 border border-[#ff3333]/30 rounded text-[11px] font-mono font-semibold text-[#ff3333] transition-all"
    >
      <Trash2 className="w-3 h-3" />
      Delete Event
    </button>
  )
}
