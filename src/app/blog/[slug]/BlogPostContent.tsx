"use client";

/**
 * BlogPostContent: one blog post on the page kit (warm light). A small
 * markdown subset renderer (headings, lists, code, bold, inline code, links),
 * the post meta, tags, share links and two related posts as kit `PostCard`s.
 */

import React from "react";
import Link from "next/link";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { BTN_OUTLINE, EYEBROW, Masthead, PostCard, WRAP } from "@/components/karibu/kit";
import { CopyLinkButton } from "./CopyLinkButton";
import { formatDate } from "@/lib/utils";
import type { BlogPostView } from "@/lib/data";

const BODY = "text-ink-soft";

// ─── Inline markdown renderer ────────────────────────────────────────────────

function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`([^`]+)`/);
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);

    const matches = [
      boldMatch ? { type: "bold" as const, index: boldMatch.index!, match: boldMatch } : null,
      codeMatch ? { type: "code" as const, index: codeMatch.index!, match: codeMatch } : null,
      linkMatch ? { type: "link" as const, index: linkMatch.index!, match: linkMatch } : null,
    ]
      .filter(Boolean)
      .sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    if (first.index > 0) parts.push(remaining.slice(0, first.index));

    if (first.type === "bold") {
      parts.push(
        <strong key={keyIndex++} className="font-semibold text-ink">
          {first.match[1]}
        </strong>
      );
    } else if (first.type === "code") {
      parts.push(
        <code key={keyIndex++} className="rounded border border-sand bg-paper-alt px-1.5 py-0.5 font-mono text-[13px] text-ink">
          {first.match[1]}
        </code>
      );
    } else {
      parts.push(
        <a
          key={keyIndex++}
          href={first.match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-clay underline underline-offset-4 transition-colors hover:text-ink"
        >
          {first.match[1]}
        </a>
      );
    }
    remaining = remaining.slice(first.index + first.match[0].length);
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}

// ─── Block renderer ──────────────────────────────────────────────────────────

function renderListBlock(lines: string[], ordered: boolean, index: number): React.ReactNode {
  const items = lines.filter((line) => line.trim());
  const strip = ordered ? /^\d+\.\s*/ : /^-\s*/;
  const List = ordered ? "ol" : "ul";
  return (
    <List key={index} className={`my-4 space-y-2 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-clay`}>
      {items.map((line, i) => (
        <li key={i} className={BODY}>
          {renderInlineMarkdown(line.trim().replace(strip, ""))}
        </li>
      ))}
    </List>
  );
}

function renderContent(content: string): React.ReactNode[] {
  return content.split("\n\n").map((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed === "---") return <hr key={index} className="my-8 border-sand" />;

    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={index} className="mb-4 mt-8 font-newsreader text-[26px] font-medium text-ink">
          {trimmed.slice(3)}
        </h2>
      );
    }

    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={index} className="mb-3 mt-6 font-inter text-[20px] font-semibold text-ink">
          {trimmed.slice(4)}
        </h3>
      );
    }

    if (trimmed.startsWith("```")) {
      const codeContent = trimmed.split("\n").slice(1, -1).join("\n");
      return (
        <pre key={index} className="my-6 overflow-x-auto rounded-xl bg-panel-dark p-5">
          <code className="font-mono text-[13px] text-on-panel-dark">{codeContent}</code>
        </pre>
      );
    }

    const lines = trimmed.split("\n");
    if (lines.every((line) => /^\d+\.\s/.test(line.trim()) || line.trim() === "")) {
      return renderListBlock(lines, true, index);
    }
    if (lines.every((line) => /^-\s/.test(line.trim()) || line.trim() === "")) {
      return renderListBlock(lines, false, index);
    }

    if (trimmed.startsWith("*") && trimmed.endsWith("*") && !trimmed.startsWith("**")) {
      return (
        <p key={index} className="my-4 italic text-ink-muted">
          {trimmed.slice(1, -1)}
        </p>
      );
    }

    return (
      <p key={index} className={`my-4 font-inter text-[16px] leading-[1.7] ${BODY}`}>
        {renderInlineMarkdown(trimmed)}
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

export function BlogPostContent({ post, relatedPosts, twitterShareUrl, linkedinShareUrl, postUrl }: BlogPostContentProps) {
  return (
    <>
      <div className={`${WRAP} pt-10`}>
        <Link href="/blog" className="font-inter text-[13px] text-ink-muted hover:text-clay">
          ← Back to Blog
        </Link>
      </div>

      <Masthead eyebrow="Blog" title={post.title}>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-inter text-[13px] text-ink-muted">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.author}</span>
          <span aria-hidden="true">·</span>
          <span>{post.readingTime} min read</span>
        </p>
      </Masthead>

      <div className={`${WRAP} pb-12`}>
        <Reveal>
          <article className="mx-auto max-w-3xl rounded-2xl border border-sand bg-paper-card px-8 py-10 md:px-12">
            <div>{renderContent(post.content)}</div>

            {post.tags.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-2 border-t border-sand pt-6" aria-label="Tags">
                {post.tags.map((tag) => (
                  <li key={tag} className="rounded-full bg-paper-alt px-2.5 py-1 font-inter text-xs text-ink-muted">
                    {tag}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 border-t border-sand pt-6">
              <p className={`${EYEBROW} mb-3`}>Share this post</p>
              <div className="flex flex-wrap gap-3">
                <a href={twitterShareUrl} target="_blank" rel="noopener noreferrer" className={BTN_OUTLINE}>
                  Twitter / X
                </a>
                <a href={linkedinShareUrl} target="_blank" rel="noopener noreferrer" className={BTN_OUTLINE}>
                  LinkedIn
                </a>
                <CopyLinkButton url={postUrl} />
              </div>
            </div>
          </article>
        </Reveal>
      </div>

      {relatedPosts.length > 0 && (
        <section className={`${WRAP} pb-16`} aria-labelledby="related-posts-heading">
          <Reveal>
            <h2 id="related-posts-heading" className="mb-6 font-newsreader text-[26px] font-medium text-ink">
              Related posts
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {relatedPosts.map((relatedPost) => (
                <PostCard key={relatedPost.slug} post={relatedPost} />
              ))}
            </div>
          </Reveal>
        </section>
      )}
    </>
  );
}
