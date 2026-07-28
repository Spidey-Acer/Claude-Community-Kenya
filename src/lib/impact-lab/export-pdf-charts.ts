/**
 * Impact Lab results export — vector chart primitives for the PDF.
 *
 * Pure pdfkit drawing: every function paints at a given (x, y, width) and
 * returns the height it consumed, so the document flow in `export-pdf` stays
 * in charge of pagination. No chart here manages its own page breaks.
 *
 * Honesty rules these primitives enforce by construction:
 * - Every scale starts at zero. There is no way to pass a truncated axis.
 * - Magnitude is always one hue (CLAY); identity is carried by labels and
 *   position, never by colour alone — the charts survive greyscale printing.
 * - Grid and axes are solid hairlines, one shade off the paper; the data is
 *   the darkest thing in the plot.
 */

import {
  CLAY,
  DIM,
  FAINT,
  INK,
  RULE,
  SANS,
  SANS_BOLD,
  TRACK,
} from "./export-theme"

type Doc = PDFKit.PDFDocument

const AXIS_FONT = 6.5
const LABEL_FONT = 7.5

// ─── Stat tiles ──────────────────────────────────────────────────────────────

export interface StatTile {
  value: string
  label: string
  /** Optional second line under the label, fainter. */
  sublabel?: string
}

/**
 * A row-wrapped grid of stat tiles — the "event in numbers" hero. Sans-serif
 * figures (a display face on a number reads as decoration), small-caps labels.
 */
export function drawStatTiles(
  doc: Doc,
  x: number,
  y: number,
  width: number,
  tiles: StatTile[],
  columns = 3
): number {
  const cellWidth = width / columns
  const rowHeight = 58
  tiles.forEach((tile, i) => {
    const cx = x + (i % columns) * cellWidth
    const cy = y + Math.floor(i / columns) * rowHeight
    doc.moveTo(cx, cy + 2).lineTo(cx, cy + rowHeight - 12).lineWidth(1.4).strokeColor(CLAY).stroke()
    doc.font(SANS_BOLD).fontSize(21).fillColor(INK).text(tile.value, cx + 10, cy, {
      width: cellWidth - 16,
      lineBreak: false,
    })
    doc
      .font(SANS)
      .fontSize(7)
      .fillColor(DIM)
      .text(tile.label.toUpperCase(), cx + 10, cy + 26, {
        width: cellWidth - 16,
        characterSpacing: 0.8,
      })
    if (tile.sublabel) {
      doc.font(SANS).fontSize(6.5).fillColor(FAINT).text(tile.sublabel, cx + 10, cy + 36, {
        width: cellWidth - 16,
      })
    }
  })
  return Math.ceil(tiles.length / columns) * rowHeight
}

// ─── Histogram ───────────────────────────────────────────────────────────────

export interface HistogramBin {
  label: string
  count: number
}

/**
 * Vertical histogram, zero-anchored, hairline grid, count above each non-empty
 * bar. Direct labels are the only value access in print, so they stay on.
 */
export function drawHistogram(
  doc: Doc,
  x: number,
  y: number,
  width: number,
  plotHeight: number,
  bins: HistogramBin[],
  options: { yLabel?: string } = {}
): number {
  const axisBand = 16
  const topPad = 12
  const maxCount = Math.max(1, ...bins.map((b) => b.count))
  const gap = 3
  const barWidth = (width - gap * (bins.length - 1)) / bins.length
  const baseline = y + topPad + plotHeight

  // Grid: solid hairlines at nice integer steps, labels in the left gutter.
  const step = maxCount <= 5 ? 1 : Math.ceil(maxCount / 4)
  for (let v = step; v <= maxCount; v += step) {
    const gy = baseline - (v / maxCount) * plotHeight
    doc.moveTo(x, gy).lineTo(x + width, gy).lineWidth(0.4).strokeColor(RULE).stroke()
    doc
      .font(SANS)
      .fontSize(AXIS_FONT)
      .fillColor(FAINT)
      .text(String(v), x - 14, gy - 2.5, { width: 11, align: "right", lineBreak: false })
  }

  bins.forEach((bin, i) => {
    const bx = x + i * (barWidth + gap)
    const h = (bin.count / maxCount) * plotHeight
    if (bin.count > 0) {
      // 1.5pt rounded data-end on a baseline-anchored bar.
      doc.roundedRect(bx, baseline - h, barWidth, h, Math.min(1.5, h / 2)).fillColor(CLAY).fill()
      doc
        .font(SANS_BOLD)
        .fontSize(AXIS_FONT)
        .fillColor(DIM)
        .text(String(bin.count), bx, baseline - h - 9, {
          width: barWidth,
          align: "center",
          lineBreak: false,
        })
    }
    doc
      .font(SANS)
      .fontSize(AXIS_FONT)
      .fillColor(FAINT)
      .text(bin.label, bx - gap / 2, baseline + 4, {
        width: barWidth + gap,
        align: "center",
        lineBreak: false,
      })
  })

  // Baseline axis — the zero line, slightly stronger than the grid.
  doc.moveTo(x, baseline).lineTo(x + width, baseline).lineWidth(0.8).strokeColor(DIM).stroke()

  if (options.yLabel) {
    doc
      .font(SANS)
      .fontSize(AXIS_FONT)
      .fillColor(FAINT)
      .text(options.yLabel, x, y, { width, lineBreak: false })
  }
  return topPad + plotHeight + axisBand
}

// ─── Horizontal bars ─────────────────────────────────────────────────────────

