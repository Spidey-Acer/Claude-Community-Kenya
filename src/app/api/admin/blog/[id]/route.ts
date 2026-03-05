import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { zodSanitizeString, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { BlogStatus } from "@/generated/prisma/client"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("blog", "view")
  if (!check.authorized) return check.response

  const { id } = await params
  const post = await prisma.blogPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: post })
}

const updateSchema = z.object({
  title: z.string().min(3).max(200).transform(zodSanitizeString).optional(),
  excerpt: z.string().min(10).max(500).transform(zodSanitizeString).optional(),
  content: z.string().min(50).transform(zodSanitizeMultilineText()).optional(),
  author: z.string().max(100).transform(zodSanitizeString).optional(),
  tags: z.array(z.string().max(50).transform(zodSanitizeString)).max(10).optional(),
  status: z.nativeEnum(BlogStatus).optional(),
  featured: z.boolean().optional(),
  readingTime: z.number().int().min(1).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("blog", "edit")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const validation = updateSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: validation.error.issues }, { status: 400 })
  }

  const existing = await prisma.blogPost.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  const data = validation.data
  const wasPublished = existing.status !== "PUBLISHED" && data.status === "PUBLISHED"

  const updated = await prisma.blogPost.update({
    where: { id },
    data: {
      ...data,
      ...(wasPublished ? { publishedAt: new Date() } : {}),
    },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: data.status === "PUBLISHED" ? "PUBLISH" : "UPDATE",
    entity: "BlogPost",
    entityId: id,
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("blog", "delete")
  if (!check.authorized) return check.response

  const { id } = await params
  const existing = await prisma.blogPost.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  await prisma.blogPost.delete({ where: { id } })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "DELETE",
    entity: "BlogPost",
    entityId: id,
    changes: { title: existing.title },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, message: "Post deleted" })
}
