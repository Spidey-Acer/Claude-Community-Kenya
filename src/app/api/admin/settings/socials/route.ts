import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { socialLinksUpdateSchema, SOCIAL_PLATFORM_DB_FIELD, SOCIAL_PLATFORM_KEYS } from "@/lib/social-links-schema"
import { invalidateSocialLinksCache } from "@/lib/social-links"

export async function PATCH(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("settings", "edit")
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

  const validation = socialLinksUpdateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    )
  }

  // Map platform keys (whatsapp, discord, ...) to their DB columns
  // (whatsappUrl, discordUrl, ...) — only fields present in the request
  // are touched, so a partial save doesn't clear the rest.
  const data: Record<string, string | null> = {}
  for (const key of SOCIAL_PLATFORM_KEYS) {
    const value = validation.data[key]
    if (value !== undefined) {
      data[SOCIAL_PLATFORM_DB_FIELD[key]] = value
    }
  }

  try {
    const updated = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    })

    invalidateSocialLinksCache()

    await logAudit({
      userId: check.user.id,
      userName: check.user.name,
      userEmail: check.user.email,
      action: "UPDATE",
      entity: "SiteSettings",
      entityId: "default",
      changes: data,
      ...getRequestMetadata(request),
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[ADMIN_SOCIALS] Failed to update social links:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update social links" },
      { status: 500 }
    )
  }
}
