"use client"

import { useState } from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface UpvoteButtonProps {
  slug: string
  initialCount: number
}

export function UpvoteButton({ slug, initialCount }: UpvoteButtonProps) {
  const storageKey = `cck-upvote-${slug}`
  const [count, setCount] = useState(initialCount)
  const [voted, setVoted] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem(storageKey) === "1"
  })
  const [loading, setLoading] = useState(false)

  async function handleUpvote() {
    if (voted || loading) return
    setLoading(true)

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
        localStorage.setItem(storageKey, "1")
      } else if (data.alreadyVoted) {
        setVoted(true)
        localStorage.setItem(storageKey, "1")
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleUpvote}
      disabled={voted || loading}
      className={cn(
        "flex items-center gap-2 rounded border px-4 py-2 font-mono text-sm transition-all",
        voted
          ? "border-green-primary/30 bg-green-primary/10 text-green-primary cursor-default"
          : "border-border-default text-text-secondary hover:border-green-primary/50 hover:text-green-primary hover:bg-green-primary/5"
      )}
      aria-label={voted ? "Already upvoted" : "Upvote this resource"}
    >
      <ArrowUp className={cn("h-4 w-4", voted && "text-green-primary")} />
      <span>{count}</span>
    </button>
  )
}
