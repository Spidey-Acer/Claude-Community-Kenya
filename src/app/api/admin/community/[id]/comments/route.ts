import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { CommunityStatus } from "@/generated/prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("community", "view")
  if (!check.authorized) return check.response

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") as CommunityStatus | null

  const comments = await prisma.communityComment.findMany({
    where: {
      submissionId: id,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ success: true, data: comments })
}
