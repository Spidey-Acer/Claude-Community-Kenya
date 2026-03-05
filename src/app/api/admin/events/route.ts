import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { zodSanitizeString, zodSanitizeUrl, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { toSlug } from "@/lib/utils"
import { EventType, EventStatus } from "@/generated/prisma"

const eventSchema = z.object({
  title: z.string().min(3).max(200).transform(zodSanitizeString),
  description: z.string().min(10).max(500).transform(zodSanitizeString),
  fullDescription: z.string().max(5000).optional().transform(v => v ? zodSanitizeMultilineText(5000)(v) : undefined),
  date: z.string().datetime(),
  time: z.string().max(50).transform(zodSanitizeString),
  venue: z.string().max(200).transform(zodSanitizeString),
  city: z.string().max(100).transform(zodSanitizeString),
  type: z.nativeEnum(EventType),
  status: z.nativeEnum(EventStatus),
  registrationUrl: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  lumaUrl: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  host: z.string().max(200).optional().transform(v => v ? zodSanitizeString(v) : undefined),
  partnerOrg: z.string().max(200).optional().transform(v => v ? zodSanitizeString(v) : undefined),
  highlights: z.array(z.string().max(200).transform(zodSanitizeString)).optional(),
  agenda: z.array(z.string().max(200).transform(zodSanitizeString)).optional(),
  attendeeCount: z.number().int().min(0).optional(),
  photosUrl: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  featured: z.boolean().optional().default(false),
})

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("events", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "20")
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    prisma.event.findMany({ orderBy: { date: "desc" }, skip, take: limit }),
    prisma.event.count(),
  ])

  return NextResponse.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}

export async function POST(request: NextRequest) {
  const check = await checkApiPermission("events", "create")
  if (!check.authorized) return check.response

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const validation = eventSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: validation.error.issues }, { status: 400 })
  }

  const data = validation.data
  const slug = toSlug(data.title) + "-" + Date.now().toString(36)

  const event = await prisma.event.create({
    data: {
      ...data,
      slug,
      date: new Date(data.date),
    },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "CREATE",
    entity: "Event",
    entityId: event.id,
    changes: { title: data.title },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: event }, { status: 201 })
}
