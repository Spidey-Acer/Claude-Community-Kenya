import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { CommunityResourceType, CommunityStatus } from "@/generated/prisma/client"

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("community", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "20")
  const skip = (page - 1) * limit

  const status = searchParams.get("status") as CommunityStatus | null
  const type = searchParams.get("type") as CommunityResourceType | null

  const where = {
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.communitySubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { _count: { select: { comments: true } } },
    }),
    prisma.communitySubmission.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
