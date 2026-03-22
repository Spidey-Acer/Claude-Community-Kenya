import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"

const statsUpdateSchema = z.object({
  discordMembers: z.number().int().min(0).optional(),
  whatsappMembers: z.number().int().min(0).optional(),
  linkedinMembers: z.number().int().min(0).optional(),
  eventsHeld: z.number().int().min(0).optional(),
  citiesActive: z.array(z.string().min(1).max(100)).optional(),
  resourceCount: z.number().int().min(0).optional(),
  websiteStatus: z.string().min(1).max(50).optional(),
})

export async function GET() {
  const check = await checkApiPermission("settings", "view")
  if (!check.authorized) return check.response

  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
    })

    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          id: "default",
          discordMembers: 71,
          whatsappMembers: 70,
          linkedinMembers: 59,
          eventsHeld: 2,
          citiesActive: ["Nairobi", "Mombasa"],
          resourceCount: 33,
          websiteStatus: "live",
        },
      })
    }

    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error("[ADMIN_STATS] Failed to fetch stats:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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

  const validation = statsUpdateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    )
  }

  try {
    const updated = await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: validation.data,
      create: {
        id: "default",
        discordMembers: validation.data.discordMembers ?? 0,
        whatsappMembers: validation.data.whatsappMembers ?? 0,
        linkedinMembers: validation.data.linkedinMembers ?? 0,
        eventsHeld: validation.data.eventsHeld ?? 0,
        citiesActive: validation.data.citiesActive ?? ["Nairobi", "Mombasa"],
        resourceCount: validation.data.resourceCount ?? 0,
        websiteStatus: validation.data.websiteStatus ?? "live",
      },
    })

    await logAudit({
      userId: check.user.id,
      userName: check.user.name,
      userEmail: check.user.email,
      action: "UPDATE",
      entity: "SiteSettings",
      entityId: "default",
      changes: validation.data,
      ...getRequestMetadata(request),
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error("[ADMIN_STATS] Failed to update stats:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update stats" },
      { status: 500 }
    )
  }
}
