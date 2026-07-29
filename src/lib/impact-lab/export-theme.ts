/**
 * Impact Lab results export — the shared visual language of the PDF.
 *
 * The palette is the community's "Pro" persona, which is deliberately the
 * Anthropic brand palette (see `globals.css` — persona-pro maps the site
 * tokens onto #141413 / #faf9f5 / #d97757 / #6a9bcc / #788c5d). So one set of
 * constants makes the document read as belonging to Claude Community Kenya
 * AND sit comfortably in front of Anthropic — they are the same colours.
 *
 * Every pairing here survives greyscale: ink/paper carry the text, CLAY sits
 * at a mid lightness clearly darker than TRACK, and no chart uses colour as
 * the only carrier of meaning — labels and position always travel with it.
 */

/** Near-black ink — Anthropic dark, and the Pro persona background token. */
export const INK = "#141413"
/** Warm paper — Anthropic light. Cover and callout fill. */
export const PAPER = "#faf9f5"
/** Primary accent (terracotta). The single data hue for magnitude. */
export const CLAY = "#d97757"
/** Darker clay for small text that must clear contrast on white. */
export const CLAY_DEEP = "#b45a3c"
/** Secondary accent — used sparingly, never as a second data hue. */
export const SLATE_BLUE = "#6a9bcc"
/** Tertiary accent — the community's green, print-safe. */
export const OLIVE = "#788c5d"
/** Secondary text. */
export const DIM = "#57554d"
/** Tertiary text — captions, page furniture. */
export const FAINT = "#8a887f"
/** Mid gray — Anthropic's secondary element tone. */
export const MID_GRAY = "#b0aea5"
/** Subtle fill — chart tracks, zebra tints. Anthropic light gray. */
export const TRACK = "#e8e6dc"
/** Hairlines. */
export const RULE = "#d6d4ca"
/** Warm tint for provenance callouts. */
export const CALLOUT_BG = "#f4efe6"
/**
 * Table row banding. Deliberately lighter than CALLOUT_BG so a zebra-striped
 * table never reads as loudly as a callout box sitting on the same page.
 */
export const ZEBRA = "#f5f3ec"

/** pdfkit built-in faces: serif display, sans text — no font files to ship. */
export const SERIF = "Times-Roman"
export const SERIF_ITALIC = "Times-Italic"
export const SANS = "Helvetica"
export const SANS_BOLD = "Helvetica-Bold"
export const SANS_ITALIC = "Helvetica-Oblique"
