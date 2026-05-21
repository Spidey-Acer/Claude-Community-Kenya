"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { BlogPostCard } from "@/components/sections/BlogPostCard";
import { TerminalWindow, ScrollReveal, CommandPrefix } from "@/components/terminal";
import { CopyLinkButton } from "./CopyLinkButton";
import { useSkin } from "@/contexts/SkinContext";
import { formatDate } from "@/lib/utils";
import { SITE_CONFIG } from "@/lib/constants";
import type { BlogPostView } from "@/lib/data";

/** Fraunces display-serif style for Pro headings. */
const FRAUNCES: React.CSSProperties = {
  fontFamily: "var(--font-display), ui-serif, Georgia, serif",
  letterSpacing: "-0.025em",
};

// ─── Inline markdown renderer ────────────────────────────────────────────────

function renderInlineMarkdown(text: string, isPro: boolean): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    const matches = [
      boldMatch
        ? { type: "bold" as const, index: boldMatch.index!, match: boldMatch }
        : null,
      codeMatch
        ? { type: "code" as const, index: codeMatch.index!, match: codeMatch }
        : null,
      linkMatch
        ? { type: "link" as const, index: linkMatch.index!, match: linkMatch }
        : null,
    ]
      .filter(Boolean)
      .sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;

    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }

    if (first.type === "bold") {
      parts.push(
        <strong
          key={keyIndex++}
          className={isPro ? "font-semibold text-[#faf9f5]" : "font-semibold text-text-primary"}
        >
          {first.match[1]}
        </strong>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === "code") {
      parts.push(
        isPro ? (
          <code
            key={keyIndex++}
            className="rounded px-1.5 py-0.5 bg-[#252524] border border-[#2a2a28] text-[13px] font-mono text-[#e8e6dc]"
          >
            {first.match[1]}
          </code>
        ) : (
          <code
            key={keyIndex++}
            className="border border-border-default bg-bg-secondary px-1.5 py-0.5 font-mono text-sm text-green-dim"
          >
            {first.match[1]}
          </code>
        )
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === "link") {
      parts.push(
        <a
          key={keyIndex++}
          href={first.match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isPro
              ? "text-[#d97757] underline underline-offset-4 transition-colors hover:text-[#c06848]"
              : "text-green-primary underline underline-offset-4 transition-colors hover:text-green-dim"
          }
        >
          {first.match[1]}
        </a>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    }
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}

// ─── Block renderer ──────────────────────────────────────────────────────────

function renderContent(content: string, isPro: boolean): React.ReactNode[] {
  const blocks = content.split("\n\n");

  return blocks.map((block, index) => {
    const trimmed = block.trim();

    if (!trimmed) return null;

    // Horizontal rule
    if (trimmed === "---") {
      return <hr key={index} className="my-8 border-border-default" />;
    }

    // h2
    if (trimmed.startsWith("## ")) {
      const text = trimmed.slice(3);
      return isPro ? (
        <h2
          key={index}
          className="mb-4 mt-8 text-[26px] font-medium text-[#faf9f5]"
          style={FRAUNCES}
        >
          {text}
        </h2>
      ) : (
        <h2 key={index} className="mb-4 mt-8 font-mono text-xl font-bold text-green-primary">
          {text}
        </h2>
      );
    }

    // h3
    if (trimmed.startsWith("### ")) {
      const text = trimmed.slice(4);
      return isPro ? (
        <h3 key={index} className="mb-3 mt-6 text-[20px] font-semibold text-[#faf9f5]">
          {text}
        </h3>
      ) : (
        <h3 key={index} className="mb-3 mt-6 font-mono text-lg font-bold text-amber">
          {text}
        </h3>
      );
    }

    // Code blocks
    if (trimmed.startsWith("```")) {
      const lines = trimmed.split("\n");
      const codeContent = lines.slice(1, -1).join("\n");
      return isPro ? (
        <pre
          key={index}
          className="my-6 overflow-x-auto rounded-xl border border-[#2a2a28] bg-[#0f0f0e] p-5"
        >
          <code className="font-mono text-[13px] text-[#e8e6dc]">{codeContent}</code>
        </pre>
      ) : (
        <pre
          key={index}
          className="my-4 overflow-x-auto border border-border-default bg-bg-secondary p-4 font-mono text-sm text-green-dim"
        >
          <code>{codeContent}</code>
        </pre>
      );
    }

    const lines = trimmed.split("\n");
    const isNumberedList = lines.every(
      (line) => /^\d+\.\s/.test(line.trim()) || line.trim() === ""
    );
    const isBulletList = lines.every(
      (line) => /^-\s/.test(line.trim()) || line.trim() === ""
    );

    if (isNumberedList) {
      return (
        <ol key={index} className="my-4 list-inside space-y-2">
          {lines
            .filter((line) => line.trim())
            .map((line, i) => {
              const text = line.replace(/^\d+\.\s*/, "");
              return (
                <li key={i} className={isPro ? "text-[#b0aea5]" : "font-sans text-text-secondary"}>
                  <span
                    className={`mr-2 ${isPro ? "font-semibold text-[#d97757]" : "font-mono text-green-primary"}`}
                  >
                    {i + 1}.
                  </span>
                  {renderInlineMarkdown(text, isPro)}
                </li>
              );
            })}
        </ol>
      );
    }

    if (isBulletList) {
      return (
        <ul key={index} className={isPro ? "my-4 space-y-2" : "my-4 list-inside space-y-2"}>
          {lines
            .filter((line) => line.trim())
            .map((line, i) => {
              const text = line.replace(/^-\s*/, "");
              return (
                <li
                  key={i}
                  className={
                    isPro
                      ? "flex gap-3 text-[#b0aea5]"
                      : "font-sans text-text-secondary"
                  }
                >
                  <span
                    className={isPro ? "text-[#d97757]" : "mr-2 font-mono text-green-primary"}
                    aria-hidden="true"
                  >
                    {isPro ? "•" : ">"}
                  </span>
                  {renderInlineMarkdown(text, isPro)}
                </li>
              );
            })}
        </ul>
      );
    }

    // Italic block (starts and ends with single *)
    if (
      trimmed.startsWith("*") &&
      trimmed.endsWith("*") &&
      !trimmed.startsWith("**")
    ) {
      return (
        <p
          key={index}
          className={`my-4 italic ${isPro ? "text-[#9a9890]" : "font-sans text-text-dim"}`}
        >
          {trimmed.slice(1, -1)}
        </p>
      );
    }

    // Default paragraph
    return (
      <p
        key={index}
        className={`my-4 leading-relaxed ${isPro ? "text-[#b0aea5]" : "font-sans text-text-secondary"}`}
      >
        {renderInlineMarkdown(trimmed, isPro)}
      </p>
    );
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

interface BlogPostContentProps {
  post: BlogPostView;
  relatedPosts: BlogPostView[];
  twitterShareUrl: string;
  linkedinShareUrl: string;
  postUrl: string;
}

export function BlogPostContent({
  post,
  relatedPosts,
  twitterShareUrl,
  linkedinShareUrl,
  postUrl,
}: BlogPostContentProps) {
  const { skin } = useSkin();
  const isPro = skin === "pro";

  return (
    <div className="mx-auto max-w-3xl">
      {/* Back link */}
      <ScrollReveal>
        {isPro ? (
          <Link
            href="/blog"
            className="link-refined mb-8 inline-flex items-center gap-1.5 text-[13px] text-[#9a9890] hover:text-[#e8e6dc]"
          >
            ← Back to Blog
          </Link>
        ) : (
          <Link
            href="/blog"
            className="mb-8 inline-flex items-center gap-2 font-mono text-sm text-text-dim transition-colors hover:text-green-primary"
          >
            <span aria-hidden="true">&larr;</span>
            Back to Blog
          </Link>
        )}
      </ScrollReveal>

      {/* Article */}
      <ScrollReveal delay={100}>
        {isPro ? (
          <article className="card-elevated rounded-2xl px-8 py-10 md:px-12 md:py-12 max-w-3xl mx-auto">
            {/* Hero / meta */}
            <header className="mb-8">
              <h1
                className="mb-4 text-2xl font-bold leading-tight text-[#faf9f5] sm:text-3xl"
                style={FRAUNCES}
              >
                {post.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#9a9890]">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <span aria-hidden="true">·</span>
                <span>{post.author}</span>
                <span aria-hidden="true">·</span>
                <span>{post.readingTime} min read</span>
              </div>
            </header>

            {/* Content */}
            <div className="border-t border-[#2a2a28] pt-6">
              {renderContent(post.content, true)}
            </div>

            {/* Tags */}
            <div className="mt-8 flex flex-wrap gap-2 border-t border-[#2a2a28] pt-6">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#3a3a37] bg-[#252524] px-2.5 py-0.5 text-[12px] text-[#b0aea5]"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Share */}
            <div className="mt-8 border-t border-[#2a2a28] pt-6">
              <p className="mb-3 text-xs uppercase tracking-widest text-[#9a9890]">
                Share this post
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={twitterShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#2a2a28] px-4 py-2 text-sm text-[#b0aea5] transition-colors hover:border-[#3a3a37] hover:text-[#faf9f5]"
                >
                  Twitter / X
                </a>
                <a
                  href={linkedinShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#2a2a28] px-4 py-2 text-sm text-[#b0aea5] transition-colors hover:border-[#3a3a37] hover:text-[#faf9f5]"
                >
                  LinkedIn
                </a>
                <CopyLinkButton url={postUrl} />
              </div>
            </div>
          </article>
        ) : (
          <TerminalWindow title={`blog/${post.slug}`} variant="default">
            <article>
              {/* Meta */}
              <header className="mb-8">
                <h1 className="mb-4 font-mono text-2xl font-bold leading-tight text-green-primary sm:text-3xl">
                  {post.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-sm text-text-dim">
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span aria-hidden="true">|</span>
                  <span>{post.author}</span>
                  <span aria-hidden="true">|</span>
                  <span>{post.readingTime} min read</span>
                </div>
              </header>

              {/* Content */}
              <div className="border-t border-border-default pt-6">
                {renderContent(post.content, false)}
              </div>

              {/* Tags */}
              <div className="mt-8 flex flex-wrap gap-2 border-t border-border-default pt-6">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="default">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Share */}
              <div className="mt-8 border-t border-border-default pt-6">
                <p className="mb-3 font-mono text-xs uppercase tracking-widest text-text-dim">
                  <CommandPrefix symbol=">" />
                  Share this post
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={twitterShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-border-default px-4 py-2 font-mono text-xs text-text-secondary transition-all duration-200 hover:border-border-hover hover:text-text-primary"
                  >
                    Twitter / X
                  </a>
                  <a
                    href={linkedinShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-border-default px-4 py-2 font-mono text-xs text-text-secondary transition-all duration-200 hover:border-border-hover hover:text-text-primary"
                  >
                    LinkedIn
                  </a>
                  <CopyLinkButton url={postUrl} />
                </div>
              </div>
            </article>
          </TerminalWindow>
        )}
      </ScrollReveal>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <ScrollReveal delay={200}>
          <section className="mt-20">
            {isPro ? (
              <h2
                className="mb-8 text-xl font-medium text-[#faf9f5]"
                style={FRAUNCES}
              >
                Related Posts
              </h2>
            ) : (
              <h2 className="mb-8 font-mono text-xl font-bold text-text-primary">
                <CommandPrefix />
                Related Posts
              </h2>
            )}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {relatedPosts.map((relatedPost) => (
                <BlogPostCard key={relatedPost.slug} post={relatedPost} />
              ))}
            </div>
          </section>
        </ScrollReveal>
      )}
    </div>
  );
}
