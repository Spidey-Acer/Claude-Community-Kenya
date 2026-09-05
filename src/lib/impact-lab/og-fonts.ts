/**
 * Google Fonts loader for Impact Lab OG images — shared so the result-card
 * poster and the public recap poster fetch (and fail) identically.
 *
 * Satori (next/og's renderer) ships only Noto Sans and cannot see system
 * fonts, so Fraunces/Inter are fetched at render time; the stylesheet
 * endpoint is asked for TTF/WOFF (not WOFF2) by spoofing an old Firefox
 * User-Agent, which is what Satori can parse. Both requests use
 * `force-cache` so a warm function reuses them. Any failure yields `[]` and
 * the caller's image renders in Satori's bundled sans rather than failing a
 * share — never an error page for a link preview.
 */

export type LoadedFont = { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" }

/** One font family + weight to fetch, e.g. `{ name: "Fraunces", weight: 600 }`. */
export interface WantedFont {
  name: string
  weight: 400 | 600
}

export async function loadFonts(wanted: WantedFont[]): Promise<LoadedFont[]> {
  try {
    const families = [...new Set(wanted.map((f) => f.name))]
      .map((name) => `family=${name}:wght@${wanted.filter((f) => f.name === name).map((f) => f.weight).join(";")}`)
      .join("&")
    const css = await fetch(`https://fonts.googleapis.com/css2?${families}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0" },
      cache: "force-cache",
    }).then((r) => r.text())

    const fonts = await Promise.all(
      wanted.map(async ({ name, weight }) => {
        const block = css.match(
          new RegExp(`font-family: '${name}';[^}]*?font-weight: ${weight};[^}]*?src:\\s*url\\(([^)]+\\.(?:ttf|woff))\\)`)
        )
        if (!block) return null
        const data = await fetch(block[1], { cache: "force-cache" }).then((r) => r.arrayBuffer())
        return { name, data, weight, style: "normal" as const }
      })
    )
    return fonts.filter((f): f is LoadedFont => f !== null)
  } catch {
    return []
  }
}
