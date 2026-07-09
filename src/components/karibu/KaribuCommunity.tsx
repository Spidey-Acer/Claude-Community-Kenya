"use client";

/**
 * KaribuCommunity — the Community Hub, restyled warm-light (redesign in place).
 *
 * Preserves every Hub feature: type + sort filters (URL-driven), submission
 * count, resource cards with upvotes/comments/tags/links, submitter, and the
 * empty state. Data comes from getCommunitySubmissions via the server page.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, ExternalLink, Github, Plus } from "lucide-react";
import type { CommunitySubmissionView } from "@/lib/data";
import { Reveal } from "@/components/karibu/motion/Reveal";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

const TYPES = [
  { key: "", label: "All" },
  { key: "MCP", label: "MCPs" },
  { key: "PROMPT", label: "Prompts" },
  { key: "WORKFLOW", label: "Workflows" },
  { key: "TOOL", label: "Tools" },
] as const;

const SORTS = [
  { key: "recent", label: "Recent" },
  { key: "popular", label: "Popular" },
] as const;

const TYPE_LABEL: Record<CommunitySubmissionView["type"], string> = {
  MCP: "MCP",
  PROMPT: "Prompt",
  WORKFLOW: "Workflow",
  TOOL: "Tool",
};

export function KaribuCommunity({
  items,
  total,
  activeType,
  activeSort,
}: {
  items: CommunitySubmissionView[];
  total: number;
  activeType?: string;
  activeSort: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/community?${params.toString()}`);
  }

  return (
    <>
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Community hub header">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className={`${KICKER} mb-4`}>Community · Jamii</div>
              <h1 className="mb-3 font-newsreader text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink sm:text-[52px]">
                Built &amp; shared by the community.
              </h1>
              <p className="max-w-[600px] font-inter text-[17px] leading-[1.6] text-ink-soft">
                MCPs, prompts, workflows and tools made by CCK members. Try them,
                remix them, and share your own.
              </p>
            </div>
            <Link
              href="/community/submit"
              className="inline-flex items-center gap-2 rounded-full bg-clay px-5 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
            >
              <Plus className="h-4 w-4" /> Share something
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Filters */}
      <section className={`${WRAP} pb-6`} aria-label="Filters">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {TYPES.map((t) => {
              const on = (activeType ?? "") === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => update("type", t.key)}
                  aria-pressed={on}
                  className={`shrink-0 rounded-full px-4 py-2 font-inter text-[13.5px] font-semibold transition-colors ${
                    on
                      ? "bg-ink text-paper-card"
                      : "border border-sand-2 bg-paper-card font-medium text-[#4A4238] hover:border-ink"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex gap-2">
            {SORTS.map((s) => {
              const on = activeSort === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => update("sort", s.key)}
                  aria-pressed={on}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 font-inter text-xs font-semibold transition-colors ${
                    on ? "bg-paper-alt text-ink" : "border border-sand-2 text-ink-muted hover:border-ink"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
        <p className="mt-3 font-inter text-[13px] text-ink-muted">
          {total} {total === 1 ? "submission" : "submissions"}
        </p>
      </section>

      {/* Grid */}
      <section className={`${WRAP} pb-16`} aria-label="Submissions">
        {items.length > 0 ? (
          <Reveal className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((s) => (
              <ResourceCard key={s.slug} submission={s} />
            ))}
          </Reveal>
        ) : (
          <div className="rounded-2xl border border-sand bg-paper-card p-10 text-center">
            <p className="mb-4 font-newsreader text-[24px] text-ink">
              Nothing here yet.
            </p>
            <Link
              href="/community/submit"
              className="inline-flex rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
            >
              Be the first to share
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

function ResourceCard({ submission }: { submission: CommunitySubmissionView }) {
  return (
    <Link
      href={`/community/${submission.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-sand bg-paper-card p-6 transition-colors hover:border-clay"
      aria-label={`${submission.title} — ${TYPE_LABEL[submission.type]}`}
    >
      <div className="mb-3">
        <span className="inline-block rounded-full bg-[#F3E3D9] px-2.5 py-0.5 font-inter text-[11px] font-semibold uppercase tracking-[0.06em] text-clay">
          {TYPE_LABEL[submission.type]}
        </span>
      </div>
      <h3 className="mb-2 font-newsreader text-[20px] text-ink transition-colors group-hover:text-clay">
        {submission.title}
      </h3>
      <p className="mb-4 line-clamp-2 font-inter text-[14px] leading-[1.55] text-ink-soft">
        {submission.shortDescription}
      </p>
      {submission.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {submission.tags.slice(0, 5).map((tag) => (
            <span key={tag} className="rounded-full bg-paper-alt px-2 py-0.5 font-inter text-[11px] text-ink-muted">
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between border-t border-sand pt-3">
        <div className="flex items-center gap-4 font-inter text-[12.5px] text-ink-muted">
          <span className="flex items-center gap-1 font-medium">
            <ArrowUp className="h-3.5 w-3.5" />
            {submission.upvoteCount}
          </span>
          <span>
            {submission.commentCount} {submission.commentCount === 1 ? "comment" : "comments"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-ink-muted">
          {submission.repoUrl && <Github className="h-3.5 w-3.5" aria-hidden="true" />}
          {submission.url && <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
        </div>
      </div>
      {submission.submitterName && (
        <p className="mt-2 font-inter text-[12px] text-ink-muted">
          by <span className="text-ink-soft">{submission.submitterName}</span>
        </p>
      )}
    </Link>
  );
}
