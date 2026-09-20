/**
 * Rasterise the Build Day poster's "CLAUDE COMMUNITY" arc + hand icon into
 * the transparent PNGs the result-card renderer places as `<img>`.
 *
 * Satori (next/og) cannot set text on a path, so the arc has to arrive as a
 * bitmap. The poster's own SVG is the source of truth: its arc and icon are
 * plain `<path>` elements, its three text lines are `<text>` elements and
 * its field is one `<rect>`. This strips the rect, the text and the embedded
 * fonts, recolours the paths per surface and renders the top region at 2x.
 *
 * Three variants, one per surface family (see `card-render.tsx`):
 *   mark-poster.png  arc paper, icon strokes ink, square paper  (the clay built card)
 *   mark-paper.png   arc paper, icon strokes paper, square paper (graphite, bronze)
 *   mark-ink.png     arc ink,   icon strokes ink,   square paper (gold)
 * The icon's paper square keeps its fill on every variant, as briefed.
 *
 * Usage (repo root):
 *   npx tsx scripts/buildday-marks.ts "<path to buildday-source.svg>"
 * Output: public/images/buildday/mark-{poster,paper,ink}.png
 */

import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const PAPER = "#FAF9F5"
const INK = "#141413"

/** The poster's 1080-box region holding the arc and the icon, with breathing room. */
const CROP = { x: 0, y: 60, width: 1080, height: 460 }
const SCALE = 2

type Variant = { name: string; arc: string; strokes: string }
const VARIANTS: Variant[] = [
  { name: "mark-poster", arc: PAPER, strokes: INK },
  { name: "mark-paper", arc: PAPER, strokes: PAPER },
  { name: "mark-ink", arc: INK, strokes: INK },
]

function recolour(svg: string, variant: Variant): string {
  const paths = [...svg.matchAll(/<path d="([^"]*)" fill="(#[0-9A-Fa-f]{6})"\/>/g)]
  if (paths.length !== 6) throw new Error(`expected 6 paths in the poster SVG, found ${paths.length}`)
  // Path order in the poster: [0] arc (paper), [1] the icon's square (paper),
  // [2..5] the icon's strokes (ink).
  const body = paths
    .map((m, i) => {
      const fill = i === 0 ? variant.arc : i === 1 ? PAPER : variant.strokes
      return `<path d="${m[1]}" fill="${fill}"/>`
    })
    .join("\n")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CROP.width * SCALE}" height="${CROP.height * SCALE}" viewBox="${CROP.x} ${CROP.y} ${CROP.width} ${CROP.height}" fill="none">${body}</svg>`
}

async function main() {
  const source = process.argv[2]
  if (!source) throw new Error("pass the path to buildday-source.svg")
  const svg = await readFile(source, "utf8")
  const outDir = path.join(process.cwd(), "public", "images", "buildday")
  await mkdir(outDir, { recursive: true })
  for (const variant of VARIANTS) {
    const png = await sharp(Buffer.from(recolour(svg, variant)))
      .png({ compressionLevel: 9 })
      .toBuffer()
    const out = path.join(outDir, `${variant.name}.png`)
    await writeFile(out, png)
    const meta = await sharp(png).metadata()
    console.log(`${variant.name}.png ${meta.width}x${meta.height} ${png.length} bytes`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
