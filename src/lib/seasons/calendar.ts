/**
 * Season calendar rows: which dates are done and which one is next.
 *
 * Pure and clock-injected so the "Completed" and "next date" logic can be
 * tested without the system date. A day is judged in Nairobi (UTC+3, no DST),
 * matching `isEventPast` in `src/lib/event-dates.ts`.
 */

import type { Event } from "@/lib/types"

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000

export interface CalendarRow {
  event: Event
  past: boolean
  /** True on the first row that is not past: the one that carries the sign-up link. */
  isNext: boolean
}

/** Today's calendar day in Nairobi as "YYYY-MM-DD". */
function eatDay(today: Date): string {
  return new Date(today.getTime() + EAT_OFFSET_MS).toISOString().slice(0, 10)
}

/** Season events (ascending) marked past or upcoming, with the next one flagged. */
export function buildCalendar(events: Event[], today: Date): CalendarRow[] {
  const todayDay = eatDay(today)
  const ordered = [...events].sort((a, b) => a.date.localeCompare(b.date))
  let nextFound = false
  return ordered.map((event) => {
    const past = event.date < todayDay
    const isNext = !past && !nextFound
    if (isNext) nextFound = true
    return { event, past, isNext }
  })
}

/** The sign-up link for an event: Luma first, then the registration URL. */
export function signupUrl(event: Event): string | undefined {
  return event.lumaUrl ?? event.registrationUrl
}
