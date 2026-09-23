import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { createGuideSchema, uniqueGuideSlug } from "@/lib/guides"
import { toSlug } from "@/lib/utils"

export async function GET() {
  const check = await checkApiPermission("guides", "view")
  if (!check.authorized) return check.response

  const guides = await prisma.guide.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  })

  return NextResponse.json({ success: true, data: guides })
}

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("guides", "create")
  if (!check.authorized) return check.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = createGuideSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    )
  }

  const { published, ...data } = validation.data

  // Only the guides sharing this title's slugified base need to be checked —
  // uniqueGuideSlug recomputes the same base internally.
  const base = toSlug(data.title) || "guide"
  const candidates = await prisma.guide.findMany({
    where: { slug: { startsWith: base } },
    select: { slug: true },
  })
  const slug = uniqueGuideSlug(data.title, candidates.map((c) => c.slug))

  const guide = await prisma.guide.create({
    data: {
      ...data,
      slug,
      publishedAt: published ? new Date() : null,
    },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "CREATE",
    entity: "Guide",
    entityId: guide.id,
    changes: { title: data.title },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: guide }, { status: 201 })
}
