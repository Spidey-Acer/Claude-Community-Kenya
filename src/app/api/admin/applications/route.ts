import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { ApplicationStatus } from "@/generated/prisma/client"

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("applications", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") as ApplicationStatus | null
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "20")
  const skip = (page - 1) * limit

  const where = status ? { status } : {}

  const [items, total] = await Promise.all([
    prisma.joinApplication.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.joinApplication.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  })
}
