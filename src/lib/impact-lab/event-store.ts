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
import { DEFAULT_COHORT, isCohortActive } from "./constants"
import {
  orderMemberEvents,
  pickMemberEvent,
  validCohort,
  type EventStatusValue,
} from "./event-lifecycle"

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
  createdAt: Date
  organisation: { name: string }
}

function toRecord(row: EventRow): EventRecord {
  const { organisation, ...rest } = row
  return { ...rest, organisationName: organisation.name }
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
    // Pre-migration degrade: behave like the old single-cohort, env-driven
    // world — including whether it's LIVE. isCohortActive reads
    // IMPACT_LAB_ACTIVE_COHORT, the same env var guardClosedCohort still
    // honors pre-migration; hardcoding CLOSED here would tell a member their
    // live event had wrapped.
    const fallback = participants.find((p) => p.cohort === DEFAULT_COHORT)
    return fallback
      ? [
          {
            id: "",
            organisationId: "",
            organisationName: "Claude Community Kenya",
            cohort: DEFAULT_COHORT,
            name: DEFAULT_COHORT,
            status: isCohortActive(DEFAULT_COHORT) ? "LIVE" : "CLOSED",
            titleLead: "",
            titleAccent: "",
            dates: "",
            location: "",
            formatNote: "",
            groundRules: null,
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
