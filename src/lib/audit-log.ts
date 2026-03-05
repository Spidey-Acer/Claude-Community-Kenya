import { prisma } from "@/lib/prisma"

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "PUBLISH"
  | "LOGIN"
  | "LOGOUT"
  | "REGISTER"
  | "APPROVE"
  | "REJECT"
  | "RECEIVE"

export interface AuditLogEntry {
  userId: string
  action: AuditAction
  entity: string
  entityId?: string
  changes?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  userName?: string
  userEmail?: string
}

/**
 * Log an action to the audit log.
 * Non-blocking — errors are caught and logged but never fail the main operation.
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        userName: entry.userName || null,
        userEmail: entry.userEmail || null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId || null,
        changes: entry.changes
          ? JSON.parse(JSON.stringify(entry.changes))
          : undefined,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
      },
    })
  } catch (error) {
    console.error("[AuditLog] Failed to log audit entry:", error)
  }
}

export function getRequestMetadata(request: Request): {
  ipAddress: string | undefined
  userAgent: string | undefined
} {
  return {
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      undefined,
    userAgent: request.headers.get("user-agent") || undefined,
  }
}

export const SYSTEM_USER_ID = "system"

export function extractUserDetails(user: {
  id?: string
  name?: string
  email?: string
  firstName?: string
  lastName?: string
}): { id: string; name: string; email: string } {
  const id = user?.id || "unknown"
  const name =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.name || "Unknown User"
  const email = user?.email || ""
  return { id, name, email }
}
