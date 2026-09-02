import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { runMatchingByTrack } from "@/lib/matching"
import { getEventByCohort, resolveAdminCohort } from "@/lib/impact-lab/event-store"
import { toMatchParticipant } from "@/lib/impact-lab/mappers"
import { resolveSettings } from "@/lib/impact-lab/settings"
import { resultSignature } from "@/lib/impact-lab/signature"

/**
 * Generate a match for a cohort. Pure computation — nothing is persisted here;
 * saving happens via /runs. Returns the result plus a slim participant directory
 * so the UI can render member names without a second fetch.
 */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  // Generating teams is an organiser action, not a read — a view-only moderator
  // must not be able to run it (explain additionally spends on the AI call).
  const check = await checkApiPermission("impact-lab", "create")
  if (!check.authorized) return check.response

  const limit = await rateLimit(request, RateLimits.ADMIN)
  if (!limit.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please slow down." },
      { status: 429, headers: limit.headers }
    )
  }

  let body: { cohort?: string; settings?: unknown } = {}
  try {
    body = (await request.json()) ?? {}
  } catch {
    // Empty body is fine — run with defaults.
  }

  const cohort = await resolveAdminCohort(body.cohort)

  let settings
  try {
    settings = resolveSettings(body.settings)
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid settings" },
      { status: 400 }
    )
  }

  // The event owns its tracks — the caller's settings never carry them, so
  // they're filled in here rather than trusted from the request body.
  const event = await getEventByCohort(cohort)
  settings = { ...settings, tracks: event?.tracks ?? [] }

  const participants = await prisma.impactLabParticipant.findMany({
    where: { cohort },
  })

  const result = runMatchingByTrack(participants.map(toMatchParticipant), settings)

  const directory = participants.map((p) => ({
    id: p.id,
    fullName: p.fullName,
    email: p.email,
    primaryRole: p.primaryRole,
    experienceLevel: p.experienceLevel,
    consentToShareContact: p.consentToShareContact,
  }))

  return NextResponse.json({
    success: true,
    data: { result, participants: directory, signature: resultSignature(result) },
  })
}
