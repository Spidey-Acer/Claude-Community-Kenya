/**
 * Impact Lab team feedback — provenance and presentation rules.
 *
 * Pure and dependency-free (no Prisma, no Next) so the rules that decide what
 * words reach a team — and whose name those words carry — can be asserted by
 * a script (scripts/verify-reviews.ts).
 *
 * Two streams of feedback reach a team, and they must never blur:
 *
 * 1. **Judge's note** — words a judge actually wrote on their scoresheet,
 *    quoted with only spelling/casing corrected, shown under that judge's
 *    name. Only one judge (Favour) wrote any; her notes appear only on the
 *    teams she noted.
 * 2. **Impact Lab review** — a substantive written review of the team's own
 *    submission, signed "Claude Community Kenya". It is the community's
 *    feedback and is labelled as exactly that, everywhere it appears. It is
 *    never attributed to, or presented alongside anything implying, a judge.
 *
 * The hard rule this module exists to enforce: never attribute written words
 * to a judge who did not write them.
 */

/** Who the community review is signed by, on every surface. */
export const REVIEW_SIGNATURE = "Claude Community Kenya"

/**
 * The provenance line shown with every published review. One string, used by
 * the dashboard, the results email, and the PDF/Excel exports, so no surface
 * can quietly soften it.
 */
export const REVIEW_PROVENANCE =
  "Written by the Claude Community Kenya team after reading your submission — this is the community's review, not a judge's."

// ─── Judge notes ─────────────────────────────────────────────────────────────

/**
 * Spelling/casing corrections to the notes one judge (Favour) wrote by hand
 * on her scoresheets, applied at render time so the stored record stays
 * verbatim. Keyed on the exact stored text: only a note we have audited is
 * ever altered, and only in the ways listed here — spelling and sentence
 * casing, never a word added, removed, or reworded. Anything not in this
 * table is shown exactly as the judge wrote it.
 *
 * `null` marks a note that is omitted entirely: the stored text "Please" is
 * a fragment — she was clearly interrupted mid-sentence — and publishing a
 * fragment under her name would misrepresent her more than saying nothing.
 */
const NOTE_CORRECTIONS = new Map<string, string | null>([
  [
    "Build in programatic access and after you're live get a data protection certificate",
    "Build in programmatic access and after you're live get a data protection certificate",
  ],
  ["Brillant\nPlease pilot it", "Brilliant\nPlease pilot it"],
  [
    "Brilliant product\nFocus on what you've built and share it",
    "Brilliant product\nFocus on what you've built and share it",
  ],
  ["Please talk to some medics", "Please talk to some medics"],
  ["Create a chrome extension or mobile app", "Create a Chrome extension or mobile app"],
  ["Please pilot!!!", "Please pilot!!!"],
  ["Please build in the Product", "Please build in the product"],
  ["Please", null],
  ["Use images and a chat partner instead", "Use images and a chat partner instead"],
  ["Please talk to businesses and investors", "Please talk to businesses and investors"],
])

/**
 * A judge's stored note as it may be shown to the team, or `null` when
 * nothing should be shown (empty, whitespace, or an audited fragment).
 *
 * Normalises line endings and trims before lookup so the correction table
 * matches however the text was keyed in on the night.
 */
export function presentableJudgeNote(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null
  const normalised = raw.replace(/\r\n/g, "\n").trim()
  if (normalised === "") return null
  const corrected = NOTE_CORRECTIONS.get(normalised)
  if (corrected !== undefined) return corrected
  // A note we have not audited is still the judge's own words — verbatim is
  // always safe to attribute. Only audited corrections ever alter text.
  return normalised
}

/** A judge's note as attached to a member payload or an email. */
export interface TeamJudgeNote {
  judgeName: string
  text: string
}

// ─── Community reviews ───────────────────────────────────────────────────────

/** The subset of an ImpactLabTeamReview row the publish gate needs. */
export interface ReviewGateInput {
  text: string
  approvedAt: Date | string | null
}

/**
 * The review text as it may reach a participant, or `null` when it may not.
 *
 * This is THE publish gate: every surface that shows a review to anyone
 * outside the admin panel (dashboard, results email, exports) must go
 * through it. An unapproved draft — however good — never leaves the admin
 * panel, because the organiser has not read it yet.
 */
export function publishableReview(review: ReviewGateInput | null | undefined): string | null {
  if (!review) return null
  if (!review.approvedAt) return null
  const text = review.text.trim()
  return text === "" ? null : text
}
