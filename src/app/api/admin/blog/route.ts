import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import { zodSanitizeString, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { toSlug } from "@/lib/utils"
import { BlogStatus } from "@/generated/prisma"

const blogSchema = z.object({
  title: z.string().min(3).max(200).transform(zodSanitizeString),
  excerpt: z.string().min(10).max(500).transform(zodSanitizeString),
  content: z.string().min(50).transform(zodSanitizeMultilineText()),
  author: z.string().max(100).transform(zodSanitizeString),
  tags: z.array(z.string().max(50).transform(zodSanitizeString)).max(10),
  status: z.nativeEnum(BlogStatus).default("DRAFT"),
  featured: z.boolean().optional().default(false),
  readingTime: z.number().int().min(1).optional(),
})

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("blog", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "20")
  const skip = (page - 1) * limit

  const [items, total] = await Promise.all([
    prisma.blogPost.findMany({ orderBy: { createdAt: "desc" }, skip, take: limit }),
    prisma.blogPost.count(),
  ])

  return NextResponse.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}

export async function POST(request: NextRequest) {
  const check = await checkApiPermission("blog", "create")
  if (!check.authorized) return check.response

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const validation = blogSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: validation.error.issues }, { status: 400 })
  }

  const data = validation.data
  const slug = toSlug(data.title) + "-" + Date.now().toString(36)

  const post = await prisma.blogPost.create({
    data: {
      ...data,
      slug,
      authorId: check.user.id,
      publishedAt: data.status === "PUBLISHED" ? new Date() : null,
    },
  })

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "CREATE",
    entity: "BlogPost",
    entityId: post.id,
    changes: { title: data.title },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: post }, { status: 201 })
}
