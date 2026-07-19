import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { zodSanitizeString, zodSanitizeEmail } from "@/lib/input-sanitization"

const createUserSchema = z.object({
  firstName: z.string().min(1).max(100).transform(zodSanitizeString),
  lastName: z.string().min(1).max(100).transform(zodSanitizeString),
  email: z.string().email().transform(zodSanitizeEmail),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["ADMIN", "MODERATOR", "MEMBER"]),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("users", "create")
  if (!check.authorized) return check.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    )
  }

  const validation = createUserSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    )
  }

  const { firstName, lastName, email, password, role } = validation.data

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A user with this email already exists" },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        role,
        active: true,
        emailVerified: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    })

    await logAudit({
      userId: check.user.id,
      userName: check.user.name,
      userEmail: check.user.email,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      changes: { firstName, lastName, email, role },
      ...getRequestMetadata(request),
    })

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error("[create-user] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create user" },
      { status: 500 }
    )
  }
}
