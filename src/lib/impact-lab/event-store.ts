/**
 * Database access for the tenancy tables, with the same degrade posture as
 * rubric-store.ts: an environment whose migration has not run yet (P2021,
 * missing table) behaves like the pre-tenancy system instead of erroring.
 *
 * Every function here is a thin query; the decisions (ordering, picking,
 * transition legality) live in event-lifecycle.ts where they are pure and
 * verified without a database.
 */

import { prisma } from "@/lib/prisma"
import { DEFAULT_COHORT } from "./constants"
import {
  orderMemberEvents,
  pickMemberEvent,
  validCohort,
  type EventStatusValue,
} from "./event-lifecycle"
import { parseTracks, type Track } from "./tracks"

export interface EventRecord {
  id: string
  organisationId: string
  organisationName: string
  cohort: string
  name: string
  status: EventStatusValue
  titleLead: string
  titleAccent: string
  dates: string
  location: string
  formatNote: string
  groundRules: string | null
  /** [] when the event has no tracks — matching then runs unpartitioned. */
  tracks: Track[]
  /** Event whose Conversations report this cohort's members should see, if any. */
  conversationsEventId: string | null
  createdAt: Date
}

export interface MemberEvent extends EventRecord {
  participantId: string
}

/** True for Prisma's "table does not exist" — the migration hasn't run here. */
function isMissingTable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2021"
  )
}

const EVENT_SELECT = {
  id: true,
  organisationId: true,
  cohort: true,
  name: true,
  status: true,
  titleLead: true,
  titleAccent: true,
  dates: true,
  location: true,
  formatNote: true,
  groundRules: true,
  tracks: true,
  conversationsEventId: true,
  createdAt: true,
  organisation: { select: { name: true } },
} as const

type EventRow = {
  id: string
  organisationId: string
  cohort: string
  name: string
  status: EventStatusValue
  titleLead: string
  titleAccent: string
  dates: string
  location: string
  formatNote: string
  groundRules: string | null
  tracks: unknown
  conversationsEventId: string | null
  createdAt: Date
  organisation: { name: string }
}

function toRecord(row: EventRow): EventRecord {
  const { organisation, tracks, ...rest } = row
  return { ...rest, organisationName: organisation.name, tracks: parseTracks(tracks) }
}

/** The event owning a cohort slug, or null (unknown cohort OR pre-migration). */
export async function getEventByCohort(cohort: string): Promise<EventRecord | null> {
  try {
    const row = await prisma.impactLabEvent.findUnique({ where: { cohort }, select: EVENT_SELECT })
    return row ? toRecord(row as EventRow) : null
  } catch (error) {
    if (isMissingTable(error)) return null
    throw error
  }
}

/**
 * The Impact Lab cohort behind a row in the public `Event` table, or null.
 *
 * There is no foreign key from a public event to a cohort, so this tries the
 * two links that do exist, in order of how explicit they are:
 *
 *   1. `ImpactLabEvent.conversationsEventId` pointing back at this event row.
 *      Explicit, set by an organiser in admin, and the stronger signal — but
 *      that column was added to attach a Conversations write-up to a cohort's
 *      dashboard, so at an event with a separate morning session it may well
 *      point at a different row than the hackathon's own.
 *   2. The event's slug read as a cohort slug. Both are hand-authored
 *      lowercase slugs in the same namespace (`impact-lab-02`), so a match is
 *      the same event by any reasonable reading, and a collision between two
 *      unrelated things would need somebody to name them identically.
 *   3. The one Impact Lab event that is LIVE, if there is exactly one. Real
 *      slugs diverge — a public page at
 *      `nairobi-claude-impact-lab-ai-mashinani-02-…` runs the cohort
 *      `impact-lab-2026-09` — and the explicit link may point at a separate
 *      morning session, so both links above can miss on the night itself.
 *      Requiring exactly one LIVE event is what keeps this from guessing: with
 *      two hackathons running there is no single right answer, and it declines
 *      rather than attach the wrong panel to a page.
 *
 * The caller only asks for public events of type hackathon, which is why
 * fallback 3 does not re-check the type it cannot see from here.
 *
 * Returns null when none resolves, and pre-migration where the table does not
 * exist. Callers use it to decide whether a public page has a cohort worth
 * asking about at all.
 */
export async function cohortForPublicEvent(
  eventId: string,
  eventSlug: string
): Promise<string | null> {
  try {
    const linked = await prisma.impactLabEvent.findFirst({
      where: { conversationsEventId: eventId },
      select: { cohort: true },
    })
    if (linked) return linked.cohort

    const bySlug = await prisma.impactLabEvent.findUnique({
      where: { cohort: eventSlug },
      select: { cohort: true },
    })
    if (bySlug) return bySlug.cohort

    return await singleLiveCohort()
  } catch (error) {
    if (isMissingTable(error)) return null
    throw error
  }
}

