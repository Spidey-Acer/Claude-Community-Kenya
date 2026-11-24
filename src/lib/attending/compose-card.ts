/**
 * Canvas renderer for the "I'm attending" card. Browser only, and deliberately
 * offline: this module makes no network calls, so the attendee's photo can
 * never leave the device through it (a test scans this file to keep it so).
 *
 * Flow: load fonts, decode the photo (orientation read from the file), draw
 * from the numbers in card-layout.ts, export a PNG. A canvas PNG carries no
 * EXIF; the export still checks for an eXIf chunk and refuses if one appears.
 */
import {
  CARD_COLOURS,
  CARD_SIZES,
  EYEBROW,
  WORDMARK,
  computeLayout,
  fitText,
  photoSourceRect,
  pngHasExifChunk,
  type CardContent,
  type CardLayout,
  type CardSize,
  type PhotoTransform,
  type TextSlot,
} from "./card-layout"

/** CSS font-family lists for the site's own fonts, read from the page. */
export interface CardFonts {
  display: string
  body: string
}

type Ctx = CanvasRenderingContext2D

const DISPLAY_WEIGHT = 600
const BODY_WEIGHT = 500

/** Waits for the fonts the card uses; canvas would draw a fallback face otherwise. */
export async function loadCardFonts(fonts: CardFonts): Promise<void> {
  await Promise.all([
    document.fonts.load(`${DISPLAY_WEIGHT} 48px ${fonts.display}`),
    document.fonts.load(`${BODY_WEIGHT} 28px ${fonts.body}`),
  ])
  await document.fonts.ready
}

/** Decodes a chosen photo with its EXIF orientation applied, so phone photos are not sideways. */
export function decodePhoto(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: "from-image" })
}

function drawSlotText(ctx: Ctx, slotSpec: TextSlot, text: string, family: string, weight: number): void {
  const measure = (value: string, fontPx: number) => {
    ctx.font = `${weight} ${fontPx}px ${family}`
    return ctx.measureText(value).width
  }
  const fitted = fitText(measure, text, slotSpec)
  ctx.font = `${weight} ${fitted.fontPx}px ${family}`
  ctx.textAlign = slotSpec.align
  fitted.lines.forEach((line, index) => {
    ctx.fillText(line, slotSpec.x, slotSpec.y + index * fitted.fontPx * slotSpec.lineHeight)
  })
}

function drawFrame(ctx: Ctx, layout: CardLayout): void {
  ctx.fillStyle = CARD_COLOURS.cream
  ctx.fillRect(0, 0, layout.width, layout.height)
  ctx.strokeStyle = CARD_COLOURS.ink
  ctx.lineWidth = layout.ruleWidth
  const inset = layout.ruleInset
  ctx.strokeRect(inset, inset, layout.width - inset * 2, layout.height - inset * 2)
}

function drawPhoto(ctx: Ctx, layout: CardLayout, photo: ImageBitmap | null, transform: PhotoTransform): void {
  const { cx, cy, radius, ringWidth } = layout.photo
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = CARD_COLOURS.cream
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
  if (photo) {
    const { sx, sy, side } = photoSourceRect(photo.width, photo.height, transform)
    ctx.drawImage(photo, sx, sy, side, side, cx - radius, cy - radius, radius * 2, radius * 2)
  }
  ctx.restore()
  ctx.beginPath()
  ctx.arc(cx, cy, radius + ringWidth / 2, 0, Math.PI * 2)
  ctx.strokeStyle = CARD_COLOURS.coral
  ctx.lineWidth = ringWidth
  ctx.stroke()
}

function drawFooter(ctx: Ctx, layout: CardLayout, content: CardContent, fonts: CardFonts): void {
  const band = layout.footerBand
  ctx.fillStyle = CARD_COLOURS.ink
  ctx.fillRect(band.x, band.y, band.width, band.height)
  ctx.fillStyle = CARD_COLOURS.cream
  drawSlotText(ctx, layout.footerUrl, content.eventUrl, fonts.body, BODY_WEIGHT)
  drawSlotText(ctx, layout.footerName, WORDMARK, fonts.body, BODY_WEIGHT)
}

/** Draws the whole card onto a canvas context already sized for `size`. */
export function drawCard(
  ctx: Ctx,
  size: CardSize,
  content: CardContent,
  fonts: CardFonts,
  photo: ImageBitmap | null,
  transform: PhotoTransform,
): void {
  const layout = computeLayout(size)
  ctx.textBaseline = "alphabetic"
  drawFrame(ctx, layout)
  ctx.fillStyle = CARD_COLOURS.ink
  drawSlotText(ctx, layout.wordmark, WORDMARK, fonts.display, DISPLAY_WEIGHT)
  ctx.fillStyle = CARD_COLOURS.coral
  drawSlotText(ctx, layout.eyebrow, EYEBROW, fonts.display, DISPLAY_WEIGHT)
  ctx.fillStyle = CARD_COLOURS.ink
  drawSlotText(ctx, layout.title, content.eventTitle, fonts.display, DISPLAY_WEIGHT)
  drawPhoto(ctx, layout, photo, transform)
  ctx.fillStyle = CARD_COLOURS.ink
  drawSlotText(ctx, layout.name, content.name, fonts.display, DISPLAY_WEIGHT)
  drawSlotText(ctx, layout.info, content.infoLine, fonts.body, BODY_WEIGHT)
  drawFooter(ctx, layout, content, fonts)
}

/** Draws the card on a fresh canvas and exports a PNG. Throws if the export carries EXIF. */
export async function renderCardBlob(
  size: CardSize,
  content: CardContent,
  fonts: CardFonts,
  photo: ImageBitmap | null,
  transform: PhotoTransform,
): Promise<Blob> {
  const canvas = document.createElement("canvas")
  canvas.width = CARD_SIZES[size].width
  canvas.height = CARD_SIZES[size].height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas is not available in this browser")
  drawCard(ctx, size, content, fonts, photo, transform)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
  if (!blob) throw new Error("Could not export the card")
  if (pngHasExifChunk(new Uint8Array(await blob.arrayBuffer()))) {
    throw new Error("Exported card carries metadata and was refused")
  }
  return blob
}
