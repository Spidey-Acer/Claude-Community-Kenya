import { cardResponseForSlug } from "@/lib/impact-lab/card-response"

/**
 * Download of one team's Build Day card as a square PNG — the same
 * `renderCard` the page shows and the OG preview unfurls, served as an
 * attachment. Never cached: see `card-response.ts`.
 */
export const dynamic = "force-dynamic"

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return cardResponseForSlug(slug, "square", { download: true, fallback: false })
}
