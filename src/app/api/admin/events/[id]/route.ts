import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { zodSanitizeString, zodSanitizeUrl, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { EventType, EventStatus } from "@/generated/prisma/client"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("events", "view")
  if (!check.authorized) return check.response

  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: event })
}

const updateSchema = z.object({
  title: z.string().min(3).max(200).transform(zodSanitizeString).optional(),
  description: z.string().min(10).max(500).transform(zodSanitizeString).optional(),
  fullDescription: z.string().max(5000).optional().transform(v => v ? zodSanitizeMultilineText(5000)(v) : undefined),
  date: z.string().datetime().optional(),
  time: z.string().max(50).transform(zodSanitizeString).optional(),
  venue: z.string().max(200).transform(zodSanitizeString).optional(),
  city: z.string().max(100).transform(zodSanitizeString).optional(),
  type: z.nativeEnum(EventType).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  registrationUrl: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  lumaUrl: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  host: z.string().max(200).optional().transform(v => v ? zodSanitizeString(v) : undefined),
  partnerOrg: z.string().max(200).optional().transform(v => v ? zodSanitizeString(v) : undefined),
  highlights: z.array(z.string().max(200)).optional(),
  agenda: z.array(z.string().max(200)).optional(),
  attendeeCount: z.number().int().min(0).optional(),
  featured: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("events", "edit")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const validation = updateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: validation.error.issues }, { status: 400 })
  }

  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const data = validation.data
  const updated = await prisma.event.update({
    where: { id },
    data: {
      ...data,
      ...(data.date ? { date: new Date(data.date) } : {}),
    },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "Event",
    entityId: id,
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("events", "delete")
  if (!check.authorized) return check.response

  const { id } = await params
  const existing = await prisma.event.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  await prisma.event.delete({ where: { id } })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "DELETE",
    entity: "Event",
    entityId: id,
    changes: { title: existing.title },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, message: "Event deleted" })
}
