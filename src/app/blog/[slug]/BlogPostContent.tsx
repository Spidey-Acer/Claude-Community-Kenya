"use client";

/**
 * BlogPostContent: one blog post on the page kit (warm light). A small
 * markdown subset renderer (headings, lists, code, bold, inline code, links),
 * the post meta, tags, share links and two related posts as kit `PostCard`s.
 */

import React from "react";
import Link from "next/link";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { ArrowLeft } from "lucide-react";
import { BTN_OUTLINE, EYEBROW, Masthead, NewTabNote, PostCard, WRAP } from "@/components/karibu/kit";
import { isBlockquote, parseImageBlock, stripBlockquote, tokenizeInline, type InlineToken } from "@/lib/blog-markdown";
import { CopyLinkButton } from "./CopyLinkButton";
import { formatDate } from "@/lib/utils";
import type { BlogPostView } from "@/lib/data";

const BODY = "text-ink-soft";

// ─── Inline markdown renderer ────────────────────────────────────────────────

const INLINE_LINK = "font-semibold text-clay hover:text-clay-dark";

/** Renders one inline token; targets were already vetted by `tokenizeInline`. */
function renderInlineToken(token: InlineToken, key: number): React.ReactNode {
  switch (token.type) {
    case "bold":
      return (
        <strong key={key} className="font-semibold text-ink">
          {token.text}
        </strong>
      );
    case "code":
      return (
        <code key={key} className="rounded border border-sand bg-paper-alt px-1.5 py-0.5 font-mono text-[13px] text-ink">
          {token.text}
        </code>
      );
    case "link": {
      const external = /^https?:/i.test(token.href);
      return (
        <a
          key={key}
          href={token.href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={INLINE_LINK}
        >
          {token.text}
          {external && <NewTabNote />}
        </a>
      );
    }
    case "image":
      return <ImageBlock key={key} alt={token.alt} src={token.src} />;
    default:
      return token.text;
  }
}

/** A post image with its alt text shown as a caption. */
function ImageBlock({ alt, src }: { alt: string; src: string }) {
  return (
    <span className="my-6 block">
      {/* eslint-disable-next-line @next/next/no-img-element -- author-supplied remote or relative source */}
      <img src={src} alt={alt} loading="lazy" className="w-full rounded-xl border border-sand" />
      {alt && <span className="mt-2 block font-inter text-[13px] text-ink-muted">{alt}</span>}
    </span>
  );
}

function renderInlineMarkdown(text: string): React.ReactNode {
  const tokens = tokenizeInline(text);
  if (tokens.length === 1 && tokens[0].type === "text") return tokens[0].text;
  return tokens.map(renderInlineToken);
}

// ─── Block renderer ──────────────────────────────────────────────────────────

function renderListBlock(lines: string[], ordered: boolean, index: number): React.ReactNode {
  const items = lines.filter((line) => line.trim());
  const strip = ordered ? /^\d+\.\s*/ : /^-\s*/;
  const List = ordered ? "ol" : "ul";
  return (
    <List key={index} className={`my-4 space-y-2 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-clay`}>
      {items.map((line, i) => (
        <li key={i} className={`font-inter text-[16px] leading-[1.7] ${BODY}`}>
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

    const imageBlock = parseImageBlock(trimmed);
    if (imageBlock) {
      return (
        <figure key={index}>
          <ImageBlock alt={imageBlock.alt} src={imageBlock.src} />
        </figure>
      );
    }

    if (isBlockquote(trimmed)) {
      return (
        <blockquote key={index} className="my-6 border-l-2 border-clay pl-5 font-inter text-[16px] italic leading-[1.7] text-ink-soft">
          {renderInlineMarkdown(stripBlockquote(trimmed))}
        </blockquote>
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
        <Link
          href="/blog"
          className="inline-flex min-h-11 items-center gap-2 font-inter text-[13px] text-ink-muted transition-colors hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Blog
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
          <article className="rounded-2xl border border-sand bg-paper-card px-8 py-10 md:px-12">
            <div className="max-w-[68ch]">{renderContent(post.content)}</div>

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
                  <NewTabNote />
                </a>
                <a href={linkedinShareUrl} target="_blank" rel="noopener noreferrer" className={BTN_OUTLINE}>
                  LinkedIn
                  <NewTabNote />
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
