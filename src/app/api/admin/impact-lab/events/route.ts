import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { rateLimit } from "@/lib/rate-limit"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { canTransition, validCohort, EVENT_STATUSES } from "@/lib/impact-lab/event-lifecycle"
import {
  eventHasParticipants,
  getEventByCohort,
  listEvents,
  type EventRecord,
} from "@/lib/impact-lab/event-store"
import { checkEventAccess } from "@/lib/impact-lab/event-access"

/**
 * Event CRUD for the admin dashboard. Creating an event needs the platform
 * impact-lab `create` permission (org members creating their own events is
 * sub-project 6); editing and status changes go through checkEventAccess so
 * an organisation's members can manage their own event via the API today.
 *
 * Writes follow the house shape set by the rubric route
 * (src/app/api/admin/impact-lab/rubric/route.ts): CSRF check, rate limit
 * keyed to the acting user, then an audit-log entry — event creation and
 * status transitions are exactly the action class the audit log exists for.
 */

function serialize(event: EventRecord) {
  return { ...event, createdAt: event.createdAt.toISOString() }
}

/**
 * This route can ship before `impact_lab_events` exists — GET already
 * degrades (listEvents/organisations both catch missing-table), but a write
 * cannot degrade, so it says what is missing instead of throwing a bare 500
 * at an organiser who would have no way to interpret it. Same idiom as the
 * rubric route's tableMissingResponse. Prisma reports a missing table as
 * P2021.
 */
function tableMissingResponse(error: unknown): NextResponse | null {
  const code = (error as { code?: unknown })?.code
  if (code !== "P2021") return null
  console.error("[impact-lab/events] impact_lab_events does not exist", error)
  return NextResponse.json(
    {
      success: false,
      error:
        "The events table has not been created in this database yet. Apply migration 20260808200000_event_platform_tenancy, then try again.",
      code: "EVENTS_TABLE_MISSING",
    },
    { status: 503 }
  )
}

const createSchema = z.strictObject({
  organisationId: z.string().min(1),
  cohort: z.string(),
  name: z.string().trim().min(1).max(200),
  titleLead: z.string().trim().min(1).max(100),
  titleAccent: z.string().trim().min(1).max(100),
  dates: z.string().trim().min(1).max(100),
  location: z.string().trim().min(1).max(200),
  formatNote: z.string().trim().min(1).max(2000),
  groundRules: z.string().trim().max(20_000).optional(),
})

const patchSchema = z.strictObject({
  cohort: z.string(),
  status: z.enum(EVENT_STATUSES).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  titleLead: z.string().trim().min(1).max(100).optional(),
  titleAccent: z.string().trim().min(1).max(100).optional(),
  dates: z.string().trim().min(1).max(100).optional(),
  location: z.string().trim().min(1).max(200).optional(),
  formatNote: z.string().trim().min(1).max(2000).optional(),
  groundRules: z.string().trim().max(20_000).optional(),
})

/** GET — every event plus the organisations available to assign one to. */
export async function GET() {
  const check = await checkApiPermission("impact-lab", "view")
  if (!check.authorized) return check.response

  const [events, organisations] = await Promise.all([
    listEvents(),
    prisma.organisation
      .findMany({ select: { id: true, slug: true, name: true }, orderBy: { name: "asc" } })
      .catch(() => []),
  ])
  return NextResponse.json({
    success: true,
    data: { events: events.map(serialize), organisations },
  })
}

/** POST — create a DRAFT event under an organisation. */
export async function POST(request: NextRequest) {
  try {
    return await handlePost(request)
  } catch (error) {
    const missing = tableMissingResponse(error)
    if (missing) return missing
    throw error
  }
}

