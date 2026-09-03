import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { SITE_CONFIG } from "@/lib/constants"
import { findResultCardBySlug } from "@/lib/impact-lab/result-card-store"
import { cardStyleForTitle, resultCardPath, type PublicResultCard } from "@/lib/impact-lab/result-card"

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
  const isPodium = card.title !== "Built"
  const style = cardStyleForTitle(card.title)

  // Dark premium, fixed in both themes: literal hex everywhere, never a
  // Karibu theme token. `--paper`/`--ink`/`--clay` all re-define themselves
  // under the adaptive dark theme, which would paint this panel wrong for
  // half of all visitors. The four branches below hardcode the same hex
  // codes as CARD_GOLD / CARD_GRAPHITE / CARD_BRONZE / CARD_DARK in
  // result-card.ts — Tailwind can only see a literal arbitrary-value class,
  // not one built from an imported constant, so keep the two in sync by
  // hand if the palette changes.
  const panelClass =
    style.kind === "winner"
      ? "bg-gradient-to-b from-[#8A6410] via-[#C9A227] to-[#E6C35C]"
      : style.kind === "runner-up"
        ? "bg-gradient-to-b from-[#2A2A2E] to-[#3A3A40]"
        : style.kind === "third"
          ? "bg-gradient-to-b from-[#4E2A14] to-[#8C5A2B]"
          : "bg-[#1E1B15] border-l-4 border-[#D97757]"
  const inkClass = style.kind === "winner" ? "text-[#16140F]" : "text-[#F4EEE3]"
  const mutedClass = style.kind === "winner" ? "text-[#16140F]/70" : "text-[#B8AE9C]"
  const eyebrowClass = "text-[#D97757]"
  const ruleClass = "bg-[#D97757]"
  const pillClass =
    style.kind === "winner"
      ? "border-[#D97757]/50 text-[#D97757]"
      : style.kind === "runner-up"
        ? "border-[#C0C0C8]/50 text-[#C0C0C8]"
        : ""

  return (
    <main className="min-h-screen bg-[#0B0A09] px-4 py-12 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <p className="mb-6 text-center font-sans text-[11px] uppercase tracking-[0.2em] text-[#7C7365]">
          {card.eventName}
          {card.eventDates ? <span className="text-[#7C7365]"> &middot; {card.eventDates}</span> : null}
        </p>

        <article
          className={`relative flex flex-col items-center overflow-hidden rounded-2xl border border-[#2A261E] px-7 py-10 text-center shadow-[0_24px_60px_-30px_rgba(0,0,0,0.6)] sm:px-12 sm:py-14 ${panelClass} ${inkClass}`}
          aria-label={headline(card)}
        >
          {style.kind === "winner" ? (
            <div className="absolute inset-x-0 top-0 h-[3px] bg-[#F3DFA0]" aria-hidden="true" />
          ) : null}

          <p className={`font-sans text-[11px] uppercase tracking-[0.2em] ${eyebrowClass}`}>
            {isPodium ? card.track : `Built at ${card.eventName}`}
          </p>

          {style.pill ? (
            <span
              className={`mt-3 inline-flex shrink-0 items-center rounded-full border px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] ${pillClass}`}
            >
              {style.pill.label}
            </span>
          ) : null}

          {/* The placement word: never lets "Runner-up" or "Third place" wrap
              or break at their hyphen/space onto a second line, at any width
              down to a 320px mobile floor. */}
          <h1
            className={
              isPodium
                ? "mt-4 whitespace-nowrap font-serif text-[40px] font-bold leading-[0.95] tracking-[-0.01em] sm:text-[64px]"
                : "mt-4 text-[clamp(2.2rem,7vw,3.5rem)] font-serif font-bold leading-[0.95] tracking-tight"
            }
          >
            {isPodium ? card.title : card.projectName}
          </h1>

          <div className={`my-7 h-0.5 w-12 ${ruleClass}`} aria-hidden="true" />

          {isPodium ? (
            <p className="font-serif text-2xl leading-snug sm:text-3xl">{card.projectName}</p>
          ) : null}

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
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#D97757] px-6 py-3 font-sans text-sm font-semibold text-[#16140F] transition-colors hover:bg-[#E58A6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97757] sm:w-auto"
          >
            Share on LinkedIn
          </a>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-lg border border-[#F4EEE3]/30 px-6 py-3 font-sans text-sm font-semibold text-[#F4EEE3] transition-colors hover:bg-[#16140F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97757] sm:w-auto"
          >
            Claude Community Kenya
          </Link>
        </div>

        <p className="mt-8 text-center font-sans text-xs leading-relaxed text-[#7C7365]">
          Hosted by Claude Community Kenya in Nairobi. Scores and judges&apos; notes stay private to the team.
        </p>
      </div>
    </main>
  )
}
