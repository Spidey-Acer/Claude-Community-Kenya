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
  })
}

export function CommentList({ comments }: CommentListProps) {
  if (comments.length === 0) {
    return (
      <p className="font-mono text-sm text-text-dim">
        No comments yet. Be the first to share your thoughts.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="rounded border border-border-default bg-bg-card p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-green-dim">
              {comment.authorName}
            </span>
            <span className="font-mono text-xs text-text-dim">
              {timeAgo(comment.createdAt)}
            </span>
          </div>
          <p className="whitespace-pre-wrap font-sans text-sm text-text-secondary">
            {comment.content}
          </p>
        </div>
      ))}
    </div>
  )
}
