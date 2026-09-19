/**
 * Splits organiser-typed free text into the lines the rail renders.
 *
 * `groundRules` and `formatNote` come from a two-row admin textarea with no
 * format hint, so the same field arrives as one paragraph from one organiser
 * and a bulleted list from the next. Newlines win when present; a single
 * paragraph falls back to sentence boundaries. A naive split on "." would
 * shatter "e.g." and "4 p.m.", so the fallback only breaks after terminal
 * punctuation that is followed by whitespace and a capital or digit.
 */

/** A leading list marker an organiser may have typed: "- ", "* ", "• ", "1. ", "1) ". */
const LIST_MARKER = /^(?:[-*•]|\d{1,2}[.)])\s+/;

/** Sentence end: terminal punctuation, optional closing quote, then a capital or digit. */
const SENTENCE_BREAK = /(?<=[.!?]["')\]]?)\s+(?=[A-Z0-9"'(])/;

/** Newline-separated lines, markers stripped, blanks dropped. */
export function splitLines(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(LIST_MARKER, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * The rules as a list: one per line when the organiser wrote lines, one per
 * sentence when they wrote a paragraph.
 */
export function splitRules(text: string | null | undefined): string[] {
  const lines = splitLines(text);
  if (lines.length !== 1) return lines;
  return lines[0]
    .split(SENTENCE_BREAK)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
