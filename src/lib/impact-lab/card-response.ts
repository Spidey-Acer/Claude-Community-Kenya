/**
 * The HTTP wrapper around `renderCard` for the public card routes: the
 * slug lookup, the 404, and the two headers every PNG of a team's card
 * carries.
 *
 * `Cache-Control: private, no-store` on every size, for the same reason the
 * routes are `force-dynamic`: a published placing can be corrected, and a
 * cached PNG would keep handing out the old one (Impact Lab 02's podium was
 * corrected two days after publish). `Content-Disposition: attachment` only
 * where the caller asks — the download buttons — so the OG preview and the
 * page's `<img>` stay inline. `fallback` decides what an unresolvable slug
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
  headers.set("Cache-Control", "private, no-store")
  if (options.download) {
    headers.set("Content-Disposition", `attachment; filename="${cardFileName(card, size, honour)}"`)
  }
  return new Response(image.body, { status: 200, headers })
}
