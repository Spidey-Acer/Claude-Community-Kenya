/**
 * When an event is over — one definition, shared by every surface.
 *
 * This exists because the answer was previously computed in four places that
 * disagreed. `getUpcomingEvents()` filtered on the stored date; the two event
 * detail components and the events listing each tested `status` alone. Status
 * is set by hand in admin, so a finished event left as UPCOMING vanished from
 * the homepage (date-filtered) while its own detail page went on offering
 * "Register Now" — the list was date-true and the detail page was status-true.
 *
 * Pure and dependency-free on purpose: `lib/data.ts` imports Prisma, so a
 * predicate living there could never be called from the client components that
 * need it. Everything here works on both a Prisma `Date` and the
 * "YYYY-MM-DD" string `mapPrismaEvent` hands to the view layer.
 */

/** East Africa Time is UTC+3 year-round — no DST to account for. */
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000

/**
 * The instant of midnight-today in Nairobi, as a UTC Date.
 *
 * Events store `date` as the day (time lives in the separate `time` string),
 * so comparing against `now` would drop a same-day event the moment the clock
 * passed its stored midnight — the site would stop advertising tonight's
 * meetup on the morning of the meetup. Start-of-day keeps it listed until the
 * day is genuinely over.
 */
export function startOfTodayEAT(): Date {
  const eatNow = new Date(Date.now() + EAT_OFFSET_MS)
  return new Date(
    Date.UTC(eatNow.getUTCFullYear(), eatNow.getUTCMonth(), eatNow.getUTCDate()) -
      EAT_OFFSET_MS,
  )
}

/**
 * True once the event's day has fully passed in Nairobi.
 *
 * The string form is parsed as UTC midnight to match how `mapPrismaEvent`
 * produces it (`e.date.toISOString().split("T")[0]`), so a date-only string
 * and the Prisma `Date` it came from always give the same answer. An
 * unparseable date returns false — a malformed row should not silently
 * retire a live event.
 */
export function isEventPast(date: string | Date): boolean {
  const day = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date
  if (Number.isNaN(day.getTime())) return false
  return day < startOfTodayEAT()
}
