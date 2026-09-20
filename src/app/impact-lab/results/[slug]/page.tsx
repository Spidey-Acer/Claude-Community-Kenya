import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SITE_CONFIG } from "@/lib/constants"
import { findResultCardBySlug } from "@/lib/impact-lab/result-card-store"
import { cardHeadline, resultCardPath } from "@/lib/impact-lab/result-card"
import { ResultCardView } from "./ResultCardView"

/**
 * A team's public result card — the page a participant posts.
 *
 * Reachable only by the derived slug in that team's results email; there is
 * no index, no listing and no `generateStaticParams`, and the page is
 * `noindex` so a search engine that is handed the link does not build one.
 * It shows the Build Day card itself: the placing, the project, the event
 * and first names with a last initial. Scores, ranges, judge notes and the
 * community review live in the email and on the signed-in dashboard, never
 * here — see `PublicResultCard`, which is the whole of what this page can
 * read.
 *
 * The card on screen IS the square download: an `<img>` of `card/square`,
 * not a second HTML rendering that could drift from the PNG a team posts.
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

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const card = await findResultCardBySlug(slug)
  if (!card) {
    return { title: "Result not found", robots: { index: false, follow: false } }
  }

  const url = `${SITE_CONFIG.url}${resultCardPath(slug)}`
  const title = cardHeadline(card)
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

  return <ResultCardView card={card} slug={slug} />
}
