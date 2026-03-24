"use client"

import { useState, useTransition } from "react"
import { Send, Loader2 } from "lucide-react"

interface CommentFormProps {
  slug: string
}

export function CommentForm({ slug }: CommentFormProps) {
  const [authorName, setAuthorName] = useState("")
  const [content, setContent] = useState("")
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token")
        const { csrfToken } = await csrfRes.json()

        const res = await fetch(`/api/community/${slug}/comment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({
            authorName: authorName.trim() || undefined,
            content: content.trim(),
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to submit comment")

        setSuccess(true)
        setContent("")
        setAuthorName("")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  if (success) {
    return (
      <div className="rounded border border-green-primary/30 bg-green-primary/5 p-4">
        <p className="font-mono text-sm text-green-primary">
          Your comment is pending approval. Thank you!
        </p>
        <button
          onClick={() => setSuccess(false)}
          className="mt-2 font-mono text-xs text-text-dim hover:text-text-secondary transition-colors"
        >
          Write another comment
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded border border-red/30 bg-red/5 p-3 font-mono text-xs text-red">
          {error}
        </div>
      )}

      <div>
        <input
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Your name (optional — leave blank for Anonymous)"
          maxLength={100}
          className="w-full rounded border border-border-default bg-bg-card px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:border-green-primary/50 focus:outline-none"
        />
      </div>

      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          required
          minLength={5}
          maxLength={1000}
          className="w-full resize-none rounded border border-border-default bg-bg-card px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:border-green-primary/50 focus:outline-none"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || content.trim().length < 5}
          className="flex items-center gap-2 rounded border border-green-primary/30 bg-green-primary/10 px-4 py-2 font-mono text-sm text-green-primary transition-all hover:bg-green-primary/20 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Post Comment
        </button>
      </div>
    </form>
  )
}
