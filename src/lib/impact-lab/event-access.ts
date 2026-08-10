/**
 * Event-scoped authorization: the two orthogonal layers from the tenancy
 * design. The platform tier (site UserRole via rbac.ts) says what actions a
 * staff role may take anywhere; the tenant tier (OrganisationMember) grants
 * an organisation's people full run of their OWN events only.
 *
 * Impact Lab admin routes call checkEventAccess INSTEAD of a bare
 * checkApiPermission — the platform check is embedded here.
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission, type UserRole } from "@/lib/rbac"
import { getEventByCohort, type EventRecord } from "./event-store"

export type EventAction = "view" | "create" | "edit" | "delete" | "approve"

/**
 * The pure decision: platform role with the impact-lab permission passes;
 * otherwise membership of the event's organisation passes every action
 * (OWNER and ORGANISER are equally trusted on their own event — the split
 * matters only for managing the organisation itself, which is sub-project 6).
 * No session (`role === null`) always refuses: membership is derived FROM
 * the session, so a null role with isOrgMember=true is a caller bug.
 */
export function hasEventAccess(
  role: UserRole | null,
  isOrgMember: boolean,
  action: EventAction
): boolean {
  if (role === null) return false
  if (hasPermission(role, "impact-lab", action)) return true
  return isOrgMember
}

/**
 * Authorize the caller for an event and return the event row so routes never
 * fetch it twice. `event` is null when the cohort has no Event row (unknown
 * slug, or pre-migration environment) — platform staff still pass in that
 * case so existing admin behaviour survives; org members cannot, because
 * without a row there is no organisation to be a member of.
 */
export async function checkEventAccess(
  cohort: string,
  action: EventAction
): Promise<
  | { authorized: true; event: EventRecord | null; user: { id: string; email: string; role: UserRole } }
  | { authorized: false; response: NextResponse }
> {
  const session = await auth()
  if (!session?.user?.email) {
    return {
      authorized: false,
      response: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }),
    }
  }
  const role = ((session.user as { role?: string }).role ?? "MEMBER") as UserRole
  const user = { id: session.user.id ?? "", email: session.user.email, role }

  const event = await getEventByCohort(cohort)

  let isOrgMember = false
  if (event && user.id) {
    try {
      const membership = await prisma.organisationMember.findUnique({
        where: {
          organisationId_userId: { organisationId: event.organisationId, userId: user.id },
        },
        select: { id: true },
      })
      isOrgMember = membership !== null
    } catch {
      // Missing table pre-migration — platform tier still decides.
      isOrgMember = false
    }
  }

  if (!hasEventAccess(role, isOrgMember, action)) {
    return {
      authorized: false,
      response: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }),
    }
  }
  return { authorized: true, event, user }
}
