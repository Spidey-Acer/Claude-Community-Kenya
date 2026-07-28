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
/**
 * Tertiary text — captions, page furniture.
 *
 * Darkened from #8a887f, which rendered at 3.37:1 on PAPER, 3.10:1 on
 * CALLOUT_BG and 2.84:1 on TRACK — below WCAG AA at every size it is used
 * (7pt–8.5pt captions, axis labels and footers, never large text). #68665e
 * clears 4.5:1 on all three backdrops while staying visibly lighter than
 * DIM, so the INK > DIM > FAINT hierarchy is unchanged.
 */
export const FAINT = "#68665e"
/** Mid gray — Anthropic's secondary element tone. */
export const MID_GRAY = "#b0aea5"
/** Subtle fill — chart tracks, zebra tints. Anthropic light gray. */
export const TRACK = "#e8e6dc"
/** Hairlines. */
export const RULE = "#d6d4ca"
/** Warm tint for provenance callouts. */
export const CALLOUT_BG = "#f4efe6"

/** pdfkit built-in faces: serif display, sans text — no font files to ship. */
export const SERIF = "Times-Roman"
export const SERIF_ITALIC = "Times-Italic"
export const SANS = "Helvetica"
export const SANS_BOLD = "Helvetica-Bold"
export const SANS_ITALIC = "Helvetica-Oblique"
