import { cardResponseForSlug } from "@/lib/impact-lab/card-response"

/**
 * The link-preview graphic for one team's result card: the same Build Day
 * card `renderCard` draws for the downloads, cropped to 1200x630 (see
 * `ogLayout` in `card-render.tsx`). Served inline, never as an attachment.
 * Default Node.js runtime: the lookup goes through Prisma and the fonts
 * come off the filesystem, neither of which the edge runtime can do.
 *
 * Force-dynamic for the same reason `page.tsx` is: a result card is computed
 * from the run's `resultsSnapshot` per request, and that snapshot can be
 * corrected after publication. Impact Lab 02 published a podium naming a team
 * that had won nothing; correcting it fixes the page, but a PNG left in the
 * route cache would keep serving the wrong placing to every link preview —
 * the right page and the wrong image, which is the version nobody checks.
 *
 * An unknown slug gets a 404 rather than a generic poster: the page it
 * belongs to is the not-found page, and a preview claiming otherwise would
 * be the one thing on the link that lies.
 */
export const dynamic = "force-dynamic"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Build Day result card, Claude Community Kenya"

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return cardResponseForSlug(slug, "og", { download: false })
}
