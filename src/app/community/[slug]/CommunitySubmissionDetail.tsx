"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Github } from "lucide-react";
import { TerminalWindow, ScrollReveal } from "@/components/terminal";
import { UpvoteButton } from "@/components/community/UpvoteButton";
import { CommentForm } from "@/components/community/CommentForm";
import { CommentList } from "@/components/community/CommentList";
import { CopyButton } from "@/components/community/CopyButton";
import { useSkin } from "@/contexts/SkinContext";
import type { CommunitySubmissionView, CommunityCommentView } from "@/lib/data";

/** Fraunces display-serif style for Pro headings. */
const FRAUNCES: React.CSSProperties = {
  fontFamily: "var(--font-display), ui-serif, Georgia, serif",
  letterSpacing: "-0.025em",
};

const TYPE_LABELS: Record<string, string> = {
  MCP: "MCP Server",
  PROMPT: "Prompt Template",
  WORKFLOW: "Workflow",
  TOOL: "Tool / Project",
};

const TYPE_COLORS: Record<string, string> = {
  MCP: "text-cyan border-cyan/30 bg-cyan/10",
  PROMPT: "text-green-primary border-green-primary/30 bg-green-primary/10",
  WORKFLOW: "text-amber border-amber/30 bg-amber/10",
  TOOL: "text-green-dim border-green-dim/30 bg-green-dim/10",
};

interface CommunitySubmissionDetailProps {
  submission: CommunitySubmissionView;
  comments: CommunityCommentView[];
  descriptionParagraphs: string[];
}

