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
 * draws `FALLBACK_CARD`.
 */

import { cardFileName, renderCard, type CardSize } from "./card-render"
import { findResultCardBySlug } from "./result-card-store"
import type { PublicResultCard } from "./result-card"

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
  members: [],
}

export async function cardResponseForSlug(
  slug: string,
  size: CardSize,
  options: { download: boolean; fallback: boolean }
): Promise<Response> {
  const found = await findResultCardBySlug(slug).catch(() => null)
  if (!found && !options.fallback) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } })
  }
  const card = found ?? FALLBACK_CARD
  const image = await renderCard(card, size)
  const headers = new Headers(image.headers)
  headers.set("Cache-Control", "private, no-store")
  if (options.download) {
    headers.set("Content-Disposition", `attachment; filename="${cardFileName(card, size)}"`)
  }
  return new Response(image.body, { status: 200, headers })
}
