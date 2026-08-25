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
import { CommentForm } from "@/components/community/CommentForm"
import { CommentList } from "@/components/community/CommentList"

interface ShowcaseDetailProps {
  post: ShowcasePostView
  comments: CommunityCommentView[]
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
export async function ShowcaseDetail({ post, comments }: ShowcaseDetailProps) {
  const userId = await getSessionUserId()
  const signedIn = Boolean(userId)
  const mine = await getMyReactions(post.id, userId)

  return (
    <div className="mx-auto max-w-[820px] px-6 pb-20 pt-12 md:px-10">
      <Link
        href="/showcase"
        className="mb-8 inline-flex items-center gap-2 font-inter text-[13px] text-ink-muted transition-colors hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to Showcase
      </Link>

      <header className="mb-8">
        {post.eventName && (
          <p className="mb-2 font-inter text-[12px] font-semibold uppercase tracking-[0.1em] text-clay">
            {post.eventSlug ? (
              <Link href={`/events/${post.eventSlug}`} className="hover:underline">
                From {post.eventName}
              </Link>
            ) : (
              `From ${post.eventName}`
            )}
          </p>
        )}
        <h1 className="mb-3 font-newsreader text-[36px] leading-[1.08] tracking-[-0.01em] text-ink sm:text-[44px]">
          {post.title}
        </h1>
        <p className="mb-4 font-inter text-[17px] leading-[1.6] text-ink-soft">{post.shortDescription}</p>
        <div className="flex flex-wrap items-center gap-4 font-inter text-[13px] text-ink-muted">
          {post.authorName && <span>by {post.authorName}</span>}
          <span>
            {new Date(post.createdAt).toLocaleDateString("en-KE", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </header>

      <MediaGallery media={post.media} />

      {(post.url || post.repoUrl) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-clay px-5 py-2.5 font-inter text-[14px] font-semibold text-paper-card transition-colors hover:bg-clay-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              Visit project
            </a>
          )}
          {post.repoUrl && (
            <a
              href={post.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-sand px-5 py-2.5 font-inter text-[14px] font-semibold text-ink-soft transition-colors hover:border-clay hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              View source
            </a>
          )}
        </div>
      )}

      <div className="mt-8 space-y-4 font-inter text-[15.5px] leading-[1.7] text-ink-soft">
        {post.fullDescription.split(/\n{2,}/).map((paragraph, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {paragraph}
          </p>
        ))}
      </div>

      {post.tags.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-paper-alt px-2.5 py-1 font-inter text-[12px] text-ink-muted">
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
        <h2 className="mb-4 font-newsreader text-[24px] text-ink">Comments ({comments.length})</h2>
        <div className="mb-8">
          <CommentForm slug={post.slug} />
        </div>
        <CommentList comments={comments} />
      </section>
    </div>
  )
}
