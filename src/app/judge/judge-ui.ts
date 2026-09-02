/**
 * Shared class strings for the judge screens.
 *
 * The brief, the scorecard and the timer are read on the same phone, in the
 * same minute, by someone standing up — so they have to look like one product
 * rather than three screens that agree by coincidence. Declared once here so a
 * change to the body size or the card treatment cannot land on two of the
 * three.
 *
 * Two rules are encoded rather than remembered:
 *  - nothing smaller than `text-xs` (12px) appears on these screens;
 *  - anything tappable clears 44px.
 */

/** Mono label above a block. 12px is the floor, not a suggestion. */
export const EYEBROW = "font-mono text-xs uppercase tracking-wider text-text-dim"

/** Body copy. 15px because this is read at arm's length on a phone. */
export const BODY = "text-[15px] leading-relaxed text-text-secondary break-words"

/** The standard surface: one card, one team or one section. */
export const CARD = "rounded-lg border border-border-default bg-bg-secondary"

/** Card padding, tighter on a phone. */
export const CARD_PAD = "p-4 sm:p-5"

/** Minimum tap target — 44px, the smallest reliable thumb target. */
export const TAP = "min-h-11"

/** Visible keyboard focus without a permanent ring for mouse users. */
export const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-green-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"

/** A pill chip: filters, tracks, states. Tappable, so it clears 44px. */
export const CHIP = `${TAP} ${FOCUS_RING} shrink-0 rounded-lg border px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors`

/** Chip in its selected state. */
export const CHIP_ON = "border-green-primary bg-green-primary/15 text-green-primary"

/** Chip at rest. */
export const CHIP_OFF = "border-border-default bg-bg-card text-text-secondary"

/** The primary action: save, start, enter. Full width by default. */
export const PRIMARY_BUTTON = `w-full min-h-12 ${FOCUS_RING} rounded-lg border border-green-primary/40 bg-green-primary/10 px-4 font-mono text-sm uppercase tracking-wider text-green-primary transition-colors hover:bg-green-primary/20 disabled:opacity-50`

/** A quiet secondary action beside the primary one. */
export const GHOST_BUTTON = `${TAP} ${FOCUS_RING} rounded-lg border border-border-default px-3 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary transition-colors hover:border-green-primary/40 hover:text-green-primary`

/**
 * Height of the pitch timer when a team is open, in Tailwind's scale.
 *
 * The scorecard's action bar sits directly on top of the timer, so the two
 * agree on this number: the bar is pinned at `bottom-12` and the timer
 * collapses to `h-12`. Changing one without the other is how they overlap.
 */
export const TIMER_COMPACT_HEIGHT = "h-12"
