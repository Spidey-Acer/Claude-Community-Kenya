import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit } from "@/lib/rate-limit"
import { resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { participantDraftSchema, type ParticipantDraft } from "@/lib/impact-lab/participant-schema"

// A large import must finish in one function invocation — give it headroom
// beyond the default so a ~500-row upload doesn't time out mid-write.
export const maxDuration = 60

const importSchema = z.object({
  cohort: z.string().max(60).optional(),
  // Raw rows — validated individually so one bad row doesn't fail the batch.
  participants: z.array(z.unknown()).max(500),
})

/**
 * The columns a re-import is allowed to reason about. Deliberately excludes
 * checkedInAt/checkedInBy: a re-run of the guest list must never disturb who
 * has walked through the door.
 */
const MERGE_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  institution: true,
  experienceLevel: true,
  primaryRole: true,
  secondaryRoles: true,
  technicalSkills: true,
  interests: true,
  availability: true,
  projectIdeas: true,
  preferredTeammates: true,
  blockedTeammates: true,
} as const

type MergeRow = {
  id: string
  email: string
  fullName: string
  phone: string | null
  institution: string | null
  experienceLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
  primaryRole: string
  secondaryRoles: string[]
  technicalSkills: string[]
  interests: string[]
  availability: string[]
  projectIdeas: string | null
  preferredTeammates: string[]
  blockedTeammates: string[]
}

/** The values a guest-list export supplies when the event asked no questions. */
const ROLE_PLACEHOLDER = "Participant"
const LEVEL_PLACEHOLDER = "BEGINNER"

/**
 * What a re-import may change on a participant who already exists.
 *
 * A guest-list export is thin: when the Luma event asked no registration
 * questions it yields `primaryRole: "Participant"`, `experienceLevel:
 * BEGINNER`, and empty arrays for every skill field. The previous behaviour
 * passed the whole draft to `update`, so importing a refreshed guest list
 * after builders had filled their own profiles overwrote real answers with
 * those placeholders and reset consent. Re-importing a guest list is a
 * routine thing to do on event morning, so that had to stop being destructive.
 *
 * The rule is now: an import may only FILL BLANKS. It never overwrites a
 * value a participant supplied, never empties a populated field, and never
 * touches consentToMatch or consentToShareContact — those belong to the
 * participant, not to the spreadsheet.
 */
function mergePatch(row: MergeRow, draft: ParticipantDraft): Record<string, unknown> {
  const patch: Record<string, unknown> = {}

  const fillText = (key: keyof MergeRow, incoming: string | null | undefined) => {
    const current = row[key] as string | null
    if (incoming && !(current ?? "").trim()) patch[key] = incoming
  }
  const fillList = (key: keyof MergeRow, incoming: string[]) => {
    const current = row[key] as string[]
    if (incoming.length > 0 && (!current || current.length === 0)) patch[key] = incoming
  }

  fillText("fullName", draft.fullName)
  fillText("phone", draft.phone ?? null)
  fillText("institution", draft.institution ?? null)
  fillText("projectIdeas", draft.projectIdeas ?? null)

  // Placeholders never win. A real answer only replaces the default, so a
  // participant who set ADVANCED keeps it when the guest list says BEGINNER.
  if (
    draft.experienceLevel !== LEVEL_PLACEHOLDER &&
    row.experienceLevel === LEVEL_PLACEHOLDER
  ) {
    patch.experienceLevel = draft.experienceLevel
  }
  if (
    draft.primaryRole &&
    draft.primaryRole !== ROLE_PLACEHOLDER &&
    (!row.primaryRole.trim() || row.primaryRole === ROLE_PLACEHOLDER)
  ) {
    patch.primaryRole = draft.primaryRole
  }

  fillList("secondaryRoles", draft.secondaryRoles)
  fillList("technicalSkills", draft.technicalSkills)
  fillList("interests", draft.interests)
  fillList("availability", draft.availability)
  fillList("preferredTeammates", draft.preferredTeammates)
  fillList("blockedTeammates", draft.blockedTeammates)

  return patch
}

/**
 * Bulk import participants. The client maps CSV columns to fields and splits
 * multi-value cells, then posts an array of drafts. Rows are validated
 * individually (per-row failures are reported, not fatal), deduped by email, and
 * written in a single findMany + $transaction so the whole import is one
 * round-trip pair regardless of size.
 */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "create")
  if (!check.authorized) return check.response

  // Key by user id, not IP — organisers share a venue NAT on event day.
  const limit = await rateLimit(request, {
    maxRequests: 6,
    windowInSeconds: 60,
    identifier: () => `impact-lab-import:${check.user.id}`,
  })
  if (!limit.success) {
    return NextResponse.json(
      { success: false, error: "Too many imports. Please wait a minute." },
      { status: 429, headers: limit.headers }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const parsed = importSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const cohort = await resolveAdminCohort(parsed.data.cohort)
  const errors: { row: number; error: string }[] = []

  // Validate every row; dedupe by email (last occurrence wins) so a repeated
  // email in one file can't self-collide inside the transaction.
  const draftsByEmail = new Map<string, z.infer<typeof participantDraftSchema>>()
  parsed.data.participants.forEach((raw, i) => {
    const validation = participantDraftSchema.safeParse(raw)
    if (!validation.success) {
      errors.push({ row: i + 1, error: validation.error.issues[0]?.message ?? "Invalid row" })
      return
    }
    draftsByEmail.set(validation.data.email, validation.data)
  })

  const drafts = [...draftsByEmail.values()]
  const existing = await prisma.impactLabParticipant.findMany({
    where: { cohort, email: { in: drafts.map((d) => d.email) } },
    select: MERGE_SELECT,
  })
  const rowByEmail = new Map(existing.map((e) => [e.email, e]))

  let created = 0
  let updated = 0
  let unchanged = 0
  // Prisma's default 5s transaction timeout is too tight for a full-cohort
  // import through PgBouncer (120 rows took ~5.2s in prod — P2028 rollback).
  // maxDuration above is 60s; give the transaction most of that budget. The
  // batch (array) form can't take a timeout, so this is an interactive tx.
  await prisma.$transaction(
    async (tx) => {
      for (const draft of drafts) {
        const row = rowByEmail.get(draft.email)
        if (row) {
          const patch = mergePatch(row, draft)
          if (Object.keys(patch).length === 0) {
            unchanged++
            continue
          }
          await tx.impactLabParticipant.update({ where: { id: row.id }, data: patch })
          updated++
        } else {
          await tx.impactLabParticipant.create({ data: { ...draft, cohort } })
          created++
        }
      }
    },
    { timeout: 55_000, maxWait: 10_000 }
  )

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "CREATE",
    entity: "ImpactLabParticipant",
    entityId: cohort,
    changes: { imported: created, updated, unchanged, failed: errors.length },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({
    success: true,
    data: { created, updated, unchanged, failed: errors.length, errors },
  })
}
