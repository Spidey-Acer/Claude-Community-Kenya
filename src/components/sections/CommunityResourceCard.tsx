"use client"

import Link from "next/link"
import { ArrowUp, ExternalLink, Github } from "lucide-react"
import type { CommunitySubmissionView } from "@/lib/data"
import { cn } from "@/lib/utils"
import { useSkin } from "@/contexts/SkinContext"

const TYPE_CONFIG: Record<
  CommunitySubmissionView["type"],
  { label: string; devColor: string; devBg: string; devBorder: string; proColor: string; proBg: string; proBorder: string }
> = {
  MCP: {
    label: "MCP",
    devColor: "text-cyan", devBg: "bg-cyan/10", devBorder: "border-cyan/30",
    proColor: "text-[#6a9bcc]", proBg: "bg-[#6a9bcc]/10", proBorder: "border-[#6a9bcc]/30",
  },
  PROMPT: {
    label: "Prompt",
    devColor: "text-green-primary", devBg: "bg-green-primary/10", devBorder: "border-green-primary/30",
    proColor: "text-[#d97757]", proBg: "bg-[#d97757]/10", proBorder: "border-[#d97757]/30",
  },
  WORKFLOW: {
    label: "Workflow",
    devColor: "text-amber", devBg: "bg-amber/10", devBorder: "border-amber/30",
    proColor: "text-[#e89576]", proBg: "bg-[#e89576]/10", proBorder: "border-[#e89576]/30",
  },
  TOOL: {
    label: "Tool",
    devColor: "text-green-dim", devBg: "bg-green-dim/10", devBorder: "border-green-dim/30",
    proColor: "text-[#788c5d]", proBg: "bg-[#788c5d]/10", proBorder: "border-[#788c5d]/30",
  },
}

interface CommunityResourceCardProps {
  submission: CommunitySubmissionView
}

export function CommunityResourceCard({ submission }: CommunityResourceCardProps) {
  const typeConfig = TYPE_CONFIG[submission.type]
  const { skin } = useSkin()
  const isPro = skin === "pro"

  if (isPro) {
    return (
      <Link
        href={`/community/${submission.slug}`}
        className="group block"
        aria-label={`${submission.title} — ${typeConfig.label}`}
      >
        <div className="card-elevated rounded-2xl p-6 h-full flex flex-col">
          {/* Type badge */}
          <div className="mb-4">
            <span
              className={cn(
                "inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider",
                typeConfig.proColor,
                typeConfig.proBg,
                typeConfig.proBorder
              )}
            >
              {typeConfig.label}
            </span>
          </div>

          {/* Title */}
          <h3 className="mb-2 text-[18px] font-semibold text-[#faf9f5] transition-colors duration-200 group-hover:text-[#d97757]">
            {submission.title}
          </h3>

          {/* Description */}
          <p className="mb-4 text-[13.5px] text-[#b0aea5] line-clamp-2 leading-relaxed">
            {submission.shortDescription}
          </p>

          {/* Tags */}
          {submission.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {submission.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#2a2a28] bg-[#1e1e1d]/60 px-2 py-0.5 text-[11px] text-[#7a7870]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer: upvotes + links */}
          <div className="mt-auto flex items-center justify-between">
            <div className="flex items-center gap-4 text-[#7a7870]">
              <span className="flex items-center gap-1 text-[12px] font-medium">
                <ArrowUp className="h-3.5 w-3.5" />
                {submission.upvoteCount}
              </span>
              <span className="text-[12px]">
                {submission.commentCount} {submission.commentCount === 1 ? "comment" : "comments"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {submission.repoUrl && (
                <Github className="h-3.5 w-3.5 text-[#7a7870]" aria-hidden="true" />
              )}
              {submission.url && (
                <ExternalLink className="h-3.5 w-3.5 text-[#7a7870]" aria-hidden="true" />
              )}
            </div>
          </div>

          {/* Submitter */}
          {submission.submitterName && (
            <p className="mt-3 border-t border-[#2a2a28] pt-3 text-[12px] text-[#7a7870]">
              by <span className="text-[#b0aea5]">{submission.submitterName}</span>
            </p>
          )}
        </div>
      </Link>
    )
  }

  // ─── Dev / Terminal Noir variant ──────────────────────────────────────
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
                typeConfig.devColor,
                typeConfig.devBg,
                typeConfig.devBorder
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
