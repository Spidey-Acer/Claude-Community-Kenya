import { NextRequest, NextResponse } from "next/server"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { getSessionUserId } from "@/lib/auth-helpers"

/**
 * GET /api/showcase/gifs — proxy Tenor search.
 *
 * Server-side so the API key never reaches a browser. contentfilter=high is
 * hard-coded rather than passed through: it is a safety floor for a public
 * community surface, not a caller preference.
 */

const TENOR_ENDPOINT = "https://tenor.googleapis.com/v2/search"
const RESULT_LIMIT = 24

interface TenorMediaFormat {
  url: string
  dims: [number, number]
}

interface TenorResult {
  id: string
  content_description: string
  media_formats: Record<string, TenorMediaFormat | undefined>
}

export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, RateLimits.READ)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many searches. Please slow down." },
      { status: 429, headers: rateLimitResult.headers },
    )
  }

  // Members only: an open proxy would let anyone burn the key's quota.
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in to search GIFs." }, { status: 401 })
  }

  const apiKey = process.env.TENOR_API_KEY?.trim()
  if (!apiKey) {
    console.error("[SHOWCASE] TENOR_API_KEY is not set — GIF picker disabled")
    return NextResponse.json(
      { success: false, error: "GIF search is unavailable right now." },
      { status: 503 },
    )
  }

  const query = request.nextUrl.searchParams.get("q")?.trim()
  if (!query) {
    return NextResponse.json({ success: false, error: "Missing search term" }, { status: 400 })
  }

  const url = new URL(TENOR_ENDPOINT)
  url.searchParams.set("q", query.slice(0, 100))
  url.searchParams.set("key", apiKey)
  url.searchParams.set("limit", String(RESULT_LIMIT))
  url.searchParams.set("contentfilter", "high")
  url.searchParams.set("media_filter", "gif,tinygif")

  try {
    const response = await fetch(url, { next: { revalidate: 300 } })
    if (!response.ok) {
      console.error("[SHOWCASE] Tenor search failed:", response.status)
      return NextResponse.json(
        { success: false, error: "GIF search is unavailable right now." },
        { status: 502 },
      )
    }

    const payload = (await response.json()) as { results?: TenorResult[] }

    const results = (payload.results ?? []).flatMap((item) => {
      const gif = item.media_formats.gif
      const preview = item.media_formats.tinygif ?? gif
      if (!gif || !preview) return []
      return [{
        id: item.id,
        url: gif.url,
        previewUrl: preview.url,
        width: gif.dims[0],
        height: gif.dims[1],
        description: item.content_description,
      }]
    })

    return NextResponse.json({ success: true, data: { results } })
  } catch (error) {
    console.error("[SHOWCASE] Tenor request threw:", error)
    return NextResponse.json(
      { success: false, error: "GIF search is unavailable right now." },
      { status: 502 },
    )
  }
}
