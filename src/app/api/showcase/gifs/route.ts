import { NextRequest, NextResponse } from "next/server"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { getSessionUserId } from "@/lib/auth-helpers"

/**
 * GET /api/showcase/gifs — proxy GIPHY search and trending.
 *
 * Server-side so the API key never reaches a browser. rating=g is hard-coded
 * rather than passed through: it is a safety floor for a public community
 * surface, not a caller preference. With no `q` the route returns trending —
 * that is what fills the picker before the member has typed anything.
 */

const GIPHY_SEARCH_ENDPOINT = "https://api.giphy.com/v1/gifs/search"
const GIPHY_TRENDING_ENDPOINT = "https://api.giphy.com/v1/gifs/trending"
const RESULT_LIMIT = 24

interface GiphyImageRendition {
  url: string
  width: string
  height: string
}

interface GiphyResult {
  id: string
  title: string
  images: Partial<Record<"fixed_height" | "preview_gif" | "fixed_height_small", GiphyImageRendition>>
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

  const apiKey = process.env.GIPHY_API_KEY?.trim()
  if (!apiKey) {
    console.error("[SHOWCASE] GIPHY_API_KEY is not set — GIF picker disabled")
    return NextResponse.json(
      { success: false, error: "GIF search is unavailable right now." },
      { status: 503 },
    )
  }

  const query = request.nextUrl.searchParams.get("q")?.trim()

  const url = new URL(query ? GIPHY_SEARCH_ENDPOINT : GIPHY_TRENDING_ENDPOINT)
  url.searchParams.set("api_key", apiKey)
  url.searchParams.set("limit", String(RESULT_LIMIT))
  url.searchParams.set("rating", "g")
  if (query) url.searchParams.set("q", query.slice(0, 100))

  try {
    const response = await fetch(url, { next: { revalidate: 300 } })
    if (!response.ok) {
      console.error("[SHOWCASE] GIPHY request failed:", response.status)
      return NextResponse.json(
        { success: false, error: "GIF search is unavailable right now." },
        { status: 502 },
      )
    }

    const payload = (await response.json()) as { data?: GiphyResult[] }

    const results = (payload.data ?? []).flatMap((item) => {
      const gif = item.images.fixed_height
      const preview = item.images.preview_gif ?? item.images.fixed_height_small ?? gif
      if (!gif || !preview) return []
      return [{
        id: item.id,
        url: gif.url,
        previewUrl: preview.url,
        width: Number.parseInt(gif.width, 10) || 0,
        height: Number.parseInt(gif.height, 10) || 0,
        description: item.title,
      }]
    })

    return NextResponse.json({ success: true, data: { results } })
  } catch (error) {
    console.error("[SHOWCASE] GIPHY request threw:", error)
    return NextResponse.json(
      { success: false, error: "GIF search is unavailable right now." },
      { status: 502 },
    )
  }
}
