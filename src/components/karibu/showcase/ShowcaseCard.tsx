import Link from "next/link"
import Image from "next/image"
import { ArrowUp, MessageCircle, Sparkles } from "lucide-react"
import type { ShowcasePostView } from "@/lib/showcase/queries"
import { NEED_LABELS } from "@/lib/showcase/constants"

interface ShowcaseCardProps {
  post: ShowcasePostView
}

/** Top reactions shown compactly on the card — the full row lives on the detail page. */
function topReactions(counts: Record<string, number>, limit = 3): Array<[string, number]> {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}

/**
 * One showcase post in the feed grid: cover, title, description, event
 * provenance, needs, and an engagement strip.
 *
 * The whole card is a single `<Link>`, so needs render as plain badges here
 * rather than the real filter links `NeedsChips` produces elsewhere —
 * nesting an `<a>` inside this `<a>` would be invalid HTML.
 */
export function ShowcaseCard({ post }: ShowcaseCardProps) {
  const reactions = topReactions(post.reactionCounts)

  return (
    <Link
      href={`/showcase/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-sand bg-paper-card transition-[transform,border-color] duration-150 ease-[var(--ease-reversible)] hover:-translate-y-1 hover:border-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
    >
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-paper-alt">
        {post.coverImageUrl ? (
          <Image
            src={post.coverImageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Sparkles className="h-8 w-8 text-sand-2" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {post.eventName && (
          <p className="mb-1.5 font-inter text-[11.5px] font-medium uppercase tracking-[0.08em] text-clay">
            From {post.eventName}
          </p>
        )}
        <h3 className="mb-2 font-newsreader text-[19px] leading-snug text-ink transition-colors group-hover:text-clay">
          {post.title}
        </h3>
        <p className="mb-3 line-clamp-2 flex-1 font-inter text-[14px] leading-[1.55] text-ink-soft">
          {post.shortDescription}
        </p>

        {post.needs.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.needs.map((need) => (
              <span
                key={need}
                className="rounded-full border border-clay/30 bg-clay/10 px-2.5 py-1 font-inter text-[11px] font-medium text-clay"
              >
                {NEED_LABELS[need]}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-sand pt-3">
          <div className="flex items-center gap-4 font-inter text-[12.5px] text-ink-muted">
            <span className="flex items-center gap-1 font-medium">
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
              {post.upvoteCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {post.commentCount}
            </span>
          </div>
          {reactions.length > 0 && (
            <div
              className="flex items-center gap-1.5 font-inter text-[12.5px] text-ink-muted"
              aria-label="Top reactions"
            >
              {reactions.map(([emoji, count]) => (
                <span key={emoji} className="tabular-nums">
                  {emoji}
                  {count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
