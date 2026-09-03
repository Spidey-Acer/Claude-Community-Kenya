/**
 * Pure state helpers for the collapsible team-review cards in ResultsTab.
 *
 * Kept free of React so the open/closed semantics and the collapsed-header
 * excerpt can be unit-tested in vitest's node environment (the suite has no
 * DOM). Every function returns a new Set — React state must not be mutated.
 */

export type OpenSet = ReadonlySet<string>

/** Length of the one-line excerpt shown in a collapsed card's header. */
export const EXCERPT_MAX_CHARS = 140

/** Flip one card between open and closed. */
export function toggleOpen(open: OpenSet, id: string): OpenSet {
  const next = new Set(open)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/** Open every card in the list. */
export function expandAll(ids: readonly string[]): OpenSet {
  return new Set(ids)
}

/**
 * Close every card except the ones with unsaved edits.
 *
 * A card the organiser is mid-edit on is never hidden by a bulk action:
 * collapsing it would leave an unsaved textarea out of sight, and the next
 * "Collapse all" or navigation would lose the work without a trace.
 */
export function collapseAll(keepOpen: readonly string[]): OpenSet {
  return new Set(keepOpen)
}

/**
 * One line of the review for the collapsed header: whitespace collapsed,
 * cut at a word boundary just under the limit, dangling punctuation
 * trimmed, ellipsis appended. Returns "" for an empty review so the caller
 * can show its own placeholder.
 */
export function reviewExcerpt(text: string, max = EXCERPT_MAX_CHARS): string {
  const flat = text.replace(/\s+/g, " ").trim()
  if (flat.length <= max) return flat
  const window = flat.slice(0, max + 1)
  const lastSpace = window.lastIndexOf(" ")
  const cut = lastSpace > 0 ? window.slice(0, lastSpace) : flat.slice(0, max)
  return `${cut.replace(/[\s,;:.\-–—]+$/, "")}…`
}
