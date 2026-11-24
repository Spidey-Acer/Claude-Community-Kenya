/**
 * Page kit tokens: the shared class strings every kit component uses, and
 * `PAIRINGS`, the foreground/background colour pairs the kit paints, as hex.
 *
 * Why hex here when the kit only ever writes Karibu utilities: the contrast
 * test (`__tests__/kit-contrast.test.ts`) needs real colours to measure. It
 * also checks each hex still appears in `globals.css`, so a token change that
 * is not mirrored here fails the test instead of drifting silently.
 *
 * Heading font: `.persona-pro h1,h2,h3` sets Fraunces and outranks the
 * `font-newsreader` utility (CLAUDE.md, Known Issues). Kit headings still carry
 * `font-newsreader` so they are correct the day that wart is fixed; non-heading
 * display text (dates, numerals) really does render Newsreader.
 */

export const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
export const EYEBROW = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";
export const H1 =
  "font-newsreader text-[38px] font-normal leading-[1.05] tracking-[-0.02em] text-ink sm:text-[48px] lg:text-[56px]";
export const H2 =
  "font-newsreader text-[30px] font-normal leading-[1.1] tracking-[-0.015em] text-ink sm:text-[38px]";
export const SUBHEAD = "font-newsreader text-[24px] font-medium text-ink";
export const LEAD = "font-inter text-[16px] leading-[1.6] text-ink-soft sm:text-[17px]";
export const META = "font-inter text-[13px] text-ink-muted";
export const BADGE = "rounded-full px-2.5 py-1 font-inter text-xs font-semibold";
export const BADGE_CLAY = `${BADGE} bg-paper-alt text-clay`;
export const BADGE_SAND = `${BADGE} bg-paper-alt text-ink-muted`;
export const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-full bg-band-bg px-6 py-3 font-inter text-[14.5px] font-semibold text-on-band transition-colors hover:bg-band-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2";
export const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-2 rounded-full border border-sand-2 px-6 py-3 font-inter text-[14.5px] font-semibold text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2";
/** Dark slab that stays dark in both themes (never `bg-ink`; see CLAUDE.md). */
export const PANEL_DARK = "rounded-[18px] bg-panel-dark text-on-panel-dark";
export const CARD =
  "group flex h-full flex-col overflow-hidden rounded-2xl border border-sand bg-paper-card transition-[transform,border-color] duration-150 ease-[var(--ease-reversible)] hover:-translate-y-1 hover:border-clay motion-reduce:transform-none motion-reduce:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2";

/**
 * Every text pair the kit paints, hex, listed for the light theme and again
 * for the dark theme. Text pairs must reach WCAG AA (4.5:1).
 */
export const PAIRINGS: Array<[fg: string, bg: string]> = [
  // Light theme
  ["#23201B", "#F4EEE3"], // ink on paper
  ["#23201B", "#FBF7F0"], // ink on paper-card
  ["#5C5349", "#F4EEE3"], // ink-soft on paper
  ["#5C5349", "#FBF7F0"], // ink-soft on paper-card
  ["#6A6155", "#F4EEE3"], // ink-muted on paper
  ["#6A6155", "#FBF7F0"], // ink-muted on paper-card
  ["#6A6155", "#EFE7D8"], // ink-muted on paper-alt (badge)
  ["#756a5c", "#F4EEE3"], // ink-faint on paper
  ["#756a5c", "#FBF7F0"], // ink-faint on paper-card
  ["#A84E2D", "#F4EEE3"], // clay on paper (eyebrow, links)
  ["#A84E2D", "#FBF7F0"], // clay on paper-card
  ["#A84E2D", "#EFE7D8"], // clay on paper-alt (badge)
  ["#FBF7F0", "#A84E2D"], // on-band on band-bg (primary button, both themes)
  ["#FBF7F0", "#8F4023"], // on-band on band-bg-hover (button hover, both themes)
  ["#A03024", "#FBF7F0"], // error on paper-card
  ["#E9E0D2", "#23201B"], // on-panel-dark on panel-dark
  ["#B4A997", "#23201B"], // on-panel-dark-muted on panel-dark
  ["#E6906F", "#23201B"], // clay-light on panel-dark
  // Dark theme
  ["#F4EEE3", "#1a1714"], // ink on paper
  ["#F4EEE3", "#221d17"], // ink on paper-card
  ["#C7BEB0", "#1a1714"], // ink-soft on paper
  ["#C7BEB0", "#221d17"], // ink-soft on paper-card
  ["#9a9082", "#1a1714"], // ink-muted on paper
  ["#9a9082", "#221d17"], // ink-muted on paper-card
  ["#9a9082", "#2a231b"], // ink-muted on paper-alt (badge)
  ["#8f8574", "#1a1714"], // ink-faint on paper
  ["#8f8574", "#221d17"], // ink-faint on paper-card
  ["#d2704a", "#1a1714"], // clay on paper
  ["#d2704a", "#221d17"], // clay on paper-card
  ["#d2704a", "#2a231b"], // clay on paper-alt (badge)
  ["#E28170", "#221d17"], // error on paper-card
  ["#E9E0D2", "#23201B"], // on-panel-dark on panel-dark (fixed, both themes)
  ["#B4A997", "#23201B"], // on-panel-dark-muted on panel-dark
  ["#E6906F", "#23201B"], // clay-light on panel-dark
];
