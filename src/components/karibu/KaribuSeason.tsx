/**
 * KaribuSeason — the season hub body: masthead, calendar, outputs, photo
 * strip and join CTA. Server component, no state. Shows no member, attendee
 * or city counts, and only photos that exist as MeetupPhoto rows.
 */

import Link from "next/link"
import type { Season } from "@/data/seasons"
import { buildCalendar, signupUrl } from "@/lib/seasons/calendar"
import type { SeasonData } from "@/lib/seasons/queries"
import { formatDate } from "@/lib/utils"
import { PhotoGrid } from "./PhotoGrid"

const WRAP = "mx-auto max-w-[860px] px-6 md:px-10"
const PHOTO_STRIP_MAX = 12
const LINK_CLASS = "font-inter text-sm font-semibold text-clay hover:underline"
const HEADING_CLASS = "mb-4 font-inter text-xs font-bold uppercase tracking-[0.14em] text-ink-faint"

interface KaribuSeasonProps {
  season: Season
  data: SeasonData
  /** Injected clock; defaults to now. */
  today?: Date
}

export function KaribuSeason({ season, data, today = new Date() }: KaribuSeasonProps) {
  const rows = buildCalendar(data.events, today)
  const recapByEvent = new Map(data.recaps.map((recap) => [recap.eventSlug, recap]))
  const photoEvents = new Set(data.photos.map((photo) => photo.event?.slug))
  const stripPhotos = data.photos.slice(0, PHOTO_STRIP_MAX).map((photo) => ({
    src: photo.thumbnailUrl ?? photo.url,
    alt: photo.alt ?? photo.caption ?? "Claude Community Kenya event photo",
  }))
  const hasOutputs = data.recaps.length + data.reports.length + data.posts.length > 0

  return (
    <>
      <section className={`${WRAP} pb-8 pt-16`}>
        <div className="mb-3 font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay">
          {season.cities.join(" and ")}
        </div>
        <h1 className="font-newsreader text-[32px] font-normal leading-[1.1] tracking-[-0.02em] text-ink sm:text-[46px]">
          {season.name}
        </h1>
        <p className="mt-4 max-w-[620px] font-inter text-[16px] leading-[1.6] text-ink-soft">{season.intro}</p>
      </section>

      <section className={`${WRAP} pb-10`}>
        <h2 className={HEADING_CLASS}>Calendar</h2>
        {rows.length === 0 ? (
          <p className="font-inter text-[15px] text-ink-soft">Dates will be announced here.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map(({ event, past, isNext }) => {
              const recap = recapByEvent.get(event.slug)
              const signup = signupUrl(event)
              return (
                <li
                  key={event.slug}
                  className={`rounded-xl border bg-paper-card p-5 ${isNext ? "border-clay" : "border-sand"}`}
                >
                  <div className="font-inter text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
                    {formatDate(event.date)} · {event.city}
                  </div>
                  <Link
                    href={`/events/${event.slug}`}
                    className="font-newsreader text-[20px] text-ink hover:text-clay"
                  >
                    {event.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    {past && <span className="font-inter text-sm font-semibold text-ink-soft">Completed</span>}
                    {past && recap && (
                      <Link href={`/impact-lab/${recap.cohort}`} className={LINK_CLASS}>
                        Recap
                      </Link>
                    )}
                    {past && photoEvents.has(event.slug) && (
                      <Link href={`/events/${event.slug}`} className={LINK_CLASS}>
                        Photos
                      </Link>
                    )}
                    {isNext && <span className="font-inter text-sm font-semibold text-clay">Next up</span>}
                    {isNext && signup && (
                      <a href={signup} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                        Register
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {hasOutputs && (
        <section className={`${WRAP} pb-10`}>
          <h2 className={HEADING_CLASS}>What we published</h2>
          <ul className="flex flex-col gap-2">
            {data.recaps.map((recap) => (
              <li key={`recap-${recap.cohort}`}>
                <Link href={`/impact-lab/${recap.cohort}`} className={LINK_CLASS}>
                  {recap.eventName} recap
                </Link>
              </li>
            ))}
            {data.reports.map((report) => (
              <li key={`report-${report.eventSlug}`}>
                <a href={report.reportUrl} className={LINK_CLASS}>
                  {report.eventTitle} report
                </a>
              </li>
            ))}
            {data.posts.map((post) => (
              <li key={`post-${post.slug}`}>
                <Link href={`/blog/${post.slug}`} className={LINK_CLASS}>
                  {post.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stripPhotos.length > 0 && (
        <section className={`${WRAP} pb-10`}>
          <h2 className={HEADING_CLASS}>From the season</h2>
          <PhotoGrid photos={stripPhotos} columns={4} />
        </section>
      )}

      <section className={`${WRAP} pb-16`}>
        <div className="rounded-2xl bg-band-bg px-8 py-10 text-on-band">
          <h2 className="mb-4 font-newsreader text-[28px] leading-[1.1] text-on-band">
            Karibu. Come build with us.
          </h2>
          <Link
            href="/join"
            className="inline-flex rounded-full bg-paper-card px-6 py-3 font-inter text-[15px] font-semibold text-ink"
          >
            Join the community
          </Link>
        </div>
      </section>
    </>
  )
}
