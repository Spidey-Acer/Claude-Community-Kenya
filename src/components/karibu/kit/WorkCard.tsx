/**
 * WorkCard: one member submission (project, prompt, MCP server) as a link card
 * to its showcase page: cover on a matte, type label, title, short description
 * and author. The whole card is one link, so nothing interactive nests inside.
 *
 * Full mode (the Showcase feed) adds event provenance, needs badges and an
 * engagement strip. `compact` (Home) drops those and the empty-cover sparkle,
 * so a card never shows counts or placeholder art.
 */

import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import type { ShowcasePostView } from "@/lib/showcase/queries";
import { NEED_LABELS, TYPE_LABELS } from "@/lib/showcase/constants";
import { CARD, META } from "./tokens";

interface WorkCardProps {
  submission: ShowcasePostView;
  /** Hide event, needs, reaction and comment counts, and the cover placeholder. */
  compact?: boolean;
}

/** Top reactions shown on the card; the full row lives on the detail page. */
function topReactions(counts: Record<string, number>, limit = 3): Array<[string, number]> {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function WorkCard({ submission, compact = false }: WorkCardProps) {
  return (
    <Link href={`/showcase/${submission.slug}`} className={CARD}>
      {/* Covers are member uploads, usually near-square; contained on a matte so nothing is cropped. */}
      <div className="frame-base frame-plate w-full shrink-0">
        {submission.coverImageUrl ? (
          <Image
            src={submission.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-contain"
          />
        ) : (
          !compact && (
            <div className="flex h-full w-full items-center justify-center">
              <Sparkles className="h-8 w-8 text-sand-2" aria-hidden="true" />
            </div>
          )
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-1.5 font-inter text-xs font-medium uppercase tracking-[0.08em] text-ink-muted">
          {TYPE_LABELS[submission.type]}
        </p>
        {!compact && submission.eventName && (
          <p className="mb-1.5 font-inter text-xs font-medium uppercase tracking-[0.08em] text-clay">
            From {submission.eventName}
          </p>
        )}
        <h3 className="mb-1.5 font-newsreader text-[20px] leading-tight text-ink transition-colors group-hover:text-clay">
          {submission.title}
        </h3>
        <p className="mb-3 line-clamp-3 flex-1 font-inter text-[14.5px] leading-[1.55] text-ink-soft">
          {submission.shortDescription}
        </p>
        {!compact && <NeedsBadges needs={submission.needs} />}
        {submission.authorName && <p className={META}>by {submission.authorName}</p>}
        {!compact && <EngagementStrip submission={submission} />}
      </div>
    </Link>
  );
}

/** Plain badges, not links: the card is already one link. */
function NeedsBadges({ needs }: { needs: ShowcasePostView["needs"] }) {
  if (needs.length === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {needs.map((need) => (
        <span
          key={need}
          className="rounded-full border border-clay/30 bg-clay/10 px-2.5 py-1 font-inter text-[11px] font-medium text-clay"
        >
          {NEED_LABELS[need]}
        </span>
      ))}
    </div>
  );
}

/** Reaction and comment counts. `upvoteCount` is the total reaction count for showcase posts. */
function EngagementStrip({ submission }: { submission: ShowcasePostView }) {
  const reactions = topReactions(submission.reactionCounts);
  return (
    <div className="mt-3 flex items-center justify-between border-t border-sand pt-3">
      <div className="flex items-center gap-4 font-inter text-[12.5px] text-ink-muted">
        <span className="flex items-center gap-1 font-medium">
          <Heart className="h-3.5 w-3.5" aria-hidden="true" />
          {submission.upvoteCount}
          <span className="sr-only">{submission.upvoteCount === 1 ? "reaction" : "reactions"}</span>
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {submission.commentCount}
          <span className="sr-only">{submission.commentCount === 1 ? "comment" : "comments"}</span>
        </span>
      </div>
      {reactions.length > 0 && (
        <div className="flex items-center gap-1.5 font-inter text-[12.5px] text-ink-muted" aria-label="Top reactions">
          {reactions.map(([emoji, count]) => (
            <span key={emoji} className="tabular-nums">
              {emoji}
              {count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
