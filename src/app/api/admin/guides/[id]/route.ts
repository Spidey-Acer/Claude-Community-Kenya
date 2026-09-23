import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { withCsrfProtection } from "@/lib/csrf"
import { updateGuideSchema } from "@/lib/guides"
import { deleteImage } from "@/lib/supabase"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("guides", "view")
  if (!check.authorized) return check.response

  const { id } = await params
  const guide = await prisma.guide.findUnique({ where: { id } })
  if (!guide) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: guide })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("guides", "edit")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = updateGuideSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: validation.error.issues },
      { status: 400 }
    )
  }

  const existing = await prisma.guide.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const { published, ...data } = validation.data

  const guide = await prisma.guide.update({
    where: { id },
    data: {
      ...data,
      // Slug is intentionally never edited here — same rule as blog posts,
      // to keep a published guide's URL stable.
      ...(published === undefined
        ? {}
        : { publishedAt: published ? (existing.publishedAt ?? new Date()) : null }),
    },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: published && !existing.publishedAt ? "PUBLISH" : "UPDATE",
    entity: "Guide",
    entityId: id,
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: guide })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("guides", "delete")
  if (!check.authorized) return check.response

  const { id } = await params
  const existing = await prisma.guide.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  await prisma.guide.delete({ where: { id } })

  // Best-effort storage cleanup — never fails the delete if it errors.
  await deleteImage(existing.fileUrl).catch(() => {})
  if (existing.coverUrl) await deleteImage(existing.coverUrl).catch(() => {})

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "DELETE",
    entity: "Guide",
    entityId: id,
    changes: { title: existing.title },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, message: "Guide deleted" })
}
