import type { CommunityCommentView } from "@/lib/data"

interface CommentListProps {
  comments: CommunityCommentView[]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  })
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <p className="font-inter text-sm text-ink-muted">
        No comments yet. Be the first to share your thoughts.
      </p>
    )
  }

  return (
    <ul className="space-y-4">
      {comments.map((comment) => (
        <li
          key={comment.id}
          className="rounded-xl border border-sand bg-paper-card p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="font-inter text-sm font-semibold text-ink">
              {comment.authorName}
            </span>
            {/* Relative time re-computes at hydration; a minute rollover
             * between server render and hydration is expected, not a bug. */}
            <span
              suppressHydrationWarning
              className="font-inter text-xs text-ink-muted"
            >
              {timeAgo(comment.createdAt)}
            </span>
          </div>
          <p className="whitespace-pre-wrap break-words font-inter text-sm leading-relaxed text-ink-soft">
            {comment.content}
          </p>
        </li>
      ))}
    </ul>
  )
}
