import Link from "next/link"
import { ArrowLeft, ExternalLink, Github } from "lucide-react"
import { getMyReactions, type ShowcasePostView } from "@/lib/showcase/queries"
import type { CommunityCommentView } from "@/lib/data"
import { getSessionUserId } from "@/lib/auth-helpers"
import { MediaGallery } from "@/components/karibu/showcase/MediaGallery"
import { BuiltWithPanel } from "@/components/karibu/showcase/BuiltWithPanel"
import { NeedsChips } from "@/components/karibu/showcase/NeedsChips"
import { ReactionRow } from "@/components/karibu/showcase/ReactionRow"
import { ReportButton } from "@/components/karibu/showcase/ReportButton"
import { CopyButton } from "@/components/community/CopyButton"
import { TYPE_LABELS } from "@/lib/showcase/constants"
import { BADGE_SAND, BTN_OUTLINE, BTN_PRIMARY, META, Masthead } from "@/components/karibu/kit"
import { CommentForm } from "@/components/community/CommentForm"
import { CommentList } from "@/components/community/CommentList"

interface ShowcaseDetailProps {
  post: ShowcasePostView
  comments: CommunityCommentView[]
  commentsFailed?: boolean
}

/**
 * The full showcase post: header, media, description, needs, built-with,
 * reactions, links out, and comments.
 *
 * An async server component, not `"use client"` — the pinned `page.tsx`
 * fetches only the post and its comments, and `ReactionRow`'s contract takes
 * `signedIn` as a prop rather than resolving it itself. Reading the session
 * here, with `getSessionUserId()`, is the only place left to produce that
 * value. That read touches cookies, which makes this route effectively
 * dynamic — the `revalidate = 300` the page file declares no longer serves a
 * cached response. Accepted for Phase 1 given the pinned contracts; a
 * follow-up could move the session check into a small client island if the
 * ISR loss matters later.
 *
 * Since the session is already being read here, the member's own prior
 * reactions are fetched alongside it — otherwise a returning reactor would see
 * their own emoji un-highlighted and be invited to react a second time, which
 * the toggle would read as taking it back.
 */
export async function ShowcaseDetail({ post, comments, commentsFailed }: ShowcaseDetailProps) {
  const userId = await getSessionUserId()
  const signedIn = Boolean(userId)
  const mine = await getMyReactions(post.id, userId)

  return (
    <div className="mx-auto max-w-[820px] px-6 pb-20 pt-12 md:px-10">
      <Link
        href="/showcase"
        className="mb-4 inline-flex min-h-11 items-center gap-2 font-inter text-[13px] text-ink-muted transition-colors hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to Showcase
      </Link>

      <Masthead eyebrow={TYPE_LABELS[post.type]} title={<span className="break-words">{post.title}</span>} lead={post.shortDescription} flush>
        <div className={`mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 ${META}`}>
          {post.eventName &&
            (post.eventSlug ? (
              <Link
                href={`/events/${post.eventSlug}`}
                className="inline-flex min-h-11 items-center font-semibold text-clay transition-colors hover:text-clay-dark"
              >
                From {post.eventName}
              </Link>
            ) : (
              <span className="font-semibold text-clay">From {post.eventName}</span>
            ))}
          {post.authorName && <span>by {post.authorName}</span>}
          <span>
            {new Date(post.createdAt).toLocaleDateString("en-KE", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "Africa/Nairobi",
            })}
          </span>
        </div>
      </Masthead>

      <div className="mt-8">
        <MediaGallery media={post.media} />
      </div>

      {(post.url || post.repoUrl) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className={BTN_PRIMARY}
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Visit project
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          )}
          {post.repoUrl && (
            <a
              href={post.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={BTN_OUTLINE}
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              View source
              <span className="sr-only"> (opens in new tab)</span>
            </a>
          )}
        </div>
      )}

      <div className="mt-8 space-y-4 font-inter text-[15.5px] leading-[1.7] text-ink-soft">
        {post.fullDescription.split(/\n{2,}/).map((paragraph, i) => (
          <p key={i} className="whitespace-pre-wrap break-words">
            {paragraph}
          </p>
        ))}
      </div>

      {post.installInstructions && (
        <section className="mt-10">
          <h2 className="mb-4 font-newsreader text-[24px] text-ink">Installation</h2>
          <div className="relative rounded-2xl border border-sand bg-paper-card p-5">
            <pre className="overflow-x-auto whitespace-pre-wrap pr-10 font-mono text-[13px] leading-relaxed text-ink-soft">
              {post.installInstructions}
            </pre>
            <CopyButton text={post.installInstructions} />
          </div>
        </section>
      )}

      {post.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className={BADGE_SAND}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {post.needs.length > 0 && (
        <div className="mt-8 rounded-2xl border border-sand bg-paper-card p-5">
          <h2 className="mb-3 font-inter text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Looking for
          </h2>
          <NeedsChips needs={post.needs} />
        </div>
      )}

      <div className="mt-8">
        <BuiltWithPanel builtWith={post.builtWith} />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-y border-sand py-5">
        <ReactionRow
          slug={post.slug}
          initialCounts={post.reactionCounts}
          initialMine={mine}
          signedIn={signedIn}
        />
        <ReportButton targetId={post.id} />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-newsreader text-[24px] text-ink">
          Comments{commentsFailed ? "" : ` (${comments.length})`}
        </h2>
        <div className="mb-8">
          <CommentForm slug={post.slug} />
        </div>
        {commentsFailed ? (
          <p className="font-inter text-sm text-ink-muted">
            Comments couldn&apos;t be loaded right now — refresh to try again.
          </p>
        ) : (
          <CommentList comments={comments} />
        )}
      </section>
    </div>
  )
}
