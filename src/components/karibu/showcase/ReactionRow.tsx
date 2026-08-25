"use client"

import { useState } from "react"
import { REACTION_EMOJI } from "@/lib/showcase/constants"
import { cn } from "@/lib/utils"

interface ReactionRowProps {
  slug: string
  initialCounts: Record<string, number>
  initialMine: string[]
  signedIn: boolean
}

/**
 * The five-emoji reaction row.
 *
 * Optimistic: the count moves the moment you click, and rolls back if the
 * request fails. A reaction that lags a round-trip feels broken even when it
 * works.
 *
 * Fetches a fresh CSRF token before every POST, the same dance CommentForm
 * does — `withCsrfProtection` on the react endpoint 403s any request missing
 * `x-csrf-token`, so skipping this step fails every click silently behind the
 * optimistic-then-rollback flow.
 */
export function ReactionRow({ slug, initialCounts, initialMine, signedIn }: ReactionRowProps) {
  const [counts, setCounts] = useState(initialCounts)
  const [mine, setMine] = useState<string[]>(initialMine)
  const [pending, setPending] = useState<string | null>(null)

  async function toggle(emoji: string) {
    if (!signedIn || pending) return

    const had = mine.includes(emoji)
    const previousCounts = counts
    const previousMine = mine

    setPending(emoji)
    setCounts({ ...counts, [emoji]: Math.max(0, (counts[emoji] ?? 0) + (had ? -1 : 1)) })
    setMine(had ? mine.filter(e => e !== emoji) : [...mine, emoji])

    try {
      const csrfRes = await fetch("/api/csrf-token")
      const { csrfToken } = await csrfRes.json()

      const response = await fetch(`/api/showcase/${slug}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({ emoji }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "Failed")
      setCounts(payload.data.reactionCounts)
      setMine(payload.data.mine)
    } catch {
      setCounts(previousCounts)
      setMine(previousMine)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Reactions">
      {REACTION_EMOJI.map((emoji) => {
        const count = counts[emoji] ?? 0
        const isMine = mine.includes(emoji)
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle(emoji)}
            disabled={!signedIn}
            aria-pressed={isMine}
            aria-label={`${emoji} reaction, ${count} so far`}
            title={signedIn ? undefined : "Sign in to react"}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm",
              "transition-colors focus-visible:outline-none focus-visible:ring-2",
              "focus-visible:ring-clay focus-visible:ring-offset-2",
              isMine
                ? "border-clay bg-clay/10 text-clay"
                : "border-sand bg-paper-card text-ink-soft hover:border-clay/50",
              !signedIn && "cursor-not-allowed opacity-60",
            )}
          >
            <span aria-hidden="true">{emoji}</span>
            <span className="tabular-nums">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