/**
 * The one Impact Lab event that is LIVE, or null when there are zero or more
 * than one — guessing between two live events would be wrong, so this
 * declines instead. Shared by `cohortForPublicEvent`'s fallback 3 and by
 * judge sign-in, which needs the same "which run applies right now" answer
 * for a request that did not name a cohort at all.
 */
export async function singleLiveCohort(): Promise<string | null> {
  try {
    // `take: 2` is the whole question — one row means "the event running right
    // now", two mean "ambiguous", and nothing beyond that changes the answer.
    const live = await prisma.impactLabEvent.findMany({
      where: { status: "LIVE" },
      select: { cohort: true },
      take: 2,
    })
    return live.length === 1 ? live[0].cohort : null
  } catch (error) {
    if (isMissingTable(error)) return null
    throw error
  }
}

/** Every event, newest first; [] pre-migration. */
export async function listEvents(): Promise<EventRecord[]> {
  try {
    const rows = await prisma.impactLabEvent.findMany({
      select: EVENT_SELECT,
      orderBy: { createdAt: "desc" },
    })
    return (rows as EventRow[]).map(toRecord)
  } catch (error) {
    if (isMissingTable(error)) return []
    throw error
  }
}

/**
 * The cohort admin surfaces default to when none is named: the newest
 * non-archived event, preferring LIVE — so during an event every admin
 * screen opens on the running event, and afterwards on the latest record.
 * Falls back to DEFAULT_COHORT pre-migration or on an empty table.
 */
export async function defaultAdminCohort(): Promise<string> {
  const events = await listEvents()
  const candidates = events.filter((e) => e.status !== "ARCHIVED")
  const live = candidates.find((e) => e.status === "LIVE")
  return live?.cohort ?? candidates[0]?.cohort ?? DEFAULT_COHORT
}

/**
 * The cohort an admin request operates on: the validated `?cohort=` input,
 * or the admin default. This is the successor to constants.ts's old
 * single-cohort resolver — same injection-safety contract, database-backed
 * fallback.
 */
export async function resolveAdminCohort(
  input: string | null | undefined
): Promise<string> {
  return validCohort(input) ?? defaultAdminCohort()
}

/**
 * Every visible event this email holds a participant row in, LIVE first
 * then newest. Pre-migration, degrades to "member of DEFAULT_COHORT if a
 * participant row exists there" so existing behaviour survives an
 * un-migrated environment.
 */
export async function resolveMemberEvents(email: string): Promise<MemberEvent[]> {
  const participants = await prisma.impactLabParticipant.findMany({
    where: { email },
    select: { id: true, cohort: true },
  })
  if (participants.length === 0) return []

  const events = await listEvents()
  if (events.length === 0) {
    // Pre-migration degrade: pre-migration environments are read-only by
    // design once the env vars are gone — the deploy checklist applies the
    // migration and seed before this code reaches production, and guard +
    // UI now agree (both closed).
    const fallback = participants.find((p) => p.cohort === DEFAULT_COHORT)
    return fallback
      ? [
          {
            id: "",
            organisationId: "",
            organisationName: "Claude Community Kenya",
            cohort: DEFAULT_COHORT,
            name: DEFAULT_COHORT,
            status: "CLOSED",
            titleLead: "",
            titleAccent: "",
            dates: "",
            location: "",
            formatNote: "",
            groundRules: null,
            tracks: [],
            conversationsEventId: null,
            createdAt: new Date(0),
            participantId: fallback.id,
          },
        ]
      : []
  }

  const byCohort = new Map(events.map((e) => [e.cohort, e]))
  const memberEvents: MemberEvent[] = []
  for (const participant of participants) {
    const event = byCohort.get(participant.cohort)
    if (event) memberEvents.push({ ...event, participantId: participant.id })
  }
  return orderMemberEvents(memberEvents)
}

/** The single event a member request operates on — see pickMemberEvent. */
export async function resolveMemberEvent(
  email: string,
  requested?: string | null
): Promise<MemberEvent | null> {
  return pickMemberEvent(await resolveMemberEvents(email), requested)
}

/** Whether anyone has ever been registered into this cohort. */
export async function eventHasParticipants(cohort: string): Promise<boolean> {
  const count = await prisma.impactLabParticipant.count({ where: { cohort } })
  return count > 0
}

/**
 * The event a not-yet-registered visitor may self-register into: the newest
 * LIVE event, or null when nothing is currently open. Distinct from
 * `resolveMemberEvent`, which requires an existing participant row — this is
 * the "is there anything to sign up for right now" check the registration
 * invitation gates on. `listEvents` is already newest-first, so the first
 * LIVE event found is the one wanted; [] pre-migration degrades to null, the
 * same "no event live → read-only, no invitation" behaviour the env-var
 * system had.
 */
export async function openRegistrationEvent(): Promise<EventRecord | null> {
  const events = await listEvents()
  return events.find((e) => e.status === "LIVE") ?? null
}
