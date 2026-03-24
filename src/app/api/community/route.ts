import { NextRequest, NextResponse } from "next/server"
import { getCommunitySubmissions } from "@/lib/data"

const VALID_TYPES = ["MCP", "PROMPT", "WORKFLOW", "TOOL"] as const
const VALID_SORTS = ["recent", "popular"] as const

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const typeParam = searchParams.get("type")
  const sortParam = searchParams.get("sort")
  const pageParam = searchParams.get("page")
  const limitParam = searchParams.get("limit")

  if (typeParam && !VALID_TYPES.includes(typeParam as (typeof VALID_TYPES)[number])) {
    return NextResponse.json(
      { success: false, error: "Invalid type. Must be one of: MCP, PROMPT, WORKFLOW, TOOL" },
      { status: 400 }
    )
  }

  if (sortParam && !VALID_SORTS.includes(sortParam as (typeof VALID_SORTS)[number])) {
    return NextResponse.json(
      { success: false, error: "Invalid sort. Must be one of: recent, popular" },
      { status: 400 }
    )
  }

  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1
  const limit = limitParam ? Math.min(50, Math.max(1, parseInt(limitParam, 10) || 20)) : 20

  try {
    const { items, total } = await getCommunitySubmissions({
      type: typeParam ?? undefined,
      sort: (sortParam as "recent" | "popular") ?? undefined,
      page,
      limit,
    })

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("[COMMUNITY] Failed to fetch submissions:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch community submissions." },
      { status: 500 }
    )
  }
}
