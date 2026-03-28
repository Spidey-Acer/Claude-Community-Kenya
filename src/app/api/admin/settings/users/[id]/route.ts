import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"

const updateUserSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MODERATOR", "MEMBER"]).optional(),
  active: z.boolean().optional(),
  resetPassword: z.string().min(8).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("users", "edit")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    )
  }

  const validation = updateUserSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    )
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, active: true },
    })
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    // Prevent super admin from demoting themselves
    if (user.id === check.user.id && validation.data.role && validation.data.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { success: false, error: "You cannot change your own role" },
        { status: 400 }
      )
    }

    // Prevent deactivating yourself
    if (user.id === check.user.id && validation.data.active === false) {
      return NextResponse.json(
        { success: false, error: "You cannot deactivate your own account" },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    const changes: Record<string, unknown> = {}

    if (validation.data.role !== undefined) {
      updateData.role = validation.data.role
      changes.role = { from: user.role, to: validation.data.role }
    }
    if (validation.data.active !== undefined) {
      updateData.active = validation.data.active
      changes.active = { from: user.active, to: validation.data.active }
    }
    if (validation.data.resetPassword) {
      updateData.passwordHash = await bcrypt.hash(validation.data.resetPassword, 12)
      changes.password = "Reset by admin"
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        active: true,
        lastLogin: true,
        createdAt: true,
      },
    })

    await logAudit({
      userId: check.user.id,
      userName: check.user.name,
      userEmail: check.user.email,
      action: "UPDATE",
      entity: "User",
      entityId: id,
      changes,
      ...getRequestMetadata(request),
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[update-user] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 }
    )
  }
}
