import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MODERATOR" | "MEMBER"

export type AdminResource =
  | "dashboard"
  | "speakers"
  | "ideas"
  | "applications"
  | "contact"
  | "events"
  | "blog"
  | "projects"
  | "users"
  | "settings"

export type Action = "view" | "create" | "edit" | "delete" | "approve"

const rolePermissions: Record<
  UserRole,
  Record<AdminResource, Action[]>
> = {
  SUPER_ADMIN: {
    dashboard: ["view"],
    speakers: ["view", "create", "edit", "delete", "approve"],
    ideas: ["view", "create", "edit", "delete", "approve"],
    applications: ["view", "create", "edit", "delete", "approve"],
    contact: ["view", "edit", "delete"],
    events: ["view", "create", "edit", "delete"],
    blog: ["view", "create", "edit", "delete"],
    projects: ["view", "create", "edit", "delete"],
    users: ["view", "create", "edit", "delete"],
    settings: ["view", "edit"],
  },
  ADMIN: {
    dashboard: ["view"],
    speakers: ["view", "edit", "approve"],
    ideas: ["view", "edit", "approve"],
    applications: ["view", "edit", "approve"],
    contact: ["view", "edit"],
    events: ["view", "create", "edit", "delete"],
    blog: ["view", "create", "edit", "delete"],
    projects: ["view", "create", "edit"],
    users: ["view"],
    settings: [],
  },
  MODERATOR: {
    dashboard: ["view"],
    speakers: ["view", "approve"],
    ideas: ["view", "approve"],
    applications: ["view", "approve"],
    contact: ["view"],
    events: ["view"],
    blog: ["view"],
    projects: ["view"],
    users: [],
    settings: [],
  },
  MEMBER: {
    dashboard: ["view"],
    speakers: [],
    ideas: [],
    applications: [],
    contact: [],
    events: ["view"],
    blog: ["view"],
    projects: ["view"],
    users: [],
    settings: [],
  },
}

export function hasPermission(
  role: UserRole,
  resource: AdminResource,
  action: Action
): boolean {
  const permissions = rolePermissions[role]
  if (!permissions) return false
  return permissions[resource]?.includes(action) ?? false
}

export function requirePermission(
  role: UserRole,
  resource: AdminResource,
  action: Action
): void {
  if (!hasPermission(role, resource, action)) {
    throw new Error(
      `Permission denied: ${role} cannot ${action} ${resource}`
    )
  }
}

export async function checkApiPermission(
  resource: AdminResource,
  action: Action
): Promise<
  | { authorized: true; user: { id: string; name: string; email: string; role: UserRole } }
  | { authorized: false; response: NextResponse }
> {
  const session = await auth()

  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    }
  }

  const role = (session.user as { role?: string }).role as UserRole
  if (!hasPermission(role, resource, action)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      ),
    }
  }

  return {
    authorized: true,
    user: {
      id: session.user.id ?? "",
      name: session.user.name ?? "",
      email: session.user.email ?? "",
      role,
    },
  }
}

export function withPermission(resource: AdminResource, action: Action) {
  return function (
    handler: (
      request: NextRequest,
      context: { user: { id: string; name: string; email: string; role: UserRole } }
    ) => Promise<NextResponse>
  ) {
    return async (request: NextRequest) => {
      const check = await checkApiPermission(resource, action)
      if (!check.authorized) return check.response
      return handler(request, { user: check.user })
    }
  }
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MODERATOR: "Moderator",
  MEMBER: "Member",
}

export const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: "#00ff41",
  ADMIN: "#ffb000",
  MODERATOR: "#00d4ff",
  MEMBER: "#8a8a8a",
}
