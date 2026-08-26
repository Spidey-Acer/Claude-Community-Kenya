"use client"

import { useId, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send, Loader2 } from "lucide-react"

interface CommentFormProps {
  slug: string
}

export function CommentForm({ slug }: CommentFormProps) {
  const [authorName, setAuthorName] = useState("")
  const [content, setContent] = useState("")
  const [isPending, startTransition] = useTransition()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const nameId = useId()
  const contentId = useId()
  const errorId = useId()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

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

        // The API says whether the comment was auto-approved (verified
        // members) or held for moderation — show the right message, and
        // refresh so an approved comment appears in the list immediately.
        setSuccessMessage(
          data.message ??
            (data.published ? "Comment posted." : "Your comment is pending approval.")
        )
        setContent("")
        setAuthorName("")
        if (data.published) router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  if (successMessage) {
    return (
      <div
        role="status"
        className="rounded-xl border border-success/30 bg-success/10 p-4"
      >
        <p className="font-inter text-sm font-medium text-success">
          {successMessage} Thank you!
        </p>
        <button
          type="button"
          onClick={() => setSuccessMessage(null)}
          className="mt-2 font-inter text-xs font-semibold text-ink-muted transition-colors hover:text-ink"
        >
          Write another comment
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div
          id={errorId}
          role="alert"
          className="rounded-xl border border-error/30 bg-error/10 p-3 font-inter text-xs text-error"
        >
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor={nameId}
          className="mb-1.5 block font-inter text-[13px] font-medium text-ink-soft"
        >
          Your name{" "}
          <span className="font-normal text-ink-muted">
            (optional — leave blank for Anonymous)
          </span>
        </label>
        <input
          id={nameId}
          type="text"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={100}
          className="w-full rounded-lg border border-sand-2 bg-paper-card px-3 py-2 font-inter text-sm text-ink placeholder:text-ink-muted focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
        />
      </div>

      <div>
        <label
          htmlFor={contentId}
          className="mb-1.5 block font-inter text-[13px] font-medium text-ink-soft"
        >
          Comment
        </label>
        <textarea
          id={contentId}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          required
          minLength={5}
          maxLength={1000}
          aria-describedby={error ? errorId : undefined}
          className="w-full resize-none rounded-lg border border-sand-2 bg-paper-card px-3 py-2 font-inter text-sm text-ink placeholder:text-ink-muted focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending || content.trim().length < 5}
          className="inline-flex items-center gap-2 rounded-full bg-clay px-5 py-2.5 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          Post comment
        </button>
      </div>
    </form>
  )
}
