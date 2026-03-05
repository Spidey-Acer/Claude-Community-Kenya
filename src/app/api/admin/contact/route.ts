import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { MessageStatus } from "@/generated/prisma"

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("contact", "view")
  if (!check.authorized) return check.response

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") as MessageStatus | null
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "20")
  const skip = (page - 1) * limit

  const where = status ? { status } : {}

  const [items, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.contactMessage.count({ where }),
  ])

  return NextResponse.json({
    success: true,
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}
