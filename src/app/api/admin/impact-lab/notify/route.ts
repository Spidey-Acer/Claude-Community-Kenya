import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { rateLimit } from "@/lib/rate-limit"
import { safeCohort } from "@/lib/impact-lab/constants"
import { extractFrozenTeams } from "@/lib/impact-lab/member"
import {
  impactLabAccountEmail,
  impactLabRevealEmail,
  sendEmailBatch,
  type BatchEmailItem,
} from "@/lib/email"

// A full-cohort blast is ~125 emails = 2 Resend batch calls; give the function
// room for slow API responses.
export const maxDuration = 60

const notifySchema = z.object({
  cohort: z.string().max(60).optional(),
  type: z.enum(["onboarding", "reveal"]),
})

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "there"
}

/**
 * Email blast to Impact Lab participants. "onboarding" tells every participant
 * in the cohort how to create the account that unlocks their reveal; "reveal"
 * tells everyone assigned in the cohort's FINAL run that their team is ready.
 * Emails carry at most the team name — teammates, contacts, and the writeup
 * stay behind the verified dashboard.
 */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("impact-lab", "create")
  if (!check.authorized) return check.response

  // Cohort-sized email blasts must not be spammable by a double-click storm.
  const limit = await rateLimit(request, {
    maxRequests: 4,
    windowInSeconds: 600,
    identifier: () => `impact-lab-notify:${check.user.id}`,
  })
  if (!limit.success) {
    return NextResponse.json(
      { success: false, error: "Too many notification blasts. Wait a few minutes." },
      { status: 429, headers: limit.headers }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const parsed = notifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed" }, { status: 400 })
  }

  const cohort = safeCohort(parsed.data.cohort)
  let items: BatchEmailItem[]

  if (parsed.data.type === "onboarding") {
    const participants = await prisma.impactLabParticipant.findMany({
      where: { cohort },
      select: { email: true, fullName: true },
    })
    items = participants.map((p) =>
      impactLabAccountEmail({ to: p.email, firstName: firstNameOf(p.fullName) })
    )
  } else {
    const run = await prisma.impactLabMatchRun.findFirst({
      where: { cohort, isFinal: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, result: true },
    })
    if (!run) {
      return NextResponse.json(
        { success: false, error: "No final run — mark a run as final before announcing teams." },
        { status: 409 }
      )
    }
    const teams = extractFrozenTeams(run.result)
    if (!teams) {
      return NextResponse.json(
        { success: false, error: "The final run's result is malformed." },
        { status: 409 }
      )
    }

    const teamNameById = new Map<string, string>()
    for (const team of teams) {
      for (const id of team.memberIds) teamNameById.set(id, team.name)
    }
    const assigned = await prisma.impactLabParticipant.findMany({
      where: { cohort, id: { in: [...teamNameById.keys()] } },
      select: { id: true, email: true, fullName: true },
    })
    items = assigned.map((p) =>
      impactLabRevealEmail({
        to: p.email,
        firstName: firstNameOf(p.fullName),
        teamName: teamNameById.get(p.id) ?? "your team",
      })
    )
  }

  const { sent, failed } = await sendEmailBatch(items)

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "CREATE",
    entity: "ImpactLabParticipant",
    entityId: `notify:${parsed.data.type}:${cohort}`,
    changes: { type: parsed.data.type, recipients: items.length, sent, failed },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({
    success: true,
    data: { sent, failed, recipients: items.length },
  })
}
