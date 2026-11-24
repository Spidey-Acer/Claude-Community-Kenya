/**
 * Pure layout maths for the "I'm attending" card: sizes, colours, text slots,
 * text fitting and photo cropping. No DOM and no canvas here, so every rule is
 * unit-testable; compose-card.ts does the drawing from these numbers.
 *
 * Colours are the ambassador-kit values, fixed hex, so the image never follows
 * dark mode. Brand rules: the wordmark is plain text, the lockup is never
 * "Claude x ..." and the card carries no counts and no claim of endorsement.
 */

export type CardSize = "portrait" | "square"

/** Ambassador-kit palette. Do not recolour. */
export const CARD_COLOURS = {
  coral: "#D97757",
  ink: "#141413",
  cream: "#FAF9F5",
} as const

export const CARD_SIZES: Record<CardSize, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1350 },
  square: { width: 1080, height: 1080 },
}

/** Most characters allowed in the printed name. */
export const MAX_NAME_LENGTH = 40

export const WORDMARK = "Claude Community Kenya"
export const EYEBROW = "I'm attending"

export type TextAlign = "left" | "center" | "right"

/** Where a piece of text goes, and how far it may shrink to fit. */
export interface TextSlot {
  /** Anchor x: left edge, centre or right edge depending on `align`. */
  x: number
  /** Baseline of the first line. */
  y: number
  maxWidth: number
  align: TextAlign
  maxLines: number
  maxPx: number
  minPx: number
  lineHeight: number
}

export interface CardLayout {
  width: number
  height: number
  ruleInset: number
  ruleWidth: number
  wordmark: TextSlot
  eyebrow: TextSlot
  title: TextSlot
  photo: { cx: number; cy: number; radius: number; ringWidth: number }
  name: TextSlot
  info: TextSlot
  footerBand: { x: number; y: number; width: number; height: number }
  footerUrl: TextSlot
  footerName: TextSlot
}

const RULE_INSET = 40
const MARGIN = 96

function slot(partial: Partial<TextSlot> & Pick<TextSlot, "x" | "y" | "maxWidth" | "maxPx">): TextSlot {
  return { align: "left", maxLines: 1, minPx: 24, lineHeight: 1.15, ...partial }
}

function portraitLayout(): CardLayout {
  const { width, height } = CARD_SIZES.portrait
  const inner = width - MARGIN * 2
  return {
    width,
    height,
    ruleInset: RULE_INSET,
    ruleWidth: 3,
    wordmark: slot({ x: MARGIN, y: 130, maxWidth: inner, maxPx: 34, minPx: 28 }),
    eyebrow: slot({ x: MARGIN, y: 270, maxWidth: inner, maxPx: 104, minPx: 64 }),
    title: slot({ x: MARGIN, y: 360, maxWidth: inner, maxPx: 64, minPx: 36, maxLines: 2 }),
    photo: { cx: width / 2, cy: 760, radius: 230, ringWidth: 14 },
    name: slot({ x: width / 2, y: 1085, maxWidth: inner, maxPx: 76, minPx: 36, align: "center" }),
    info: slot({ x: width / 2, y: 1150, maxWidth: inner, maxPx: 32, minPx: 22, align: "center" }),
    footerBand: { x: RULE_INSET, y: 1210, width: width - RULE_INSET * 2, height: 100 },
    footerUrl: slot({ x: MARGIN, y: 1273, maxWidth: 560, maxPx: 26, minPx: 18 }),
    footerName: slot({ x: width - MARGIN, y: 1273, maxWidth: 320, maxPx: 26, minPx: 18, align: "right" }),
  }
}

function squareLayout(): CardLayout {
  const { width, height } = CARD_SIZES.square
  const textX = 580
  const textWidth = width - MARGIN - textX
  return {
    width,
    height,
    ruleInset: RULE_INSET,
    ruleWidth: 3,
    wordmark: slot({ x: textX, y: 130, maxWidth: textWidth, maxPx: 28, minPx: 22 }),
    eyebrow: slot({ x: textX, y: 235, maxWidth: textWidth, maxPx: 76, minPx: 48 }),
    title: slot({ x: textX, y: 310, maxWidth: textWidth, maxPx: 44, minPx: 26, maxLines: 2 }),
    photo: { cx: 100 + 200, cy: 500, radius: 200, ringWidth: 12 },
    name: slot({ x: textX, y: 560, maxWidth: textWidth, maxPx: 56, minPx: 28 }),
    info: slot({ x: textX, y: 620, maxWidth: textWidth, maxPx: 26, minPx: 18, maxLines: 2, lineHeight: 1.3 }),
    footerBand: { x: RULE_INSET, y: 940, width: width - RULE_INSET * 2, height: 100 },
    footerUrl: slot({ x: MARGIN, y: 1003, maxWidth: 560, maxPx: 24, minPx: 16 }),
    footerName: slot({ x: width - MARGIN, y: 1003, maxWidth: 320, maxPx: 24, minPx: 16, align: "right" }),
  }
}