export function CommunitySubmissionDetail({
  submission,
  comments,
  descriptionParagraphs,
}: CommunitySubmissionDetailProps) {
  const { skin } = useSkin();
  const isPro = skin === "pro";

  // ─── Pro section heading ───────────────────────────────────────────────────
  function ProHeading({ children }: { children: React.ReactNode }) {
    return (
      <h2
        className="mb-4 text-[28px] font-medium text-[#faf9f5]"
        style={FRAUNCES}
      >
        {children}
      </h2>
    );
  }

  function DevHeading({ children }: { children: React.ReactNode }) {
    return (
      <h2 className="mb-4 font-mono text-xl font-semibold text-green-primary">
        <span className="text-text-dim">## </span>
        {children}
      </h2>
    );
  }

  const SectionHeading = isPro ? ProHeading : DevHeading;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Back link */}
      {isPro ? (
        <Link
          href="/community"
          className="link-refined mb-8 inline-flex items-center gap-1.5 text-[13px] text-[#9a9890] hover:text-[#e8e6dc]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Tools &amp; Prompts
        </Link>
      ) : (
        <Link
          href="/community"
          className="mb-8 inline-flex items-center gap-2 font-mono text-sm text-text-dim transition-colors hover:text-green-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tools &amp; Prompts
        </Link>
      )}

      <ScrollReveal>
        <header className="mb-10">
          {/* Type badge */}
          <div className="mb-4">
            {isPro ? (
              <span className="inline-block rounded-full border border-[#3a3a37] bg-[#252524] px-2.5 py-0.5 text-[12px] text-[#b0aea5]">
                {TYPE_LABELS[submission.type] ?? submission.type}
              </span>
            ) : (
              <span
                className={`inline-block rounded-sm border px-2.5 py-1 font-mono text-xs uppercase tracking-wider ${TYPE_COLORS[submission.type] ?? ""}`}
              >
                {TYPE_LABELS[submission.type] ?? submission.type}
              </span>
            )}
          </div>

          {isPro ? (
            <h1
              className="mb-4 text-3xl font-bold text-[#faf9f5] sm:text-4xl lg:text-5xl"
              style={FRAUNCES}
            >
              {submission.title}
            </h1>
          ) : (
            <h1 className="mb-4 font-mono text-3xl font-bold text-text-primary sm:text-4xl lg:text-5xl">
              {submission.title}
            </h1>
          )}

          <p
            className={`mb-6 text-lg ${isPro ? "text-[#b0aea5]" : "font-sans text-text-secondary"}`}
          >
            {submission.shortDescription}
          </p>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-4">
            <UpvoteButton
              slug={submission.slug}
              initialCount={submission.upvoteCount}
            />

            {submission.submitterName && (
              <span
                className={`text-sm ${isPro ? "text-[#9a9890]" : "font-mono text-text-dim"}`}
              >
                by {submission.submitterName}
              </span>
            )}

            <span
              className={`text-xs ${isPro ? "text-[#9a9890]" : "font-mono text-text-dim"}`}
            >
              {new Date(submission.createdAt).toLocaleDateString("en-KE", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </header>
      </ScrollReveal>

      {/* Links */}
      {(submission.url || submission.repoUrl) && (
        <ScrollReveal delay={50}>
          <div className="mb-8 flex flex-wrap gap-3">
            {submission.url && (
              <a
                href={submission.url}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  isPro
                    ? "btn-primary-shadow inline-flex items-center gap-2 rounded-full bg-[#d97757] px-6 py-3 text-[14px] font-semibold text-[#faf9f5] hover:bg-[#c06848]"
                    : "inline-flex items-center gap-2 border border-green-primary/30 bg-green-primary/5 px-4 py-2 font-mono text-sm text-green-primary transition-all hover:bg-green-primary/10"
                }
              >
                <ExternalLink className="h-4 w-4" />
                Visit Resource
              </a>
            )}
            {submission.repoUrl && (
              <a
                href={submission.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  isPro
                    ? "inline-flex items-center gap-2 rounded-full border border-[#2a2a28] px-4 py-2 text-sm text-[#b0aea5] transition-colors hover:border-[#3a3a37] hover:text-[#faf9f5]"
                    : "inline-flex items-center gap-2 border border-border-default px-4 py-2 font-mono text-sm text-text-secondary transition-all hover:border-border-hover hover:text-text-primary"
                }
              >
                <Github className="h-4 w-4" />
                GitHub Repo
              </a>
            )}
          </div>
        </ScrollReveal>
      )}

      {/* Tags */}
      {submission.tags.length > 0 && (
        <ScrollReveal delay={75}>
          <div className="mb-8 flex flex-wrap gap-2">
            {submission.tags.map((tag) => (
              <span
                key={tag}
                className={
                  isPro
                    ? "rounded-full border border-[#3a3a37] bg-[#252524] px-2.5 py-0.5 text-[12px] text-[#b0aea5]"
                    : "rounded border border-border-default px-2.5 py-1 font-mono text-xs text-text-dim"
                }
              >
                {tag}
              </span>
            ))}
          </div>
        </ScrollReveal>
      )}

      {/* Full description */}
      <ScrollReveal delay={100}>
        <section className="mb-10">
          {isPro ? (
            <div className="card-elevated rounded-2xl p-8 space-y-4">
              {descriptionParagraphs.map((paragraph, i) => (
                <p key={i} className="leading-relaxed text-[#b0aea5]">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <TerminalWindow
              title={`cat community/${submission.slug}/README.md`}
              variant="default"
            >
              <div className="space-y-4">
                {descriptionParagraphs.map((paragraph, i) => (
                  <p key={i} className="text-text-secondary leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </TerminalWindow>
          )}
        </section>
      </ScrollReveal>

      {/* Install instructions */}
      {submission.installInstructions && (
        <ScrollReveal delay={150}>
          <section className="mb-10">
            <SectionHeading>Installation</SectionHeading>
            {isPro ? (
              <div className="card-elevated rounded-2xl p-6">
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg border border-[#2a2a28] bg-[#0f0f0e] p-4 text-[13px]">
                    <code className="font-mono text-[#e8e6dc]">
                      {submission.installInstructions}
                    </code>
                  </pre>
                  <CopyButton text={submission.installInstructions} />
                </div>
              </div>
            ) : (
              <TerminalWindow title="install.sh" variant="command">
                <div className="relative">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-text-secondary">
                    {submission.installInstructions}
                  </pre>
                  <CopyButton text={submission.installInstructions} />
                </div>
              </TerminalWindow>
            )}
          </section>
        </ScrollReveal>
      )}

      {/* Comments */}
      <ScrollReveal delay={200}>
        <section className="border-t border-border-default pt-10">
          <SectionHeading>Comments ({comments.length})</SectionHeading>

          <div className="mb-8">
            <CommentForm slug={submission.slug} />
          </div>

          <CommentList comments={comments} />
        </section>
      </ScrollReveal>
    </div>
  );
}
