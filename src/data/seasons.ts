/**
 * Season config: one entry per season, pure data plus pure date helpers.
 *
 * A new season is one entry here, in a PR (spec S3). No database model, no
 * admin screen. `start` and `end` are inclusive "YYYY-MM-DD" days, read as UTC
 * days to match how event dates are stored (UTC midnight of the event day).
 * Database reads live in `src/lib/seasons/queries.ts`, not here.
 */

export interface Season {
  slug: string
  name: string
  /** First day of the season, inclusive, "YYYY-MM-DD". */
  start: string
  /** Last day of the season, inclusive, "YYYY-MM-DD". */
  end: string
  cities: string[]
  intro: string
  /** Explicit event slugs; when set, they decide membership instead of dates. */
  eventSlugs?: string[]
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

export const SEASONS: Season[] = [
  {
    slug: "kenya-ships-2026",
    name: "Kenya Ships 2026",
    start: "2026-10-16",
    end: "2026-12-05",
    cities: ["Nairobi", "Mombasa"],
    intro:
      "A season of build days, workshops and conversations across Nairobi and Mombasa, from mid October to early December.",
  },
]

/** True when `date` falls on a day from `season.start` through `season.end`. */
function withinRange(season: Season, date: Date): boolean {
  const startMs = Date.parse(`${season.start}T00:00:00Z`)
  const endExclusiveMs = Date.parse(`${season.end}T00:00:00Z`) + MS_PER_DAY
  const time = date.getTime()
  return time >= startMs && time < endExclusiveMs
}

/**
 * Whether an event on `date` belongs to `season`. When the season lists
 * `eventSlugs` and a `slug` is given, the list wins over the date range
 * (the override for a date-range match that is wrong).
 */
export function inSeason(season: Season, date: Date, slug?: string): boolean {
  if (season.eventSlugs && slug !== undefined) return season.eventSlugs.includes(slug)
  return withinRange(season, date)
}

/**
 * The season containing `today`; otherwise the season with the latest `end`,
 * so a date before every season or after the last one still resolves.
 */
export function currentSeason(today: Date = new Date()): Season {
  const live = SEASONS.find((season) => withinRange(season, today))
  if (live) return live
  return SEASONS.reduce((latest, season) => (season.end > latest.end ? season : latest))
}

/** True when `today` falls within the season, so the season is running now. */
export function isSeasonLive(season: Season, today: Date = new Date()): boolean {
  return withinRange(season, today)
}

/** The season with this slug, or undefined for an unknown slug. */
export function findSeason(slug: string): Season | undefined {
  return SEASONS.find((season) => season.slug === slug)
}
