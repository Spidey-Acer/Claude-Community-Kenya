import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBlogPostBySlug,
  blogPosts,
  getSortedBlogPosts,
} from "@/data/blog-posts";
import { BlogPostCard } from "@/components/sections/BlogPostCard";
import { TerminalWindow, ScrollReveal, CommandPrefix } from "@/components/terminal";
import { Badge } from "@/components/ui/Badge";
import { CopyLinkButton } from "./CopyLinkButton";
import { formatDate } from "@/lib/utils";
import { SITE_CONFIG } from "@/lib/constants";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return { title: `Post Not Found | ${SITE_CONFIG.name}` };
  }

  return {
    title: `${post.title} | ${SITE_CONFIG.name}`,
    description: post.excerpt,
  };
}

function renderContent(content: string) {
  const blocks = content.split("\n\n");

  return blocks.map((block, index) => {
    const trimmed = block.trim();

    // Skip empty blocks
    if (!trimmed) return null;

    // Horizontal rule
    if (trimmed === "---") {
      return (
        <hr
          key={index}
          className="my-8 border-border-default"
        />
      );
    }

    // Headings (## )
    if (trimmed.startsWith("## ")) {
      return (
        <h2
          key={index}
          className="mb-4 mt-8 font-mono text-xl font-bold text-green-primary"
        >
          {trimmed.slice(3)}
        </h2>
      );
    }

    // Headings (### )
    if (trimmed.startsWith("### ")) {
      return (
        <h3
          key={index}
          className="mb-3 mt-6 font-mono text-lg font-bold text-amber"
        >
          {trimmed.slice(4)}
        </h3>
      );
    }

    // Code blocks (``` delimited)
    if (trimmed.startsWith("```")) {
      const lines = trimmed.split("\n");
      const codeContent = lines.slice(1, -1).join("\n");
      return (
        <pre
          key={index}
          className="my-4 overflow-x-auto border border-border-default bg-bg-secondary p-4 font-mono text-sm text-green-dim"
        >
          <code>{codeContent}</code>
        </pre>
      );
    }

    // Check if block is a numbered or bulleted list
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
                <li
                  key={i}
                  className="font-sans text-text-secondary"
                >
                  <span className="mr-2 font-mono text-green-primary">
                    {i + 1}.
                  </span>
                  {renderInlineMarkdown(text)}
                </li>
              );
            })}
        </ol>
      );
    }

    if (isBulletList) {
      return (
        <ul key={index} className="my-4 list-inside space-y-2">
          {lines
            .filter((line) => line.trim())
            .map((line, i) => {
              const text = line.replace(/^-\s*/, "");
              return (
                <li
                  key={i}
                  className="font-sans text-text-secondary"
                >
                  <span className="mr-2 font-mono text-green-primary">
                    &gt;
                  </span>
                  {renderInlineMarkdown(text)}
                </li>
              );
            })}
        </ul>
      );
    }

    // Italic block (starts and ends with *)
    if (trimmed.startsWith("*") && trimmed.endsWith("*") && !trimmed.startsWith("**")) {
      return (
        <p
          key={index}
          className="my-4 font-sans italic text-text-dim"
        >
          {trimmed.slice(1, -1)}
        </p>
      );
    }

    // Default paragraph
    return (
      <p
        key={index}
        className="my-4 font-sans leading-relaxed text-text-secondary"
      >
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Process bold (**text**), inline code (`code`), and links [text](url)
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Find the earliest match
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

    // Add text before the match
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }

    if (first.type === "bold") {
      parts.push(
        <strong key={keyIndex++} className="font-semibold text-text-primary">
          {first.match[1]}
        </strong>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === "code") {
      parts.push(
        <code
          key={keyIndex++}
          className="border border-border-default bg-bg-secondary px-1.5 py-0.5 font-mono text-sm text-green-dim"
        >
          {first.match[1]}
        </code>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === "link") {
      parts.push(
        <a
          key={keyIndex++}
          href={first.match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-primary underline underline-offset-4 transition-colors hover:text-green-dim"
        >
          {first.match[1]}
        </a>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    }
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const allPosts = getSortedBlogPosts();
  const relatedPosts = allPosts
    .filter((p) => p.slug !== post.slug)
    .slice(0, 2);

  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`${SITE_CONFIG.url}/blog/${post.slug}`)}`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${SITE_CONFIG.url}/blog/${post.slug}`)}`;

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Back link */}
        <ScrollReveal>
          <Link
            href="/blog"
            className="mb-8 inline-flex items-center gap-2 font-mono text-sm text-text-dim transition-colors hover:text-green-primary"
          >
            <span aria-hidden="true">&larr;</span>
            Back to Blog
          </Link>
        </ScrollReveal>

        {/* Article */}
        <ScrollReveal delay={100}>
          <TerminalWindow
            title={`blog/${post.slug}`}
            variant="default"
          >
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
                {renderContent(post.content)}
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
                  <CopyLinkButton url={`${SITE_CONFIG.url}/blog/${post.slug}`} />
                </div>
              </div>
            </article>
          </TerminalWindow>
        </ScrollReveal>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <ScrollReveal delay={200}>
            <section className="mt-20">
              <h2 className="mb-8 font-mono text-xl font-bold text-text-primary">
                <CommandPrefix />
                Related Posts
              </h2>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {relatedPosts.map((relatedPost) => (
                  <BlogPostCard key={relatedPost.slug} post={relatedPost} />
                ))}
              </div>
            </section>
          </ScrollReveal>
        )}
      </div>
    </main>
  );
}
