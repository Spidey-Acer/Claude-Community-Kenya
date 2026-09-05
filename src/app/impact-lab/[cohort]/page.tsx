import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema"
import { Reveal } from "@/components/karibu/motion/Reveal"
import { SITE_CONFIG } from "@/lib/constants"
import { findPublicRecap } from "@/lib/impact-lab/public-recap-store"
import type { PublicRecap } from "@/lib/impact-lab/public-recap"

/**
 * The public recap of one Impact Lab cohort — the page the winners reel
 * points at ("The story of the tracks is on the site"). Server-rendered from
 * the run's published snapshot; nothing here is hardcoded copy for any one
 * cohort. See `findPublicRecap` for exactly what may reach this page and
 * `src/lib/impact-lab/public-recap.ts` for why.
 *
 * Never cached: an organiser's post-publish correction to a snapshot must
 * show on the next load, the same reasoning as the private result card.
 */
export const dynamic = "force-dynamic"

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10"

type Params = { params: Promise<{ cohort: string }> }

function recapPath(cohort: string): string {
  return `/impact-lab/${cohort}`
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { cohort } = await params
  const recap = await findPublicRecap(cohort)
  if (!recap) {
    return { title: "Impact Lab recap not found", robots: { index: false, follow: false } }
  }

  const url = `${SITE_CONFIG.url}${recapPath(recap.cohort)}`
  const title = `${recap.event.name} — Impact Lab`
  const description = `${recap.numbers.teamsFormed} teams, ${recap.numbers.projectsSubmitted} projects, ${recap.numbers.tracksCount} tracks — the results of ${recap.event.name}, hosted by Claude Community Kenya.`

  return {
    title,
    description,
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

/** "70+" for a recorded door count, "42 checked in on site" for the site's own — never the reverse. */
function checkedInLabel(numbers: PublicRecap["numbers"]): { value: string; label: string } {
  return numbers.checkedInIsRecorded
    ? { value: `${numbers.checkedIn}+`, label: "Checked in" }
    : { value: String(numbers.checkedIn), label: "Checked in on site" }
}

function NumberTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-paper-card p-6 text-center">
      <p className="font-newsreader text-[34px] leading-none text-ink">{value}</p>
      <p className="mt-2 font-inter text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
        {label}
      </p>
    </div>
  )
}

export default async function ImpactLabRecapPage({ params }: Params) {
  const { cohort } = await params
  const recap = await findPublicRecap(cohort)
  if (!recap) notFound()

  const checkedIn = checkedInLabel(recap.numbers)
  const winnerByTrack = new Map(recap.trackWinners.map((w) => [w.track, w]))

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Impact Lab", url: "/impact-lab" },
          { name: recap.event.name },
        ]}
      />

      {/* Header */}
      <section className="mx-auto max-w-[900px] px-6 pb-10 pt-16 text-center md:px-10">
        <Reveal>
          <div className="mb-5 font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay">
            Impact Lab
          </div>
          <h1 className="mb-4 font-newsreader text-[32px] font-normal leading-[1.1] tracking-[-0.02em] text-ink sm:text-[42px] lg:text-[48px]">
            {recap.event.name}
          </h1>
          <p className="font-inter text-[15px] font-semibold text-ink-soft">
            {recap.event.dates}
            {recap.event.venue && recap.event.city
              ? ` · ${recap.event.venue}, ${recap.event.city}`
              : recap.event.city
                ? ` · ${recap.event.city}`
                : ""}
          </p>
        </Reveal>
      </section>

      {/* The numbers */}
      <section className={`${WRAP} pb-14`} aria-label="The numbers">
        <Reveal>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <NumberTile value={checkedIn.value} label={checkedIn.label} />
            <NumberTile value={String(recap.numbers.teamsFormed)} label="Teams formed" />
            <NumberTile value={String(recap.numbers.projectsSubmitted)} label="Projects submitted" />
            <NumberTile value={String(recap.numbers.judges)} label="Judges" />
            <NumberTile value={String(recap.numbers.tracksCount)} label="Tracks" />
          </div>
        </Reveal>
      </section>

      {/* The tracks */}
      {recap.tracks.length > 0 && (
        <section className={`${WRAP} pb-14`} aria-label="The tracks">
          <h2 className="mb-6 font-inter text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
            The tracks
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {recap.tracks.map((track) => {
              const winner = winnerByTrack.get(track.label)
              const problemText = track.problem || track.description
              return (
                <div key={track.key} className="rounded-2xl border border-sand bg-paper-card p-6">
                  <p className="font-newsreader text-[20px] leading-tight text-ink">
                    {track.label}
                    {track.englishName ? (
                      <span className="block font-inter text-[13px] font-normal text-ink-muted">
                        {track.englishName}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-3 font-inter text-[14px] leading-[1.6] text-ink-soft">
                    {problemText || "Problem statement not published for this track."}
                  </p>
                  {winner && (
                    <p className="mt-4 border-t border-sand pt-3 font-inter text-[13px] font-semibold text-clay">
                      Winner: {winner.projectName}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* The results */}
      {(recap.champion || recap.trackWinners.length > 0) && (
        <section className={`${WRAP} pb-14`} aria-label="The results">
          <h2 className="mb-6 font-inter text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
            The results
          </h2>
          {recap.champion && (
            <div className="mb-6 rounded-2xl border border-clay/40 bg-paper-card p-6 text-center">
              <p className="font-inter text-[12px] font-semibold uppercase tracking-[0.14em] text-clay">
                Overall champion
              </p>
              <p className="mt-2 font-newsreader text-[26px] text-ink">{recap.champion.projectName}</p>
            </div>
          )}
          {recap.trackWinners.length > 0 && (
            <div className="grid gap-3 md:grid-cols-3">
              {recap.trackWinners.map((winner) => (
                <div key={winner.track} className="rounded-2xl border border-sand bg-paper-card p-5">
                  <p className="font-inter text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                    {winner.track}
                  </p>
                  <p className="mt-2 font-newsreader text-[19px] leading-tight text-ink">
                    {winner.projectName}
                  </p>
                  <p className="mt-2 font-inter text-[12px] text-ink-faint">{winner.basisLabel}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Closing */}
      <section className={`${WRAP} pb-20`}>
        <div className="rounded-2xl border border-sand bg-paper-alt p-8 text-center">
          <p className="mx-auto max-w-[560px] font-inter text-[15px] leading-[1.6] text-ink-soft">
            Built by the Claude Community Kenya community, in one room, in one day.
          </p>
          {recap.event.eventHref && (
            <Link
              href={recap.event.eventHref}
              className="mt-4 inline-block font-inter text-[13.5px] font-semibold text-clay hover:text-clay-dark"
            >
              Back to the event →
            </Link>
          )}
        </div>
      </section>
    </>
  )
}
