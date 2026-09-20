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
 * page's `<img>` stay inline.
 */

import { cardFileName, renderCard, type CardSize } from "./card-render"
import { findResultCardBySlug } from "./result-card-store"

export async function cardResponseForSlug(
  slug: string,
  size: CardSize,
  options: { download: boolean }
): Promise<Response> {
  const card = await findResultCardBySlug(slug).catch(() => null)
  if (!card) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } })
  }
  const image = await renderCard(card, size)
  const headers = new Headers(image.headers)
  headers.set("Cache-Control", "private, no-store")
  if (options.download) {
    headers.set("Content-Disposition", `attachment; filename="${cardFileName(card, size)}"`)
  }
  return new Response(image.body, { status: 200, headers })
}
