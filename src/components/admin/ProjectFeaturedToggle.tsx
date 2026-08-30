"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"

export function ProjectFeaturedToggle({ id, featured }: { id: string; featured: boolean }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggle() {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/admin/projects/${id}`, {
        method: "PATCH",
        headers: await csrfHeaders(),
        body: JSON.stringify({ featured: !featured }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to update.")
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-pressed={featured}
        className="flex items-center gap-1.5 text-[11px] font-mono text-[#888] hover:text-[#ccc] transition-colors disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : featured ? (
          <CheckCircle2 className="w-4 h-4 text-[#00ff41]" />
        ) : (
          <XCircle className="w-4 h-4 text-[#555]" />
        )}
        {featured ? "Featured" : "Not featured"}
      </button>
      {error && <span className="text-[10px] font-mono text-red-400">{error}</span>}
    </div>
  )
}
