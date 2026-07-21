import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { zodSanitizeString, zodSanitizeUrl, zodSanitizeMultilineText } from "@/lib/input-sanitization"

const createSchema = z.object({
  url: z.string().url().transform(zodSanitizeUrl),
  thumbnailUrl: z.string().url().optional().nullable().transform(v => v ? zodSanitizeUrl(v) : null),
  alt: z.string().max(500).optional().nullable().transform(v => v ? zodSanitizeMultilineText(500)(v) : null),
  caption: z.string().max(1000).optional().nullable().transform(v => v ? zodSanitizeMultilineText(1000)(v) : null),
  photographer: z.string().max(100).optional().nullable().transform(v => v ? zodSanitizeString(v) : null),
  eventId: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  order: z.number().int().min(0).default(0),
  takenAt: z.string().datetime().optional().nullable().transform(v => v ? new Date(v) : null),
})

/**
 * GET /api/admin/photos — List all photos with event relation, ordered by [order asc, createdAt desc].
 */
export async function GET() {
  const check = await checkApiPermission("photos", "view")
  if (!check.authorized) return check.response

  const photos = await prisma.meetupPhoto.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { event: { select: { id: true, title: true } } },
  })
  return NextResponse.json({ success: true, data: photos })
}

/**
 * POST /api/admin/photos — Create a single photo record from JSON body.
 */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("photos", "create")
  if (!check.authorized) return check.response

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: parsed.error.issues }, { status: 400 })
  }

  const photo = await prisma.meetupPhoto.create({ data: parsed.data })
  return NextResponse.json({ success: true, data: photo }, { status: 201 })
}
