import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit } from "@/lib/rate-limit"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { runMatching, normalizeParticipants } from "@/lib/matching"
import { explainWithAi } from "@/lib/matching/ai-explanations"
import { safeCohort } from "@/lib/impact-lab/constants"
import { toMatchParticipant } from "@/lib/impact-lab/mappers"
import { resolveSettings } from "@/lib/impact-lab/settings"
import { resultSignature } from "@/lib/impact-lab/signature"

// The Claude call can take several seconds — give it room past the default.
export const maxDuration = 30

/**
 * Explain a match with Claude. The result is recomputed server-side from the
 * cohort + settings (deterministic, so it matches what the UI showed) rather than
 * trusting a client-sent result. Rate-limited (AI cost) and audited.
 */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  // Requires create, not view — this spends on a paid Claude call, so a
  // read-only moderator must not be able to trigger it.
  const check = await checkApiPermission("impact-lab", "create")
  if (!check.authorized) return check.response

  // Key by user id, not IP: on event day every organiser shares the venue NAT,
  // so an IP-keyed limit would throttle the whole team to a handful of calls.
  const limit = await rateLimit(request, {
    maxRequests: 20,
    windowInSeconds: 3600,
    identifier: () => `impact-lab-explain:${check.user.id}`,
  })
  if (!limit.success) {
    return NextResponse.json(
      { success: false, error: "AI explanation rate limit reached. Try again later." },
      { status: 429, headers: limit.headers }
    )
  }

  let body: { cohort?: string; settings?: unknown; expectedSignature?: string } = {}
  try {
    body = (await request.json()) ?? {}
  } catch {
    // Defaults are fine.
  }

  const cohort = safeCohort(body.cohort)

  let settings
  try {
    settings = resolveSettings(body.settings)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid settings" }, { status: 400 })
  }

  const participants = await prisma.impactLabParticipant.findMany({
    where: { cohort },
  })
  const mapped = participants.map(toMatchParticipant)
  const result = runMatching(mapped, settings)

  if (body.expectedSignature && resultSignature(result) !== body.expectedSignature) {
    return NextResponse.json(
      {
        success: false,
        error: "Participants changed since these teams were generated. Regenerate first.",
      },
      { status: 409 }
    )
  }

  const normalized = normalizeParticipants(mapped.filter((p) => p.consentToMatch))

  const explained = await explainWithAi(result, normalized)

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "CREATE",
    entity: "ImpactLabExplanation",
    entityId: cohort,
    changes: { teams: result.teams.length, usedFallback: explained.usedFallback },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: explained })
}
