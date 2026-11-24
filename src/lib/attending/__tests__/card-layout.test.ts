import { describe, expect, it } from "vitest"
import {
  CARD_COLOURS,
  CARD_SIZES,
  buildCaption,
  computeLayout,
  fitText,
  photoSourceRect,
  pngHasExifChunk,
} from "../card-layout"

// 0.5 em per character: deterministic stand-in for canvas measureText.
const measure = (text: string, fontPx: number) => text.length * fontPx * 0.5

describe("card layout", () => {
  it("uses the two feed sizes and the kit colours", () => {
    expect(CARD_SIZES.portrait).toEqual({ width: 1080, height: 1350 })
    expect(CARD_SIZES.square).toEqual({ width: 1080, height: 1080 })
    expect(CARD_COLOURS).toEqual({ coral: "#D97757", ink: "#141413", cream: "#FAF9F5" })
  })

  it("keeps every element inside the card in both sizes", () => {
    for (const size of ["portrait", "square"] as const) {
      const layout = computeLayout(size)
      const { cx, cy, radius, ringWidth } = layout.photo
      expect(cx - radius - ringWidth).toBeGreaterThan(0)
      expect(cx + radius + ringWidth).toBeLessThan(layout.width)
      expect(cy + radius + ringWidth).toBeLessThan(layout.footerBand.y)
      expect(layout.footerBand.y + layout.footerBand.height).toBeLessThan(layout.height)
    }
  })
})

describe("fitText", () => {
  const slot = { x: 0, y: 0, maxWidth: 400, align: "left", maxLines: 2, maxPx: 64, minPx: 24, lineHeight: 1.15 } as const

  it("keeps the largest size when the text fits", () => {
    expect(fitText(measure, "Build Day", slot)).toEqual({ fontPx: 64, lines: ["Build Day"] })
  })

  it("scales down and wraps to at most two lines", () => {
    const fitted = fitText(measure, "Claude Code Workshop for Builders in Nairobi", slot)
    expect(fitted.lines.length).toBeLessThanOrEqual(2)
    expect(fitted.fontPx).toBeLessThan(64)
    for (const line of fitted.lines) expect(measure(line, fitted.fontPx)).toBeLessThanOrEqual(400)
  })

  it("truncates with an ellipsis at the minimum size instead of overflowing", () => {
    const fitted = fitText(measure, "word ".repeat(80), slot)
    expect(fitted.fontPx).toBe(24)
    expect(fitted.lines).toHaveLength(2)
    expect(fitted.lines[1].endsWith("…")).toBe(true)
    for (const line of fitted.lines) expect(measure(line, 24)).toBeLessThanOrEqual(400)
  })

  it("scales a 40-character name down onto one line", () => {
    const name = "A".repeat(40)
    const fitted = fitText(measure, name, { ...slot, maxLines: 1, maxWidth: 888, maxPx: 76, minPx: 36 })
    expect(fitted.lines).toEqual([name])
    expect(fitted.fontPx).toBeLessThan(76)
  })
})

describe("photoSourceRect", () => {
  it("centres the largest square at zoom 1", () => {
    expect(photoSourceRect(2000, 1000, { zoom: 1, panX: 0, panY: 0 })).toEqual({ sx: 500, sy: 0, side: 1000 })
  })

  it("zooms in and stays inside the image at every pan extreme", () => {
    for (const pan of [-5, -1, 0, 1, 5]) {
      const { sx, sy, side } = photoSourceRect(1600, 1200, { zoom: 3, panX: pan, panY: pan })
      expect(side).toBeCloseTo(400)
      expect(sx).toBeGreaterThanOrEqual(0)
      expect(sy).toBeGreaterThanOrEqual(0)
      expect(sx + side).toBeLessThanOrEqual(1600)
      expect(sy + side).toBeLessThanOrEqual(1200)
    }
  })
})

describe("pngHasExifChunk", () => {
  function chunk(type: string, dataLength: number): number[] {
    const header = [0, 0, 0, dataLength, ...[...type].map((char) => char.charCodeAt(0))]
    return [...header, ...new Array(dataLength).fill(0), 0, 0, 0, 0]
  }
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

  it("is false for a PNG with only image chunks", () => {
    const png = new Uint8Array([...signature, ...chunk("IHDR", 13), ...chunk("IDAT", 4), ...chunk("IEND", 0)])
    expect(pngHasExifChunk(png)).toBe(false)
  })

  it("is true when an eXIf chunk is present", () => {
    const png = new Uint8Array([...signature, ...chunk("IHDR", 13), ...chunk("eXIf", 6), ...chunk("IEND", 0)])
    expect(pngHasExifChunk(png)).toBe(true)
  })
})

describe("buildCaption", () => {
  it("names the event, city, date and URL, with no counts or endorsement", () => {
    const caption = buildCaption("Build Day", "Nairobi", "5 Dec 2026", "https://www.claudekenya.org/events/build-day")
    expect(caption).toBe(
      "I'm attending Build Day in Nairobi on 5 Dec 2026, with Claude Community Kenya. https://www.claudekenya.org/events/build-day",
    )
    expect(caption.toLowerCase()).not.toMatch(/verified|official/)
  })
})
