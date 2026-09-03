import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SITE_CONFIG } from "@/lib/constants"
import { findResultCardBySlug } from "@/lib/impact-lab/result-card-store"
import { resultCardPath, type PublicResultCard } from "@/lib/impact-lab/result-card"

/**
 * A team's public result card — the page a participant posts.
 *
 * Reachable only by the derived slug in that team's results email; there is
 * no index, no listing and no `generateStaticParams`, and the page is
 * `noindex` so a search engine that is handed the link does not build one.
 * It shows the placing, the project, the track, the event and first names
 * with a last initial. Scores, ranges, judge notes and the community review
 * live in the email and on the signed-in dashboard, never here — see
 * `PublicResultCard`, which is the whole of what this page can read.
 *
 * 404s for an unknown slug and for a run whose results are not published:
 * `findResultCardBySlug` only ever scans published runs, so an unpublished
 * team's slug resolves to nothing even though it is derivable in advance.
 */

/**
 * Never cached: an organiser's post-publish correction to a snapshot must
 * show on the next load. Note on the status code — the root layout renders
 * dynamically and the root `loading.tsx` streams a shell before this page
 * resolves, so `notFound()` here yields the not-found page (no card, no
 * data, `noindex`) with a 200 status rather than a 404 header. That is a
 * property of every dynamic route in this app, not of this page; a true 404
 * header needs the root boundary changed, not this file.
 */
export const dynamic = "force-dynamic"

type Params = { params: Promise<{ slug: string }> }

/** "Winner in Kilimo: Nitapata?" / "Built at Impact Lab 02" — one line for titles and the OG text. */
function headline(card: PublicResultCard): string {
  return card.title === "Built"
    ? `${card.projectName}, built at ${card.eventName}`
    : `${card.title} in ${card.track}: ${card.projectName}`
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const card = await findResultCardBySlug(slug)
  if (!card) {
    return { title: "Result not found", robots: { index: false, follow: false } }
  }

  const url = `${SITE_CONFIG.url}${resultCardPath(slug)}`
  const title = headline(card)
  const description = `${card.members.join(", ")} at ${card.eventName}${card.eventDates ? ` (${card.eventDates})` : ""}, hosted by Claude Community Kenya.`

  return {
    // The root layout's title template appends the site name.
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_CONFIG.name,
      type: "article",
      images: [{ url: `${url}/opengraph-image`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description },
  }
}

export default async function ResultCardPage({ params }: Params) {
  const { slug } = await params
  const card = await findResultCardBySlug(slug)
  if (!card) notFound()

  const url = `${SITE_CONFIG.url}${resultCardPath(slug)}`
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
  const isWinner = card.title === "Winner"
  const isPodium = card.title !== "Built"

  // Winner: clay. Runner-up / third: the non-inverting dark panel. Built:
  // paper-card with a sand rule. Same three treatments the email uses.
  const panelClass = isWinner
    ? "bg-clay text-paper-card"
    : isPodium
      ? "bg-panel-dark text-on-panel-dark"
      : "bg-paper-card text-ink border border-sand"
  const mutedClass = isWinner
    ? "text-paper-card/80"
    : isPodium
      ? "text-on-panel-dark-muted"
      : "text-ink-muted"
  const ruleClass = isWinner ? "bg-paper-card/40" : isPodium ? "bg-on-panel-dark/25" : "bg-clay"

  return (
    <main className="min-h-screen bg-paper px-4 py-12 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <p className="mb-6 text-center font-sans text-[11px] uppercase tracking-[0.2em] text-ink-muted">
          {card.eventName}
          {card.eventDates ? <span className="text-ink-faint"> &middot; {card.eventDates}</span> : null}
        </p>

        <article
          className={`overflow-hidden rounded-2xl px-7 py-10 shadow-[0_24px_60px_-30px_rgba(35,32,27,0.35)] sm:px-12 sm:py-14 ${panelClass}`}
          aria-label={headline(card)}
        >
          <p className={`font-sans text-[11px] uppercase tracking-[0.2em] ${mutedClass}`}>
            {isPodium ? card.track : "You built this"}
          </p>

          <h1 className="mt-4 text-[clamp(2.6rem,9vw,4.5rem)] font-semibold leading-[0.95] tracking-tight">
            {isPodium ? card.title : card.projectName}
          </h1>

          <div className={`my-7 h-0.5 w-12 ${ruleClass}`} aria-hidden="true" />

          {isPodium ? (
            <p className="font-serif text-2xl leading-snug sm:text-3xl">{card.projectName}</p>
          ) : (
            <p className={`font-serif text-xl italic leading-snug sm:text-2xl ${mutedClass}`}>
              at {card.eventName}
              {card.track ? <span> &middot; {card.track} track</span> : null}
            </p>
          )}

          {card.members.length > 0 ? (
            <p className={`mt-6 font-sans text-sm leading-relaxed sm:text-[15px] ${mutedClass}`}>
              {card.members.join(" · ")}
            </p>
          ) : null}
        </article>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href={linkedInShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-lg bg-clay px-6 py-3 font-sans text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay sm:w-auto"
          >
            Share on LinkedIn
          </a>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-lg border border-ink px-6 py-3 font-sans text-sm font-semibold text-ink transition-colors hover:bg-paper-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay sm:w-auto"
          >
            Claude Community Kenya
          </Link>
        </div>

        <p className="mt-8 text-center font-sans text-xs leading-relaxed text-ink-muted">
          Hosted by Claude Community Kenya in Nairobi. Scores and judges&apos; notes stay private to the team.
        </p>
      </div>
    </main>
  )
}
