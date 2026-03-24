"use client"

import Link from "next/link"
import { ArrowUp, ExternalLink, Github } from "lucide-react"
import type { CommunitySubmissionView } from "@/lib/data"
import { cn } from "@/lib/utils"

const TYPE_CONFIG: Record<
  CommunitySubmissionView["type"],
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  MCP: { label: "MCP", color: "text-cyan", bgColor: "bg-cyan/10", borderColor: "border-cyan/30" },
  PROMPT: { label: "Prompt", color: "text-green-primary", bgColor: "bg-green-primary/10", borderColor: "border-green-primary/30" },
  WORKFLOW: { label: "Workflow", color: "text-amber", bgColor: "bg-amber/10", borderColor: "border-amber/30" },
  TOOL: { label: "Tool", color: "text-green-dim", bgColor: "bg-green-dim/10", borderColor: "border-green-dim/30" },
}

interface CommunityResourceCardProps {
  submission: CommunitySubmissionView
}

export function CommunityResourceCard({ submission }: CommunityResourceCardProps) {
  const typeConfig = TYPE_CONFIG[submission.type]

  return (
    <Link
      href={`/community/${submission.slug}`}
      className="group block"
      aria-label={`${submission.title} — ${typeConfig.label}`}
    >
      <div
        className={cn(
          "border border-border-default bg-bg-card transition-all duration-300",
          "hover:border-border-hover hover:-translate-y-0.5",
          "hover:shadow-[0_4px_20px_rgba(0,255,65,0.08)]"
        )}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border-default px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-primary" />
          </div>
          <span className="ml-2 font-mono text-xs text-text-dim">
            community/{submission.slug}
          </span>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Type badge */}
          <div className="mb-3">
            <span
              className={cn(
                "inline-block rounded-sm border px-2 py-0.5 font-mono text-xs uppercase tracking-wider",
                typeConfig.color,
                typeConfig.bgColor,
                typeConfig.borderColor
              )}
            >
              {typeConfig.label}
            </span>
          </div>

          {/* Title */}
          <h3 className="mb-2 font-mono text-lg font-semibold text-green-primary transition-colors duration-200 group-hover:text-amber">
            {submission.title}
          </h3>

          {/* Description */}
          <p className="mb-4 text-sm text-text-secondary line-clamp-2">
            {submission.shortDescription}
          </p>

          {/* Tags */}
          {submission.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {submission.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="rounded border border-border-default px-2 py-0.5 font-mono text-[10px] text-text-dim"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer: upvotes + links */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-text-dim">
              <span className="flex items-center gap-1 font-mono text-xs">
                <ArrowUp className="h-3.5 w-3.5" />
                {submission.upvoteCount}
              </span>
              <span className="font-mono text-xs">
                {submission.commentCount} {submission.commentCount === 1 ? "comment" : "comments"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {submission.repoUrl && (
                <Github className="h-3.5 w-3.5 text-text-dim" aria-hidden="true" />
              )}
              {submission.url && (
                <ExternalLink className="h-3.5 w-3.5 text-text-dim" aria-hidden="true" />
              )}
            </div>
          </div>

          {/* Submitter */}
          {submission.submitterName && (
            <p className="mt-3 border-t border-border-default pt-3 font-mono text-xs text-text-dim">
              by {submission.submitterName}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
