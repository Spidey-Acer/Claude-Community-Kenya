"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

interface DeleteBlogButtonProps {
  id: string
  title: string
}

export function DeleteBlogButton({ id, title }: DeleteBlogButtonProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token")
        const { csrfToken } = await csrfRes.json() as { csrfToken: string }

        const res = await fetch(`/api/admin/blog/${id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        })

        const data = await res.json() as { success: boolean; error?: string }
        if (!res.ok) throw new Error(data.error || "Failed to delete")

        router.push("/admin/blog")
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete")
        setConfirming(false)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-[10px] font-mono text-[#ff3333]">{error}</span>}
      {confirming && (
        <button
          onClick={() => setConfirming(false)}
          className="text-[11px] font-mono text-[#555] hover:text-[#888] transition-colors"
          disabled={isPending}
        >
          Cancel
        </button>
      )}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono rounded transition-colors ${
          confirming
            ? "bg-[#ff3333]/20 border border-[#ff3333]/50 text-[#ff3333] hover:bg-[#ff3333]/30"
            : "bg-[#ff3333]/10 border border-[#ff3333]/30 text-[#ff3333] hover:bg-[#ff3333]/20"
        } disabled:opacity-50`}
        title={`Delete "${title}"`}
      >
        <Trash2 className="w-3 h-3" />
        {isPending ? "Deleting..." : confirming ? "Confirm Delete" : "Delete"}
      </button>
    </div>
  )
}
