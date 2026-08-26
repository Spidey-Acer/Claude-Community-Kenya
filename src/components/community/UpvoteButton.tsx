"use client"

import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface UpvoteButtonProps {
  slug: string
  initialCount: number
}

export function UpvoteButton({ slug, initialCount }: UpvoteButtonProps) {
  const storageKey = `cck-upvote-${slug}`
  const [count, setCount] = useState(initialCount)
  // Read localStorage after mount — reading it in the initializer makes the
  // client's hydration render disagree with the server-rendered markup.
  const [voted, setVoted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Announced only for a vote cast in this session — the mount-time restore
  // of `voted` must not make the live region speak on every page load.
  const [announcement, setAnnouncement] = useState("")

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === "1") setVoted(true)
    } catch {
      // Storage unavailable (private mode) — leave as not voted.
    }
  }, [storageKey])

  async function handleUpvote() {
    if (voted || loading) return
    setLoading(true)
    setError(null)

    try {
      const csrfRes = await fetch("/api/csrf-token")
      const { csrfToken } = await csrfRes.json()

      const res = await fetch(`/api/community/${slug}/upvote`, {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setCount(data.upvoteCount)
        setVoted(true)
        setAnnouncement(`Upvoted. ${data.upvoteCount} upvotes.`)
        try {
          localStorage.setItem(storageKey, "1")
        } catch {}
      } else if (data.alreadyVoted) {
        setVoted(true)
        try {
          localStorage.setItem(storageKey, "1")
        } catch {}
      } else {
        setError("Couldn't record your upvote. Try again.")
      }
    } catch {
      setError("Couldn't record your upvote. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleUpvote}
        aria-disabled={voted || loading}
        aria-pressed={voted}
        aria-label={
          voted ? `Upvoted — ${count} upvotes` : `Upvote this resource — ${count} upvotes`
        }
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-2 font-inter text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2",
          voted
            ? "cursor-default border-clay/30 bg-clay/10 text-clay"
            : "border-sand-2 text-ink-soft hover:border-clay hover:bg-clay/5 hover:text-clay"
        )}
      >
        <ArrowUp className="h-4 w-4" />
        <span aria-hidden="true">{count}</span>
      </button>
      <span role="status" className="sr-only">
        {announcement}
      </span>
      {error && (
        <span role="alert" className="font-inter text-xs text-error">
          {error}
        </span>
      )}
    </div>
  )
}