/** The layout for a card size. */
export function computeLayout(size: CardSize): CardLayout {
  return size === "portrait" ? portraitLayout() : squareLayout()
}

export interface FittedText {
  fontPx: number
  lines: string[]
}

type MeasureFn = (text: string, fontPx: number) => number

/** Greedy word wrap at one font size. Over-long single words stay whole on their line. */
function wrapWords(measure: MeasureFn, text: string, fontPx: number, maxWidth: number): string[] {
  const lines: string[] = []
  let current = ""
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word
    if (current && measure(candidate, fontPx) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

/** Cuts a line with an ellipsis until it fits. */
function ellipsize(measure: MeasureFn, line: string, fontPx: number, maxWidth: number): string {
  let cut = line
  while (cut.length > 1 && measure(`${cut}…`, fontPx) > maxWidth) cut = cut.slice(0, -1).trimEnd()
  return `${cut}…`
}

/**
 * Largest font size (from `maxPx` down to `minPx`) at which `text` fits in
 * `maxLines` lines of `maxWidth`. At the minimum size the text is truncated
 * with an ellipsis rather than overflowing the card.
 */
export function fitText(measure: MeasureFn, text: string, slotSpec: TextSlot): FittedText {
  const { maxWidth, maxLines, maxPx, minPx } = slotSpec
  for (let fontPx = maxPx; fontPx >= minPx; fontPx -= 2) {
    const lines = wrapWords(measure, text, fontPx, maxWidth)
    const widest = Math.max(0, ...lines.map((line) => measure(line, fontPx)))
    if (lines.length <= maxLines && widest <= maxWidth) return { fontPx, lines }
  }
  const allLines = wrapWords(measure, text, minPx, maxWidth)
  const wasCut = allLines.length > maxLines
  const lines = allLines.slice(0, maxLines).map((line, index, kept) => {
    const isLastKept = index === kept.length - 1
    return (isLastKept && wasCut) || measure(line, minPx) > maxWidth
      ? ellipsize(measure, line, minPx, maxWidth)
      : line
  })
  return { fontPx: minPx, lines }
}

/** How the attendee has panned and zoomed their photo inside the circle. */
export interface PhotoTransform {
  /** 1 shows the largest centred square; larger values zoom in. */
  zoom: number
  /** -1 to 1 across the free room left/right of the crop. */
  panX: number
  /** -1 to 1 across the free room above/below the crop. */
  panY: number
}

export interface SourceRect {
  sx: number
  sy: number
  side: number
}

const MAX_ZOOM = 4

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

/** The square region of the photo that fills the circle. Always inside the image. */
export function photoSourceRect(imageWidth: number, imageHeight: number, transform: PhotoTransform): SourceRect {
  const zoom = clamp(transform.zoom, 1, MAX_ZOOM)
  const side = Math.min(imageWidth, imageHeight) / zoom
  const roomX = imageWidth - side
  const roomY = imageHeight - side
  const sx = roomX / 2 + (clamp(transform.panX, -1, 1) * roomX) / 2
  const sy = roomY / 2 + (clamp(transform.panY, -1, 1) * roomY) / 2
  return { sx, sy, side }
}

/** True when the PNG bytes contain an eXIf chunk. Used to refuse exporting metadata. */
export function pngHasExifChunk(bytes: Uint8Array): boolean {
  const PNG_SIGNATURE_LENGTH = 8
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = PNG_SIGNATURE_LENGTH
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset)
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8))
    if (type === "eXIf") return true
    offset += 12 + length
  }
  return false
}

export interface CardContent {
  eventTitle: string
  /** Printed name, at most MAX_NAME_LENGTH characters. */
  name: string
  /** Date, city and venue as one line, already formatted. */
  infoLine: string
  /** Public event page URL. */
  eventUrl: string
}

/** The caption the Copy caption button offers. */
export function buildCaption(eventTitle: string, city: string, dateLabel: string, eventUrl: string): string {
  return `I'm attending ${eventTitle} in ${city} on ${dateLabel}, with Claude Community Kenya. ${eventUrl}`
}
