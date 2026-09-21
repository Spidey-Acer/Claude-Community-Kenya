import { SITE_CONFIG } from "@/lib/constants"
import { cardHeadline, cardHonours, resultCardPath, type PublicResultCard } from "@/lib/impact-lab/result-card"
import { CopyLinkButton } from "./CopyLinkButton"

// Literal hex, never a Karibu token: `--paper`/`--ink` re-define themselves
// under the visitor's theme, and this page must be the same ink field for
// everyone. The values are `CARD_POSTER` / `CARD_DARK` in result-card.ts —
// Tailwind only sees a literal class string, so they are repeated here.
const BUTTON =
  "inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg px-3 py-3 font-sans text-[13px] font-semibold motion-safe:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D97757]"
const BUTTON_PRIMARY = `${BUTTON} bg-[#D97757] text-[#141413] hover:bg-[#E58A6B]`
const BUTTON_SECONDARY = `${BUTTON} border border-[#FAF9F5]/30 text-[#FAF9F5] hover:bg-[#FAF9F5]/10`

/**
 * The page body, split from the data fetch so it can be rendered with a
 * known card (the fetch needs a published run in the database).
 *
 * One block per honour (see `cardHonours`): the card image, then its
 * download buttons. Share and Copy link sit on the first block only, since
 * they act on the page, not on one card. The second card and beyond get a
 * one-line heading naming the honour.
 */
export function ResultCardView({ card, slug }: { card: PublicResultCard; slug: string }) {
  const path = resultCardPath(slug)
  const url = `${SITE_CONFIG.url}${path}`
  const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
  const honours = cardHonours(card)
  const headline = cardHeadline(card, honours[0])

  return (
    <main className="min-h-screen bg-[#141413] px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-[780px]">
        <h1 className="sr-only">{headline}</h1>

        {honours.map((honour, index) => {
          const query = index === 0 ? "" : `?honour=${index}`
          const cardSrc = (size: "square" | "portrait" | "story") => `${path}/card/${size}${query}`
          return (
            <section key={honour.slug} className={index === 0 ? "" : "mt-14"}>
              {index > 0 && (
                <h2 className="mb-5 text-center font-sans text-base font-semibold text-[#FAF9F5]">Also: {honour.label}</h2>
              )}

              {/* The square download itself, at its own 1:1 ratio. `eslint-disable`
                  rather than next/image: the PNG is rendered per request and must
                  not pass through the image optimiser's cache. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cardSrc("square")}
                width={1080}
                height={1080}
                alt={cardHeadline(card, honour)}
                className="mx-auto block aspect-square w-full max-w-[560px] rounded-2xl shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)]"
              />

              <div className={`mt-8 grid grid-cols-1 gap-2 ${index === 0 ? "md:grid-cols-5" : "md:grid-cols-3"}`}>
                <a href={cardSrc("square")} download className={BUTTON_SECONDARY}>
                  Download square
                </a>
                <a href={cardSrc("portrait")} download className={BUTTON_SECONDARY}>
                  Download portrait
                </a>
                <a href={cardSrc("story")} download className={BUTTON_SECONDARY}>
                  Download story
                </a>
                {index === 0 && (
                  <>
                    <a href={linkedInShareUrl} target="_blank" rel="noopener noreferrer" className={BUTTON_PRIMARY}>
                      Share on LinkedIn
                    </a>
                    <CopyLinkButton url={url} className={BUTTON_SECONDARY} />
                  </>
                )}
              </div>
            </section>
          )
        })}

        <p className="mt-4 text-center font-sans text-xs leading-relaxed text-[#B8AE9C]">
          Square for LinkedIn and X, portrait for Instagram, story for WhatsApp status and Instagram stories.
        </p>

        <p className="mt-8 text-center font-sans text-xs leading-relaxed text-[#7C7365]">
          Hosted by Claude Community Kenya in Nairobi. Scores and judges&apos; notes stay private to the team.
        </p>
      </div>
    </main>
  )
}
