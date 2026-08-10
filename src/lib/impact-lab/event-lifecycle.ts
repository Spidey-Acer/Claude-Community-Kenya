/**
 * Pure event-lifecycle logic: which status transitions are legal, which
 * events a participant can see, and cohort slug validation.
 *
 * No database access — everything here is assertable by scripts/verify-events.ts
 * without infrastructure, the same split judging.ts has from its routes.
 */

export const EVENT_STATUSES = ["DRAFT", "LIVE", "CLOSED", "ARCHIVED"] as const
export type EventStatusValue = (typeof EVENT_STATUSES)[number]

/**
 * Whether an admin may move an event between two statuses.
 *
 * The graph is deliberately narrow: DRAFT⇄LIVE (back only while nobody has
 * registered — un-launching an event people joined would hide their data),
 * LIVE⇄CLOSED (reopening a closed event is a legitimate organiser action),
 * CLOSED⇄ARCHIVED. Archiving from anywhere else must pass through CLOSED so
 * that "archived" always means "was properly closed first".
 */
export function canTransition(
  from: EventStatusValue,
  to: EventStatusValue,
  hasParticipants: boolean
): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: false, reason: "The event is already in that state." }
  if (from === "DRAFT" && to === "LIVE") return { ok: true }
  if (from === "LIVE" && to === "DRAFT") {
    return hasParticipants
      ? { ok: false, reason: "People have already registered — close the event instead of un-launching it." }
      : { ok: true }
  }
  if (from === "LIVE" && to === "CLOSED") return { ok: true }
  if (from === "CLOSED" && to === "LIVE") return { ok: true }
  if (from === "CLOSED" && to === "ARCHIVED") return { ok: true }
  if (from === "ARCHIVED" && to === "CLOSED") return { ok: true }
  return { ok: false, reason: `An event cannot go from ${from} to ${to}.` }
}

/** The minimum shape resolution needs; event-store rows satisfy it. */
export interface MemberEventRef {
  cohort: string
  status: EventStatusValue
  createdAt: Date
}

/**
 * The events a participant may see, in display order: LIVE before CLOSED,
 * newest first within each. DRAFT (not launched) and ARCHIVED (deliberately
 * hidden) are excluded — a participant's view of an archived event is a
 * platform-admin conversation, not a dashboard surface.
 */
export function orderMemberEvents<T extends MemberEventRef>(events: T[]): T[] {
  const rank: Record<EventStatusValue, number> = { LIVE: 0, CLOSED: 1, DRAFT: 9, ARCHIVED: 9 }
  return events
    .filter((e) => e.status === "LIVE" || e.status === "CLOSED")
    .sort((a, b) =>
      rank[a.status] !== rank[b.status]
        ? rank[a.status] - rank[b.status]
        : b.createdAt.getTime() - a.createdAt.getTime()
    )
}

/**
 * The single event a member request operates on. An explicitly requested
 * cohort wins only if the caller is actually a visible member of it —
 * otherwise the newest visible event (LIVE first). Null when the caller
 * belongs to no visible event, which routes surface as their existing
 * "no team" experience.
 */
export function pickMemberEvent<T extends MemberEventRef>(
  events: T[],
  requested?: string | null
): T | null {
  const visible = orderMemberEvents(events)
  if (requested) {
    const match = visible.find((e) => e.cohort === requested)
    if (match) return match
  }
  return visible[0] ?? null
}

const COHORT_PATTERN = /^[a-z0-9][a-z0-9-]{0,59}$/i

/**
 * Validate user-supplied cohort input to a safe slug, or null.
 *
 * This is the successor to constants.ts's single-cohort input coercer, minus
 * the fallback: what "no cohort named" means now depends on who is asking (a
 * member's own events, the admin default event), so callers own the fallback
 * and this function only answers "is this string safe to put in a query and
 * a Content-Disposition header?".
 */
export function validCohort(input: string | null | undefined): string | null {
  const value = (input ?? "").trim()
  return COHORT_PATTERN.test(value) ? value : null
}
