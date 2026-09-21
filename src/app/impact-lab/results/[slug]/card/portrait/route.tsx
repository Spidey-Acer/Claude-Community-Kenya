import { cardResponseForSlug, honourParam } from "@/lib/impact-lab/card-response"

/**
 * Download of one team's Build Day card as a portrait PNG — the same
 * `renderCard` the page shows and the OG preview unfurls, served as an
 * attachment. Cached for five minutes: see `card-response.ts`.
 */
export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return cardResponseForSlug(slug, "portrait", { download: true, fallback: false, honour: honourParam(request) })
}