async function handlePost(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "create")
  if (!check.authorized) return check.response

  const rl = await rateLimit(request, {
    maxRequests: 40,
    windowInSeconds: 300,
    identifier: () => `impact-lab-events:${check.user.id}`,
  })
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a moment." },
      { status: 429, headers: rl.headers }
    )
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid event" },
      { status: 400 }
    )
  }
  const cohort = validCohort(parsed.data.cohort)
  if (!cohort) {
    return NextResponse.json(
      { success: false, error: "Cohort slug must be lowercase letters, digits and hyphens." },
      { status: 400 }
    )
  }
  if (await getEventByCohort(cohort)) {
    return NextResponse.json(
      { success: false, error: `An event already owns the slug "${cohort}".` },
      { status: 409 }
    )
  }

  const { organisationId, name, titleLead, titleAccent, dates, location, formatNote, groundRules } =
    parsed.data

  try {
    await prisma.impactLabEvent.create({
      data: {
        organisationId,
        cohort,
        status: "DRAFT",
        name,
        titleLead,
        titleAccent,
        dates,
        location,
        formatNote,
        groundRules: groundRules ?? null,
      },
    })
  } catch (error) {
    const code = (error as { code?: string })?.code
    // A second organiser can race the getEventByCohort check above with the
    // same slug — the unique constraint is the real guard, this just turns
    // it into the same 409 rather than an unhandled 500.
    if (code === "P2002") {
      return NextResponse.json(
        { success: false, error: `An event already owns the slug "${cohort}".` },
        { status: 409 }
      )
    }
    if (code === "P2003") {
      return NextResponse.json({ success: false, error: "Unknown organisation." }, { status: 400 })
    }
    throw error
  }

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "CREATE",
    entity: "ImpactLabEvent",
    entityId: cohort,
    changes: { cohort, organisationId, name, status: "DRAFT" },
    ...getRequestMetadata(request),
  })

  const event = await getEventByCohort(cohort)
  return NextResponse.json({ success: true, data: { event: event ? serialize(event) : null } })
}

/** PATCH — edit branding and/or move an event through its lifecycle. */
export async function PATCH(request: NextRequest) {
  try {
    return await handlePatch(request)
  } catch (error) {
    const missing = tableMissingResponse(error)
    if (missing) return missing
    throw error
  }
}

async function handlePatch(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid update" },
      { status: 400 }
    )
  }
  const cohort = validCohort(parsed.data.cohort)
  if (!cohort) {
    return NextResponse.json({ success: false, error: "Unknown event." }, { status: 400 })
  }

  const access = await checkEventAccess(cohort, "edit")
  if (!access.authorized) return access.response
  if (!access.event) {
    return NextResponse.json({ success: false, error: "Unknown event." }, { status: 404 })
  }

  const rl = await rateLimit(request, {
    maxRequests: 40,
    windowInSeconds: 300,
    identifier: () => `impact-lab-events:${access.user.id}`,
  })
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Wait a moment." },
      { status: 429, headers: rl.headers }
    )
  }

  const { status, name, titleLead, titleAccent, dates, location, formatNote, groundRules } =
    parsed.data

  if (status && status !== access.event.status) {
    const verdict = canTransition(access.event.status, status, await eventHasParticipants(cohort))
    if (!verdict.ok) {
      return NextResponse.json({ success: false, error: verdict.reason }, { status: 400 })
    }
  }

  // Passing `undefined` for an untouched field is deliberate, not an
  // omission — Prisma drops undefined properties from the update, so this
  // reads as "only the fields the caller sent" without a manual filter.
  await prisma.impactLabEvent.update({
    where: { cohort },
    data: {
      status,
      name,
      titleLead,
      titleAccent,
      dates,
      location,
      formatNote,
      groundRules,
    },
  })

  await logAudit({
    userId: access.user.id,
    userEmail: access.user.email,
    action: "UPDATE",
    entity: "ImpactLabEvent",
    entityId: cohort,
    changes: {
      cohort,
      ...(status && status !== access.event.status
        ? { statusFrom: access.event.status, statusTo: status }
        : {}),
      updatedFields: Object.entries({
        name,
        titleLead,
        titleAccent,
        dates,
        location,
        formatNote,
        groundRules,
      })
        .filter(([, v]) => v !== undefined)
        .map(([k]) => k),
    },
    ...getRequestMetadata(request),
  })

  const event = await getEventByCohort(cohort)
  return NextResponse.json({ success: true, data: { event: event ? serialize(event) : null } })
}
