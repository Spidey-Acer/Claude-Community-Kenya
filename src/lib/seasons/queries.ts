/**
 * Season data: the live reads behind `/season/[slug]`.
 *
 * Everything is filtered to one season: events by date (or `eventSlugs`),
 * recaps/reports/photos by the season's event slugs, posts by a season tag.
 * Each source fails soft to an empty list so a database blip shows a thinner
 * hub rather than a 500.
 */

import { currentSeason, inSeason, type Season } from "@/data/seasons"
import { getBlogPosts, getEvents, getGalleryPhotos } from "@/lib/data"
import type { BlogPostView, PhotoView } from "@/lib/data"
import type { Event } from "@/lib/types"
import { linkedCohortForPublicEvent } from "@/lib/impact-lab/event-store"
import { listPublishedRecapCohorts } from "@/lib/impact-lab/public-recap-store"
import { listPublishedConversationsReports } from "@/lib/conversations/queries"
import type { PublishedConversationsReport } from "@/lib/conversations/queries"

/** A published Impact Lab recap tied to the season event it ran at. */
export interface SeasonRecap {
  cohort: string
  eventName: string
  publishedAt: string
  eventSlug: string
}

export interface SeasonData {
  events: Event[]
  recaps: SeasonRecap[]
  reports: PublishedConversationsReport[]
  posts: BlogPostView[]
  photos: PhotoView[]
}

/** Runs one read; on failure logs and returns the empty fallback. */
async function softRead<T>(label: string, read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read()
  } catch (error) {
    console.error(`[seasons] ${label} failed`, error)
    return fallback
  }
}

/** Events in the season, ascending by date. */
function seasonEvents(season: Season, allEvents: Event[]): Event[] {
  return allEvents
    .filter((event) => inSeason(season, new Date(`${event.date}T00:00:00Z`), event.slug))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Published recaps whose cohort is linked to a season event. */
async function seasonRecaps(events: Event[]): Promise<SeasonRecap[]> {
  const cohortToEvent = new Map<string, string>()
  for (const event of events) {
    if (!event.id) continue
    const cohort = await linkedCohortForPublicEvent(event.id, event.slug, event.title)
    if (cohort) cohortToEvent.set(cohort, event.slug)
  }
  const published = await listPublishedRecapCohorts()
  return published
    .filter((recap) => cohortToEvent.has(recap.cohort))
    .map((recap) => ({ ...recap, eventSlug: cohortToEvent.get(recap.cohort) as string }))
}

/** Photos for each season event, read per event so the query stays bounded. */
async function seasonPhotos(events: Event[]): Promise<PhotoView[]> {
  const perEvent = await Promise.all(events.map((event) => getGalleryPhotos({ eventSlug: event.slug })))
  return perEvent.flat()
}

/** Season photos, featured first; the sort is stable so source order is kept. */
function featuredFirst(photos: PhotoView[]): PhotoView[] {
  return [...photos].sort((a, b) => Number(b.featured) - Number(a.featured))
}

/** Everything the season hub renders, filtered to `season`. */
export async function getSeasonData(season: Season): Promise<SeasonData> {
  const allEvents = await softRead("events", getEvents, [] as Event[])
  const events = seasonEvents(season, allEvents)
  const slugs = new Set(events.map((event) => event.slug))

  const [recaps, reports, posts, photos] = await Promise.all([
    softRead("recaps", () => seasonRecaps(events), [] as SeasonRecap[]),
    softRead("reports", listPublishedConversationsReports, [] as PublishedConversationsReport[]),
    softRead("posts", getBlogPosts, [] as BlogPostView[]),
    softRead("photos", () => seasonPhotos(events), [] as PhotoView[]),
  ])

  return {
    events,
    recaps,
    reports: reports.filter((report) => slugs.has(report.eventSlug)),
    posts: posts.filter((post) => post.tags.includes(season.slug)),
    photos: featuredFirst(photos),
  }
}

/** Where `/season` sends a visitor: the live season, else the most recent. */
export function seasonIndexTarget(today: Date = new Date()): string {
  return `/season/${currentSeason(today).slug}`
}