export interface HBarRow {
  label: string
  /** Fainter line under the label — e.g. "9 teams · 7 submitted". */
  sublabel?: string
  value: number
  /** Printed at the bar end — e.g. "62.4". */
  valueLabel: string
}

/**
 * Labelled horizontal bars on a shared zero-anchored scale with a full-length
 * track behind each bar, so "how far along the scale" is visible per row.
 */
export function drawHBars(
  doc: Doc,
  x: number,
  y: number,
  width: number,
  rows: HBarRow[],
  options: { max: number; labelWidth?: number; rowHeight?: number; scaleNote?: string }
): number {
  const labelWidth = options.labelWidth ?? 118
  const rowHeight = options.rowHeight ?? (rows.some((r) => r.sublabel) ? 26 : 18)
  const valueGutter = 30
  const barArea = width - labelWidth - valueGutter
  const barHeight = 7

  rows.forEach((row, i) => {
    const ry = y + i * rowHeight
    const barY = ry + (rowHeight - barHeight) / 2 - (row.sublabel ? 4 : 0)
    doc
      .font(SANS)
      .fontSize(LABEL_FONT)
      .fillColor(INK)
      .text(row.label, x, barY - 0.5, { width: labelWidth - 8, lineBreak: false, ellipsis: true })
    if (row.sublabel) {
      doc
        .font(SANS)
        .fontSize(6.5)
        .fillColor(FAINT)
        .text(row.sublabel, x, barY + 8.5, { width: labelWidth - 8, lineBreak: false })
    }
    // Track = the full scale; bar = the value. Both start at zero.
    doc.roundedRect(x + labelWidth, barY, barArea, barHeight, 1.5).fillColor(TRACK).fill()
    const w = Math.max(0, Math.min(1, row.value / options.max)) * barArea
    if (w > 0) {
      doc.roundedRect(x + labelWidth, barY, w, barHeight, Math.min(1.5, w / 2)).fillColor(CLAY).fill()
    }
    doc
      .font(SANS_BOLD)
      .fontSize(LABEL_FONT)
      .fillColor(DIM)
      .text(row.valueLabel, x + labelWidth + barArea + 4, barY - 0.5, {
        width: valueGutter - 4,
        lineBreak: false,
      })
  })

  let used = rows.length * rowHeight
  if (options.scaleNote) {
    doc
      .font(SANS)
      .fontSize(AXIS_FONT)
      .fillColor(FAINT)
      .text(options.scaleNote, x + labelWidth, y + used + 1, {
        width: barArea + valueGutter,
        lineBreak: false,
      })
    used += 10
  }
  return used
}

// ─── Dot strips (ranges on a fixed scale) ────────────────────────────────────

export interface DotRow {
  label: string
  sublabel?: string
  /** Individual values plotted as dots — e.g. each judge's total. */
  dots: number[]
}

/**
 * Rows of dots on a shared 0→max scale, with a band spanning each row's
 * low–high range. This is how the spread between judges is shown without
 * implying an ordering: position carries the value, the label the identity.
 */
export function drawDotRows(
  doc: Doc,
  x: number,
  y: number,
  width: number,
  rows: DotRow[],
  options: { max: number; labelWidth?: number; rowHeight?: number }
): number {
  const labelWidth = options.labelWidth ?? 118
  const rowHeight = options.rowHeight ?? 24
  const scaleWidth = width - labelWidth
  const scaleX = x + labelWidth
  const at = (v: number): number => scaleX + (Math.max(0, Math.min(options.max, v)) / options.max) * scaleWidth

  // Shared axis under all rows: ticks at quarters, labelled.
  const axisY = y + rows.length * rowHeight + 2
  doc.moveTo(scaleX, axisY).lineTo(scaleX + scaleWidth, axisY).lineWidth(0.6).strokeColor(RULE).stroke()
  for (let q = 0; q <= 4; q++) {
    const v = (options.max / 4) * q
    doc.moveTo(at(v), axisY).lineTo(at(v), axisY + 3).lineWidth(0.6).strokeColor(RULE).stroke()
    doc
      .font(SANS)
      .fontSize(AXIS_FONT)
      .fillColor(FAINT)
      .text(String(Math.round(v)), at(v) - 10, axisY + 5, {
        width: 20,
        align: "center",
        lineBreak: false,
      })
  }

  rows.forEach((row, i) => {
    const cy = y + i * rowHeight + rowHeight / 2 - 2
    doc
      .font(SANS)
      .fontSize(LABEL_FONT)
      .fillColor(INK)
      .text(row.label, x, cy - 8, { width: labelWidth - 8, lineBreak: false, ellipsis: true })
    if (row.sublabel) {
      doc
        .font(SANS)
        .fontSize(6.5)
        .fillColor(FAINT)
        .text(row.sublabel, x, cy + 1, { width: labelWidth - 8, lineBreak: false })
    }
    // Row guide: a hairline the dots sit on.
    doc.moveTo(scaleX, cy).lineTo(scaleX + scaleWidth, cy).lineWidth(0.4).strokeColor(TRACK).stroke()

    const sorted = [...row.dots].sort((a, b) => a - b)
    if (sorted.length > 1) {
      const low = at(sorted[0])
      const high = at(sorted[sorted.length - 1])
      doc.roundedRect(low, cy - 2.5, Math.max(high - low, 1), 5, 2.5).fillColor(TRACK).fill()
    }
    for (const v of sorted) {
      // 2px paper ring so overlapping dots stay countable.
      doc.circle(at(v), cy, 4).fillColor("#ffffff").fill()
      doc.circle(at(v), cy, 2.8).fillColor(CLAY).fill()
    }
  })

  return rows.length * rowHeight + 18
}
