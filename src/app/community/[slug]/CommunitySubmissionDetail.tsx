import Link from "next/link"
import { ArrowLeft, ExternalLink, Github } from "lucide-react"
import { UpvoteButton } from "@/components/community/UpvoteButton"
import { CommentForm } from "@/components/community/CommentForm"
import { CommentList } from "@/components/community/CommentList"
import { CopyButton } from "@/components/community/CopyButton"
import type { CommunitySubmissionView, CommunityCommentView } from "@/lib/data"

const TYPE_LABELS: Record<string, string> = {
  MCP: "MCP Server",
  PROMPT: "Prompt Template",
  WORKFLOW: "Workflow",
  TOOL: "Tool / Project",
}

interface CommunitySubmissionDetailProps {
  submission: CommunitySubmissionView
  comments: CommunityCommentView[]
  descriptionParagraphs: string[]
}

export function CommunitySubmissionDetail({
  submission,
  comments,
  descriptionParagraphs,
}: CommunitySubmissionDetailProps) {
  return (
    <div className="mx-auto max-w-[820px] px-6 pb-20 pt-12 md:px-10">
      <Link
        href="/community"
        className="mb-8 inline-flex items-center gap-2 font-inter text-[13px] text-ink-muted transition-colors hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to Community Hub
      </Link>

      <header className="mb-8">
        <div className="mb-4">
          <span className="inline-block rounded-full border border-clay/30 bg-clay/10 px-2.5 py-0.5 font-inter text-[11px] font-semibold uppercase tracking-[0.06em] text-clay">
            {TYPE_LABELS[submission.type] ?? submission.type}
          </span>
        </div>

        <h1 className="mb-3 break-words font-newsreader text-[36px] leading-[1.08] tracking-[-0.01em] text-ink sm:text-[44px]">
          {submission.title}
        </h1>

        <p className="mb-4 font-inter text-[17px] leading-[1.6] text-ink-soft">
          {submission.shortDescription}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <UpvoteButton slug={submission.slug} initialCount={submission.upvoteCount} />
          <div className="flex flex-wrap items-center gap-4 font-inter text-[13px] text-ink-muted">
            {submission.submitterName && <span>by {submission.submitterName}</span>}
            <span>
              {new Date(submission.createdAt).toLocaleDateString("en-KE", {
                month: "short",
                day: "numeric",
                year: "numeric",
                timeZone: "Africa/Nairobi",
              })}
            </span>
          </div>
        </div>
      </header>

      {(submission.url || submission.repoUrl) && (
        <div className="mb-8 flex flex-wrap gap-3">
          {submission.url && (
            <a
              href={submission.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-clay px-5 py-2.5 font-inter text-[14px] font-semibold text-paper-card transition-colors hover:bg-clay-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Visit resource
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          )}
          {submission.repoUrl && (
            <a
              href={submission.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-sand px-5 py-2.5 font-inter text-[14px] font-semibold text-ink-soft transition-colors hover:border-clay hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              View source
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          )}
        </div>
      )}

      {submission.tags.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {submission.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-paper-alt px-2.5 py-1 font-inter text-[12px] text-ink-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-4 font-inter text-[15.5px] leading-[1.7] text-ink-soft">
        {descriptionParagraphs.map((paragraph, i) => (
          <p key={i} className="whitespace-pre-wrap break-words">
            {paragraph}
          </p>
        ))}
      </div>

      {submission.installInstructions && (
        <section className="mt-10">
          <h2 className="mb-4 font-newsreader text-[24px] text-ink">Installation</h2>
          <div className="relative rounded-2xl border border-sand bg-paper-card p-5">
            <pre className="overflow-x-auto whitespace-pre-wrap pr-10 font-mono text-[13px] leading-relaxed text-ink-soft">
              {submission.installInstructions}
            </pre>
            <CopyButton text={submission.installInstructions} />
          </div>
        </section>
      )}

      <section className="mt-10 border-t border-sand pt-10">
        <h2 className="mb-4 font-newsreader text-[24px] text-ink">
          Comments ({comments.length})
        </h2>
        <div className="mb-8">
          <CommentForm slug={submission.slug} />
        </div>
        <CommentList comments={comments} />
      </section>
    </div>
  )
}
