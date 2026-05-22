import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { HeroEmailCapture } from "@/components/sections/HeroEmailCapture";
import { getNewsletterIssues, getNewsletterIssueBySlug } from "@/lib/data";
import { SITE_CONFIG } from "@/lib/constants";

export const revalidate = 3600;

export async function generateStaticParams() {
  const issues = await getNewsletterIssues().catch(() => []);
  return issues.map((issue) => ({ slug: issue.slug }));
}

interface NewsletterIssuePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: NewsletterIssuePageProps): Promise<Metadata> {
  const { slug } = await params;
  const issue = await getNewsletterIssueBySlug(slug);

  if (!issue) {
    return { title: `Issue Not Found | ${SITE_CONFIG.name}` };
  }

  return {
    title: `${issue.title} | Newsletter | ${SITE_CONFIG.name}`,
    description: issue.excerpt,
    alternates: {
      canonical: `${SITE_CONFIG.url}/newsletter/${issue.slug}`,
    },
    openGraph: {
      title: issue.title,
      description: issue.excerpt,
      url: `${SITE_CONFIG.url}/newsletter/${issue.slug}`,
      siteName: SITE_CONFIG.name,
      type: "article",
      publishedTime: issue.publishedAt,
    },
  };
}

/** Fraunces display-serif inline style */
const FRAUNCES: React.CSSProperties = {
  fontFamily: "var(--font-display), ui-serif, Georgia, serif",
  letterSpacing: "-0.025em",
};

/** Formats a date string as "May 2026" */
function formatIssueMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Pads an issue number to 2 digits: 3 → "03" */
function padIssueNumber(n: number): string {
  return String(n).padStart(2, "0");
}

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

    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }

    if (first.type === "bold") {
      parts.push(
        <strong key={keyIndex++} className="font-semibold text-[#faf9f5]">
          {first.match[1]}
        </strong>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === "code") {
      parts.push(
        <code
          key={keyIndex++}
          className="rounded px-1.5 py-0.5 bg-[#252524] border border-[#2a2a28] text-[13px] font-mono text-[#e8e6dc]"
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
          className="text-[#d97757] underline underline-offset-4 transition-colors hover:text-[#c06848]"
        >
          {first.match[1]}
        </a>
      );
      remaining = remaining.slice(first.index + first.match[0].length);
    }
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : parts;
}

// ─── Block markdown renderer ─────────────────────────────────────────────────

function renderBody(body: string): React.ReactNode[] {
  const blocks = body.split("\n\n");

  return blocks.map((block, index) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed === "---") {
      return <hr key={index} className="my-8 border-[#2a2a28]" />;
    }

    if (trimmed.startsWith("## ")) {
      return (
        <h2
          key={index}
          className="mb-4 mt-10 text-[26px] font-medium text-[#faf9f5]"
          style={FRAUNCES}
        >
          {trimmed.slice(3)}
        </h2>
      );
    }

    if (trimmed.startsWith("### ")) {
      return (
        <h3 key={index} className="mb-3 mt-6 text-[20px] font-semibold text-[#faf9f5]">
          {trimmed.slice(4)}
        </h3>
      );
    }

    if (trimmed.startsWith("```")) {
      const lines = trimmed.split("\n");
      const codeContent = lines.slice(1, -1).join("\n");
      return (
        <pre
          key={index}
          className="my-6 overflow-x-auto rounded-xl border border-[#2a2a28] bg-[#0f0f0e] p-5"
        >
          <code className="font-mono text-[13px] text-[#e8e6dc]">{codeContent}</code>
        </pre>
      );
    }

    const lines = trimmed.split("\n");
    const isBulletList = lines.every((line) => /^-\s/.test(line.trim()) || line.trim() === "");
    const isNumberedList = lines.every(
      (line) => /^\d+\.\s/.test(line.trim()) || line.trim() === ""
    );

    if (isBulletList) {
      return (
        <ul key={index} className="my-4 space-y-2">
          {lines
            .filter((line) => line.trim())
            .map((line, i) => (
              <li key={i} className="flex gap-3 text-[#b0aea5]">
                <span className="text-[#d97757]" aria-hidden="true">•</span>
                {renderInlineMarkdown(line.replace(/^-\s*/, ""))}
              </li>
            ))}
        </ul>
      );
    }

    if (isNumberedList) {
      return (
        <ol key={index} className="my-4 space-y-2">
          {lines
            .filter((line) => line.trim())
            .map((line, i) => (
              <li key={i} className="flex gap-3 text-[#b0aea5]">
                <span className="shrink-0 font-semibold text-[#d97757]">{i + 1}.</span>
                {renderInlineMarkdown(line.replace(/^\d+\.\s*/, ""))}
              </li>
            ))}
        </ol>
      );
    }

    if (trimmed.startsWith("> ")) {
      return (
        <blockquote
          key={index}
          className="my-6 border-l-2 border-[#d97757]/50 pl-5 text-[#b0aea5] italic"
        >
          {renderInlineMarkdown(trimmed.slice(2))}
        </blockquote>
      );
    }

    return (
      <p key={index} className="my-4 leading-[1.75] text-[#b0aea5]">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });
}

// ─── Page component ──────────────────────────────────────────────────────────

export default async function NewsletterIssuePage({ params }: NewsletterIssuePageProps) {
  const { slug } = await params;
  const issue = await getNewsletterIssueBySlug(slug);

  if (!issue) {
    notFound();
  }

  const eyebrow = `Issue ${padIssueNumber(issue.number)} · ${formatIssueMonth(issue.publishedAt)}`;

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Newsletter", url: "/newsletter" },
          { name: issue.title },
        ]}
      />

      <div className="mx-auto max-w-2xl">
        {/* Back link */}
        <Link
          href="/newsletter"
          className="link-refined mb-8 inline-flex items-center gap-1.5 text-sm text-[#9a9890] transition-colors hover:text-[#faf9f5]"
        >
          <span aria-hidden="true">←</span> All issues
        </Link>

        {/* Issue header */}
        <header className="mb-10">
          <p className="mb-3 text-[11px] font-medium uppercase tracking-widest text-[#d97757]">
            {eyebrow}
          </p>
          <h1
            className="mb-4 text-4xl font-semibold text-[#faf9f5] sm:text-5xl"
            style={FRAUNCES}
          >
            {issue.title}
          </h1>
          <p className="text-lg leading-relaxed text-[#b0aea5]">{issue.excerpt}</p>
        </header>

        {/* Divider */}
        <div className="mb-10 h-px w-full bg-[#2a2a28]" aria-hidden="true" />

        {/* Body */}
        <article
          className="prose-none"
          aria-label={`Newsletter issue: ${issue.title}`}
        >
          {renderBody(issue.body)}
        </article>

        {/* Footer email capture */}
        <div className="mt-16 rounded-2xl border border-[#2a2a28] bg-[#1e1e1d]/80 p-8 text-center">
          <p
            className="mb-2 text-lg font-medium text-[#faf9f5]"
            style={FRAUNCES}
          >
            Enjoyed this issue?
          </p>
          <p className="mb-6 text-sm text-[#b0aea5]">
            Get next month&apos;s digest straight to your inbox.
          </p>
          <HeroEmailCapture
            label="Get next month's digest"
            buttonLabel="Subscribe"
            className="mx-auto max-w-sm"
          />
        </div>
      </div>
    </main>
  );
}
