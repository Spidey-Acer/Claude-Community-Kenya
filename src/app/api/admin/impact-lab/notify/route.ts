import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { rateLimit } from "@/lib/rate-limit"
import { safeCohort } from "@/lib/impact-lab/constants"
import { impactLabAccountEmail, sendEmailBatch, type BatchEmailItem } from "@/lib/email"

// A full-cohort blast is ~125 emails = 2 Resend batch calls; give the function
// room for slow API responses.
export const maxDuration = 60

const notifySchema = z.object({
  cohort: z.string().max(60).optional(),
  // Only account-setup mail is sent to participants. The team reveal is
  // published by marking a run final — it appears on their dashboard, and no
  // mail is spent on it (the daily quota is smaller than the cohort).
  type: z.enum(["onboarding"]),
  /**
   * Which half of the cohort to send to. Daily provider quotas can be smaller
   * than the cohort, so a blast can be split across a quota reset. The split is
   * deterministic (email-sorted, first half then the rest), so the two halves
   * never overlap and together cover everyone.
   */
  group: z.enum(["all", "first", "second"]).default("all"),
})

function selectGroup<T extends { to: string }>(
  items: T[],
  group: "all" | "first" | "second"
): T[] {
  if (group === "all") return items
  const sorted = [...items].sort((a, b) => (a.to < b.to ? -1 : a.to > b.to ? 1 : 0))
  const half = Math.ceil(sorted.length / 2)
  return group === "first" ? sorted.slice(0, half) : sorted.slice(half)
}

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

  const participants = await prisma.impactLabParticipant.findMany({
    where: { cohort },
    select: { email: true, fullName: true },
  })
  const items: BatchEmailItem[] = participants.map((p) =>
    impactLabAccountEmail({ to: p.email, firstName: firstNameOf(p.fullName) })
  )

  const selected = selectGroup(items, parsed.data.group)
  const { sent, failed } = await sendEmailBatch(selected)

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "CREATE",
    entity: "ImpactLabParticipant",
    entityId: `notify:${parsed.data.type}:${cohort}`,
    changes: {
      type: parsed.data.type,
      group: parsed.data.group,
      recipients: selected.length,
      sent,
      failed,
    },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({
    success: true,
    data: {
      sent,
      failed,
      recipients: selected.length,
      group: parsed.data.group,
      cohortSize: items.length,
    },
  })
}
