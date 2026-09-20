/**
 * The share card's static inputs — the two kit fonts and the three
 * rasterised arc+icon marks — read once from `public/` and held for the life
 * of the process.
 *
 * Satori (next/og) ships only Noto Sans, cannot see system fonts and cannot
 * load an `<img>` from a filesystem path, so the fonts arrive as buffers and
 * the marks as `data:` URIs. Read from `public/` under `process.cwd()` rather
 * than fetched: the card must render identically with no network and no
 * Google Fonts dependency (the kit fonts are not on Google Fonts anyway).
 * Node runtime only — every route that calls this already needs Prisma.
 */

import { readFile } from "node:fs/promises"
import path from "node:path"

export const CARD_SERIF = "Anthropic Serif Display"
export const CARD_SANS = "Anthropic Sans Display"

export type CardFont = { name: string; data: ArrayBuffer; weight: 300 | 600; style: "normal" }

/** Which mark to place: colours chosen per surface in `card-render.tsx`. */
export type MarkVariant = "poster" | "paper" | "ink"

export interface CardAssets {
  fonts: CardFont[]
  /** `data:image/png;base64,…` per variant, ready for a Satori `<img src>`. */
  marks: Record<MarkVariant, string>
  /** Intrinsic pixel size of every mark (all three share it). */
  markSize: { width: number; height: number }
}

const PUBLIC_DIR = () => path.join(process.cwd(), "public")
const FONT_FILES: { name: string; file: string; weight: 300 | 600 }[] = [
  { name: CARD_SERIF, file: "AnthropicSerifDisplay-Light-Static.otf", weight: 300 },
  { name: CARD_SANS, file: "AnthropicSansDisplay-Semibold-Static.otf", weight: 600 },
]
const MARK_VARIANTS: MarkVariant[] = ["poster", "paper", "ink"]
/** Set by `scripts/buildday-marks.ts` (2x of the poster's 1080x460 top region). */
const MARK_SIZE = { width: 2160, height: 920 }

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
}

let cached: Promise<CardAssets> | null = null

/** Fonts and marks, loaded on first use and reused by every later render. */
export function loadCardAssets(): Promise<CardAssets> {
  if (!cached) {
    cached = readAssets().catch((error) => {
      // A failed read must not poison every later render with the same
      // rejected promise — let the next request try again.
      cached = null
      throw error
    })
  }
  return cached
}

async function readAssets(): Promise<CardAssets> {
  const fonts = await Promise.all(
    FONT_FILES.map(async ({ name, file, weight }) => ({
      name,
      weight,
      style: "normal" as const,
      data: toArrayBuffer(await readFile(path.join(PUBLIC_DIR(), "fonts", file))),
    }))
  )
  const markEntries = await Promise.all(
    MARK_VARIANTS.map(async (variant) => {
      const png = await readFile(path.join(PUBLIC_DIR(), "images", "buildday", `mark-${variant}.png`))
      return [variant, `data:image/png;base64,${png.toString("base64")}`] as const
    })
  )
  return {
    fonts,
    marks: Object.fromEntries(markEntries) as Record<MarkVariant, string>,
    markSize: MARK_SIZE,
  }
}
