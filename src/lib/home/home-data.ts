/**
 * Home page data: the live reads behind the seven Home sections.
 *
 * Every read fails soft. A query that throws is logged and replaced by its
 * empty value, so the page renders the section's empty-state line instead of
 * returning a 500. The pure helpers are split out so they can be tested
 * without a database.
 */

import { currentSeason, isSeasonLive, type Season } from "@/data/seasons"
import { getNextEvent } from "@/lib/data"
import { getSeasonData, type SeasonRecap } from "@/lib/seasons/queries"
import { listFeaturedSubmissions, type ShowcasePostView } from "@/lib/showcase/queries"
import { listPublishedConversationsReports } from "@/lib/conversations/queries"
import type { PublishedConversationsReport } from "@/lib/conversations/queries"
import { listPublishedRecapCohorts } from "@/lib/impact-lab/public-recap-store"
import { faqs, type FAQ } from "@/data/faq"
import type { Event } from "@/lib/types"

export const HOME_SEASON_DATES = 3
export const HOME_FEATURED_COUNT = 3
export const HOME_FAQ_COUNT = 3

/** The newest published report, whichever kind it is. */
export interface LatestReport {
  title: string
  href: string
  /** True for a PDF or other off-site link, which needs a plain anchor. */
  external: boolean
  /** ISO date used for ordering and display. */
  date: string
}

export interface HomeData {
  nextEvent: Event | null
  season: Season
  /** False once the season has ended; Home then says "Last season". */
  seasonLive: boolean
  seasonDates: Event[]
  featured: ShowcasePostView[]
  latestReport: LatestReport | null
  faqItems: FAQ[]
}

type RecapSummary = Pick<SeasonRecap, "cohort" | "eventName" | "publishedAt">

/** The next `limit` events dated `today` (YYYY-MM-DD) or later, soonest first. */
export function nextSeasonDates(events: Event[], today: string, limit: number): Event[] {
  return events
    .filter((event) => event.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit)
}

/** The most recent of the published Impact Lab recaps and Conversations reports. */
export function pickLatestReport(
  recaps: RecapSummary[],
  reports: PublishedConversationsReport[],
): LatestReport | null {
  const candidates: LatestReport[] = [
    ...recaps.map((recap) => ({
      title: recap.eventName,
      href: `/impact-lab/${recap.cohort}`,
      external: false,
      date: recap.publishedAt,
    })),
    ...reports.map((report) => ({
      title: report.eventTitle,
      href: report.reportUrl,
      external: true,
      date: report.eventDate,
    })),
  ].filter((candidate) => !Number.isNaN(Date.parse(candidate.date)))
  if (candidates.length === 0) return null
  return candidates.reduce((newest, candidate) =>
    Date.parse(candidate.date) > Date.parse(newest.date) ? candidate : newest,
  )
}

/** Today in Nairobi as YYYY-MM-DD, the same shape `Event.date` uses. */
export function todayInNairobi(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" })
}

/** Runs one read; on failure logs and returns the empty fallback. */
async function softRead<T>(label: string, read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read()
  } catch (error) {
    console.error(`[home] ${label} failed`, error)
    return fallback
  }
}

/** Everything the Home page renders. Never throws. */
export async function loadHomeData(): Promise<HomeData> {
  const season = currentSeason()
  const [nextEvent, seasonEvents, featured, recaps, reports] = await Promise.all([
    softRead("next event", getNextEvent, null as Event | null),
    softRead("season", async () => (await getSeasonData(season)).events, [] as Event[]),
    softRead("featured", () => listFeaturedSubmissions(HOME_FEATURED_COUNT), [] as ShowcasePostView[]),
    softRead("recaps", listPublishedRecapCohorts, [] as RecapSummary[]),
    softRead("reports", listPublishedConversationsReports, [] as PublishedConversationsReport[]),
  ])

  return {
    nextEvent,
    season,
    seasonLive: isSeasonLive(season),
    seasonDates: nextSeasonDates(seasonEvents, todayInNairobi(), HOME_SEASON_DATES),
    featured,
    latestReport: pickLatestReport(recaps, reports),
    faqItems: faqs.slice(0, HOME_FAQ_COUNT),
  }
}
