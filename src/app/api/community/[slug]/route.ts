import { NextRequest, NextResponse } from "next/server"
import { getCommunitySubmissionBySlug, getCommunityCommentsBySlug } from "@/lib/data"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    const submission = await getCommunitySubmissionBySlug(slug)

    if (!submission) {
      return NextResponse.json(
        { success: false, error: "Submission not found" },
        { status: 404 }
      )
    }

    const comments = await getCommunityCommentsBySlug(slug)

    return NextResponse.json({
      success: true,
      data: { ...submission, comments },
    })
  } catch (error) {
    console.error("[COMMUNITY] Failed to fetch submission:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch submission." },
      { status: 500 }
    )
  }
}
