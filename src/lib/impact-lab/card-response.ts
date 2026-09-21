/**
 * The HTTP wrapper around `renderCard` for the public card routes: the
 * slug lookup, the 404, and the two headers every PNG of a team's card
 * carries.
 *
 * `Cache-Control: public, max-age=300, stale-while-revalidate=600` on a
 * rendered card: the dashboard shows up to eight of these per view and
 * they all land in the hour the results email goes out, so each PNG may be
 * served from cache for five minutes. A corrected placing (Impact Lab 02's
 * podium was corrected two days after publish) therefore lags by at most
 * that long; the routes stay `force-dynamic` so the next render reads the
 * corrected snapshot. Errors stay `no-store`. `Content-Disposition:
 * attachment` only where the caller asks — the download buttons — so the OG
 * preview and the page's `<img>` stay inline. `fallback` decides what an unresolvable slug
 * gets: the downloads 404 (there is nothing to download), the OG route
 * draws `FALLBACK_CARD`. `honour` picks one of the team's cards (see
 * `cardHonours`), the primary by default; past the last one is a 404.
 */

import { cardFileName, renderCard, type CardSize } from "./card-render"
import { findResultCardBySlug } from "./result-card-store"
import { cardHonours, parseHonourIndex, type PublicResultCard } from "./result-card"

/**
 * What the OG route draws when the slug resolves to nothing or the lookup
 * fails: a generic community card rather than no image. A link that is
 * already posted must never lose its preview to a database blip — a crawler
 * that is handed a 404 caches "no image" for that URL.
 */
const FALLBACK_CARD: PublicResultCard = {
  eventName: "Impact Lab",
  eventDates: "",
  projectName: "Claude Community Kenya",
  track: "",
  title: "Built",
  champion: false,
  overallRank: null,
  members: [],
}

const NO_STORE = { "Cache-Control": "private, no-store" }
/** Five minutes fresh, ten more stale while a fresh render is fetched (ruling 2026-09-21). */
export const CARD_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=600"

/** The raw `?honour=` value off a route's request URL, for `cardResponseForSlug`. */
export function honourParam(request: Request): string | null {
  return new URL(request.url).searchParams.get("honour")
}

export async function cardResponseForSlug(
  slug: string,
  size: CardSize,
  options: { download: boolean; fallback: boolean; honour?: string | null }
): Promise<Response> {
  const index = parseHonourIndex(options.honour ?? null)
  if (index === undefined) {
    return new Response("honour must be a whole number", { status: 400, headers: NO_STORE })
  }
  const found = await findResultCardBySlug(slug).catch(() => null)
  if (!found && !options.fallback) {
    return new Response("Not found", { status: 404, headers: NO_STORE })
  }
  const card = found ?? FALLBACK_CARD
  const honours = cardHonours(card)
  const honour = honours[index]
  if (!honour) {
    return new Response("Not found", { status: 404, headers: NO_STORE })
  }
  const image = await renderCard(card, size, honour)
  const headers = new Headers(image.headers)
  headers.set("Cache-Control", CARD_CACHE_CONTROL)
  if (options.download) {
    headers.set("Content-Disposition", `attachment; filename="${cardFileName(card, size, honour)}"`)
  }
  return new Response(image.body, { status: 200, headers })
}
