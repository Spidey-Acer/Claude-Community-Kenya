/**
 * Impact Lab results export - data assembly.
 *
 * Pure and dependency-free (no Prisma, no Next, no exceljs/pdfkit) so the
 * joins that decide what the archived record says can be asserted with
 * fixtures. The Excel and PDF builders both render from the `ResultsExport`
 * this module produces, so the two artefacts cannot disagree with each other.
 *
 * Two honesty rules the whole export hangs on:
 *
 * 1. The published placing is NOT the score order. The judging panel
 *    deliberated and announced winners; the raw averages disagree. Every rank
 *    shown carries its basis ("announced" vs score order), and both orderings
 *    are presented as what they are - never one silently dressed as the other.
 * 2. Some teams were scored from their written submission because no judge
 *    reached their table. That basis travels with the score wherever the
 *    score appears. It is a note about how the score was produced, never an
 *    implication that the team failed to present.
 */

import {
  resolveTeamTrack,
  scoreTotal,
  standings,
  trackLabelIndex,
  trackWinners,
  type JudgingRubric,
  type ScoreSheet,
} from "./judging"
import {
  buildTrackWinners,
  type RankedTeam,
  type ResultsSnapshot,
  type ResultsTrackWinner,
} from "./results"
import { teamPlaceLabel } from "./result-card"

// ─── Source rows (what the loader hands in) ──────────────────────────────────

/** A team as frozen in the final run's `result` JSON. */
export interface SourceTeam {
  id: string
  name: string
  memberIds: string[]
  leaderId?: string | null
  /**
   * An organiser-assigned track, frozen into the run's `result` JSON (e.g.
   * backfilled from a registration file). Absent for cohorts (like July)
   * that only ever encoded the track in the name. See `resolveTeamTrack` for
   * how this, `trackKey` and the name are prioritised against each other.
   */
  track?: string
  /**
   * The track the matcher actually built this team into - `Team.trackKey`
   * from the run's frozen result. Wins over `track` and the name when
   * present: it is what the team was judged as, not a label backfilled after
   * the fact. See `resolveTeamTrack`.
   */
  trackKey?: string
  /**
   * The venue's physical table number (see `member.ts`'s `FrozenTeam`), or
   * absent/null on a run saved before tables existed. Feeds `teamPlaceLabel`
   * for `tableLabel` below - without it, a team named "Table 30 · Breakthrough"
   * has nothing to parse the table number back out of.
   */
  table?: number | null
}

export interface SourceParticipant {
  id: string
  fullName: string
  email: string
  primaryRole: string
  institution: string | null
  checkedIn: boolean
}

export interface SourceSubmission {
  teamId: string
  projectName: string
  pitch: string
  problemTackled: string
  description: string
  worksVsMocked: string
  claudeUsage: string
  repoUrl: string
  demoUrl: string | null
  videoUrl: string | null
  slidesUrl: string | null
}

export interface SourceScore {
  teamId: string
  judgeEmail: string
  judgeName: string
  sheet: ScoreSheet
  feedback: string | null
  writeupOnly: boolean
}

/**
 * An APPROVED community review for one team - the organiser-read text that
 * also reaches the team's dashboard and results email. The loader must gate
 * rows through `publishableReview` (@/lib/impact-lab/reviews) before handing
 * them in; an unapproved draft never enters an artefact that leaves the
 * building. Where a team has one of these, it is the canonical written text
 * about that project - any machine-written fallback analysis must be skipped
 * for that team, and the two must never share a label (this is the
 * community's signed feedback; an analysis is not).
 */
export interface SourceReview {
  teamId: string
  text: string
}

export interface ExportSource {
  cohort: string
  publishedAt: string | null
  snapshot: ResultsSnapshot | null
  teams: SourceTeam[]
  participants: SourceParticipant[]
  submissions: SourceSubmission[]
  scores: SourceScore[]
  /** Approved community reviews only - see SourceReview. */
  reviews: SourceReview[]
  /**
   * The event's declared tracks, for resolving a team's `trackKey` to its
   * label (see `resolveTeamTrack`). Defaults to `[]` - an event with no
   * tracks configured, or a caller that has not loaded them, still gets a
   * team's raw `trackKey` (or `track`, or a name-parse) rather than a
   * missing field.
   */
  tracks?: readonly { key: string; label: string }[]
}

// ─── Assembled export ────────────────────────────────────────────────────────

export interface ExportMember {
  fullName: string
  email: string
  primaryRole: string
  institution: string | null
  isLeader: boolean
  checkedIn: boolean
}

export interface ExportJudgeScore {
  judgeName: string
  judgeEmail: string
  /** Raw 1–5 by criterion key; null where the judge left a criterion blank. */
  criteria: Record<string, number | null>
  /** This judge's weighted total /100 - `weightedTotal`, never re-derived. */
  weightedTotal: number
  /** True when scored from the written submission, not a live demo. */
  writeupOnly: boolean
  feedback: string | null
}

export type ExportSubmission = Omit<SourceSubmission, "teamId">

/** How a team's shown placing was arrived at. Mirrors `ResultBasis`. */
export type PlacingBasis = "announced" | "demo" | "submission"

export interface ExportTeam {
  teamId: string
  teamName: string
  /**
   * The project name to print. Falls back to the team name when the
   * submission's project name is blank - an optional field some teams left
   * empty. The single place every renderer must call instead of reading
   * `submission?.projectName` itself, so a blank field can never surface as
   * a blank heading, contents entry, or table cell.
   */
  projectDisplayName: string
  /**
   * "Table 12" (or the team's full name when no table number was recorded)
   * for the table column - `teamPlaceLabel`, so a name like "Table 30 ·
   * Breakthrough" prints just the table, not the whole name wrapped into a
   * narrow column.
   */
  tableLabel: string
  track: string
  members: ExportMember[]
  submission: ExportSubmission | null
  judgeScores: ExportJudgeScore[]
  /** Mean of judges' weighted totals /100. Null when never scored. */
  average: number | null
  /** Lowest judge's weighted total /100. Null when never scored. */
  scoreLow: number | null
  /** Highest judge's weighted total /100. Null when never scored. */
  scoreHigh: number | null
  judgeCount: number
  /** Per-criterion mean of the raw 1–5 scores. Empty when never scored. */
  criterionAverages: Record<string, number>
  /**
   * The published placing (announced winners first, then score order), from
   * the immutable `resultsSnapshot`. Null before publication or for teams
   * outside the published ranking.
   */
  finalRank: number | null
  /**
   * Basis of `finalRank` - "announced" for the panel's overall podium picks.
   * Only ever set in `"podium"` announcement mode: `"tracks"` mode has no
   * overall podium, so the full ranking there is pure score order and this
   * is always "demo" or "submission" (see `ResultsExport.announcementMode`
   * and `results.ts`'s `buildRanking`). A track-winner placing is carried by
   * `isTrackWinner` instead, never by this field.
   */
  finalRankBasis: PlacingBasis | null
  /** Position by raw weighted average alone. Null when never scored. */
  scoreRank: number | null
  /** True when every score this team holds came from its written submission. */
  scoredFromWriteup: boolean
  isTrackWinner: boolean
  isChampion: boolean
  /**
   * The approved community review, signed "Claude Community Kenya", or null
   * when none is approved yet. When present this is the canonical written
   * text about the project in both artefacts.
   */
  communityReview: string | null
  /**
   * An organiser-written commendation for this team, or `null` when none was
   * recorded. Sourced from the published snapshot's optional `commendations`
   * map (teamId to text) - see `ResultsSnapshot.commendations`. Entering one
   * is a separate admin-UI concern; this module only carries it through.
   */
  commendation: string | null
}

export interface ExportWinner {
  rank: number
  teamName: string
  projectName: string
}

export interface ExportTrackWinner {
  track: string
  teamName: string
  projectName: string
  /** Mirrors `ResultsTrackWinner["basis"]` - see that type for what each means. */
  basis: ResultsTrackWinner["basis"]
}

/** One judge's footprint across the night - coverage, not judgement. */
export interface ExportJudgeSummary {
  judgeName: string
  judgeEmail: string
  /** Total scorecards this judge recorded. */
  sheets: number
  liveSheets: number
  writeupSheets: number
  /** Scorecards on which this judge left a written note. */
  feedbackCount: number
  /** Mean of this judge's weighted totals /100 - how they used the scale. */
  meanWeightedTotal: number
}

/** One track's shape: participation, outcome, and who led it. */
export interface ExportTrackSummary {
  track: string
  teamsFormed: number
  teamsSubmitted: number
  teamsScored: number
  /** Mean of scored teams' averages /100. Null when nothing was scored. */
  meanAverage: number | null
  winnerTeamName: string | null
  winnerProjectName: string | null
  winnerBasis: ResultsTrackWinner["basis"] | null
}

/** How many scored teams were seen by exactly `judgeCount` judges. */
export interface ExportCoverageBucket {
  judgeCount: number
  teams: number
}

export interface ExportSummary {
  participantsRegistered: number
  participantsCheckedIn: number
  /**
   * An organiser-supplied check-in count, when it was given AND disagrees
   * with `participantsCheckedIn` (see `buildResultsExport`'s `checkedInRecorded`
   * option). Null means no override - the system count is the only figure,
   * exactly as before this field existed. Never silently replaces
   * `participantsCheckedIn`; both are kept when both exist.
   */
  participantsCheckedInRecorded: number | null
  teamsFormed: number
  teamsSubmitted: number
  teamsScored: number
  teamsScoredFromWriteup: number
  judges: number
  scorecards: number
  /** Mean of team averages across scored teams, /100. Null if none scored. */
  meanTeamAverage: number | null
  tracks: number
}

/**
 * Whether the check-in figure this export prints is an organiser's own
 * recorded count (e.g. a door count read off Luma) rather than the site's
 * own self-service check-ins. Two systems ran at once at AI Mashinani 02 and
 * neither saw everyone in the room - the site only counts someone who
 * tapped its own check-in link, so without an override its count is real
 * but partial. Shared by both the PDF and Excel builders so a check-in
 * figure is never printed as plain attendance unless an organiser actually
 * recorded it.
 */
export function checkedInIsRecorded(summary: ExportSummary): boolean {
  return summary.participantsCheckedInRecorded !== null
}

export interface ResultsExport {
  cohort: string
  generatedAt: Date
  /**
   * The rubric this cohort was judged on. Carried on the export itself so the
   * Excel and PDF renderers never fall back to a hardcoded default - every
   * criteria loop, column count, and denominator in this document is driven
   * by this rubric, not by the Impact Lab constant.
   */
  rubric: JudgingRubric
  /** Whether the announced result has been published (snapshot present). */
  published: boolean
  publishedAt: string | null
  /**
   * `"podium"` (an overall podium was announced), `"tracks"` (one winner per
   * track, no overall podium), or `"champion"` (one overall champion AND a
   * winner for one or more tracks, announced together) - from the stored
   * snapshot's own field, defaulting to `"podium"` before publication or for
   * a snapshot published before this field existed. Drives every renderer
   * decision between "the winners" (podium), "the track winners" (tracks),
   * and "the champion" (champion) in the PDF and Excel.
   */
  announcementMode: "podium" | "tracks" | "champion"
  /** The podium as announced in the room. Empty before publication or in `"tracks"` mode - there is no podium. */
  announced: ExportWinner[]
  trackWinners: ExportTrackWinner[]
  /** Ordered: published placing first, then score order, then name. */
  teams: ExportTeam[]
  /** Cohort participants who ended up on no frozen team. */
  unassignedParticipants: ExportMember[]
  /** One row per judge, ordered by sheet count descending then name. */
  judgeSummaries: ExportJudgeSummary[]
  /** One row per track, ordered by track name. */
  trackSummaries: ExportTrackSummary[]
  /** Coverage distribution over scored teams, ordered by judge count. */
  coverage: ExportCoverageBucket[]
  summary: ExportSummary
}

// ─── Snapshot guard ──────────────────────────────────────────────────────────

/**
 * Structural guard over the stored `resultsSnapshot` JSON. Like
 * `extractFrozenTeams`, a drifted or legacy shape degrades to "not published"
 * rather than throwing halfway through generating a file.
 */
export function parseResultsSnapshot(value: unknown): ResultsSnapshot | null {
  if (typeof value !== "object" || value === null) return null
  const snap = value as Partial<ResultsSnapshot>
  if (typeof snap.publishedAt !== "string") return null
  if (!Array.isArray(snap.overall) || !Array.isArray(snap.ranking)) return null
  if (!Array.isArray(snap.trackWinners)) return null
  const rowsOk = snap.ranking.every(
    (row: unknown) =>
      typeof row === "object" &&
      row !== null &&
      typeof (row as RankedTeam).teamId === "string" &&
      typeof (row as RankedTeam).rank === "number"
  )
  return rowsOk ? (snap as ResultsSnapshot) : null
}

// ─── Assembly ────────────────────────────────────────────────────────────────

/**
 * "Table 12 - Kilimo" → "Table 12" (splits on an em dash, en dash, or plain
 * hyphen). Superseded by `teamPlaceLabel` for `tableLabel` below, which also
 * handles a name with no dash at all ("Table 30 · Breakthrough") - kept here
 * for a caller with only a name and no table number.
 */
// Em dash, en dash, hyphen - built from char codes, not literal characters,
// so this file's own source carries no em dash (see the export's own
// zero-em-dash rule, enforced by grepping this directory).
const NAME_HEAD_SEPARATORS = new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}-]`)

export function tableLabelOf(teamName: string): string {
  const head = teamName.split(NAME_HEAD_SEPARATORS)[0]?.trim()
  return head || teamName
}

const TRAILING_NUMBER = /^(.*?)(\d+)$/

/**
 * Sorts items by the trailing integer in their label when every label in
 * the list shares the same non-numeric prefix - "Table 5", "Table 33" reads
 * as 5, 33, not the "…33 · …5 · …7" a plain string sort produces. Falls back
 * to `localeCompare` on the full label otherwise: team names are not always
 * "Table N" (other cohorts use real project or team names), and a
 * trailing-number sort applied to those would be meaningless at best.
 */
export function sortByTrailingNumber<T>(items: readonly T[], labelOf: (item: T) => string): T[] {
  const labels = items.map(labelOf)
  const matches = labels.map((label) => label.match(TRAILING_NUMBER))
  const prefix = matches[0]?.[1]
  const sameShape =
    items.length > 0 && matches.every((m): m is RegExpMatchArray => m !== null && m[1] === prefix)

  const sorted = [...items]
  if (sameShape) {
    sorted.sort(
      (a, b) =>
        Number(labelOf(a).match(TRAILING_NUMBER)![2]) -
        Number(labelOf(b).match(TRAILING_NUMBER)![2])
    )
  } else {
    sorted.sort((a, b) => labelOf(a).localeCompare(labelOf(b)))
  }
  return sorted
}

// ─── Prose hygiene ───────────────────────────────────────────────────────────

/**
 * Zero-width and control characters stripped from every free-text field
 * before it reaches either exporter - `\n` and `\t` are the only control
 * characters a document should ever carry, and a zero-width character is
 * invisible in the source and in the rendered page alike, so there is no
 * honest reason to keep one.
 *
 * Built from char codes, not literal `\u` escapes in a regex literal or
 * literal invisible characters: either survives a copy-paste round trip
 * looking identical while silently changing what the regex matches.
 */
const ZERO_WIDTH_AND_CONTROL_CODES = [
  0x200b, 0x200c, 0x200d, 0xfeff, // zero-width space/non-joiner/joiner, BOM
  0xfffd, // replacement character - what a decoder substitutes for invalid bytes; never an honest glyph
  0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, // C0 controls before \t
  0x0b, 0x0c, // vertical tab, form feed (between \t=0x09 and \n=0x0A's neighbours)
  0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, // C0 controls after \n
  0x7f, // DEL
  // C1 controls (U+0080-U+009F) - the high-byte counterpart of the C0 block
  // above, built as a range rather than 32 individual entries.
  ...Array.from({ length: 0x9f - 0x80 + 1 }, (_, i) => 0x80 + i),
]
const ZERO_WIDTH_AND_CONTROL = new RegExp(
  `[${ZERO_WIDTH_AND_CONTROL_CODES.map((code) => String.fromCharCode(code)).join("")}]`,
  "g"
)

/**
 * A run of box-drawing / block-element glyphs (U+2500..U+259F), optionally
 * surrounded by spaces or tabs - an organiser's paste sometimes carries one
 * as an ad hoc paragraph separator ("▎"), and pdfkit's embedded fonts have
 * no glyph for it, printing a garbled "%Ž"-shaped artefact instead. Replaced
 * by a newline in `cleanProse`; the following 3-or-more-newlines collapse
 * then folds any resulting run down to a single blank-line paragraph break.
 * Built from a hex escape, not a literal character, same reasoning as
 * `ZERO_WIDTH_AND_CONTROL_CODES` above. Does not touch "•" (U+2022, outside
 * this range) or ordinary punctuation.
 */
const BLOCK_ELEMENT_RUN = /[ \t]*[─-▟]+[ \t]*/g

/**
 * Normalises one free-text field (pitch, problem, description, works-vs-
 * mocked, AI usage, judge feedback, reviews) before it reaches either
 * exporter. Windows line endings reach this system from participants typing
 * in a browser on Windows - pdfkit's WinAnsi encoding has no glyph for a bare
 * `\r`, so an un-normalised `\r\n` printed a "%Ž"-shaped artefact wherever a
 * team's own line break survived into the PDF.
 *
 * - `\r\n` and lone `\r` become `\n` - the one line-break character every
 *   downstream renderer (pdfkit, exceljs) actually understands.
 * - U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR) - characters a
 *   rich-text paste can carry - become `\n` too, for the same reason.
 * - Zero-width and control characters are stripped outright (see
 *   `ZERO_WIDTH_AND_CONTROL`).
 * - Three or more consecutive newlines collapse to two - one blank line
 *   reads as a paragraph break; a wall of them is not a second fact.
 * - Leading/trailing whitespace is trimmed.
 */
const LINE_AND_PARAGRAPH_SEPARATORS = new RegExp(
  `[${String.fromCharCode(0x2028, 0x2029)}]`,
  "g"
)

export function cleanProse(text: string): string {
  return text
    .replace(LINE_AND_PARAGRAPH_SEPARATORS, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(ZERO_WIDTH_AND_CONTROL, "")
    .replace(BLOCK_ELEMENT_RUN, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** A line-start bullet marker: "* ", "- ", "+ ", or "1. " / "2. " etc. */
const BULLET_LINE = /^\s{0,3}(?:[*+-]|\d+\.)\s+(.*)$/
/** A line-start ATX heading marker: "#" through "######". */
const HEADING_LINE = /^\s{0,3}#{1,6}\s+(.*)$/

/**
 * Strips inline markdown emphasis, inline code, and links from one line of
 * already-cleaned prose, keeping the words. `[text](url)` becomes
 * "text (url)" - a reader of a printed page or a spreadsheet cell cannot
 * click a link, so the URL is kept in parentheses rather than dropped.
 * Bold/italic/code markers are removed outright - this document's renderers
 * do not carry inline bold runs, so "keeping" `**bold**` styling is not an
 * option; the words are what must survive.
 *
 * Deliberately tolerant of unbalanced markdown - a dictated or pasted
 * submission sometimes drops a closing marker ("**Mitral Valve*", a lone
 * trailing "**"), and a half-stripped marker left in the output is worse
 * than an aggressively stripped one. So bold/underscore-bold and backtick
 * markers are removed wherever they occur, paired or not, rather than only
 * inside a matched `**...**` / `` `...` `` pair; the same reasoning then
 * applies to a single `*` or `_` sitting at a word's edge (its opening or
 * closing position - "*Aorta" or "Valve*"). "Inside a word" is the one case
 * left alone, so `snake_case` and `2*3` still survive untouched.
 */
function stripInlineMarkdown(line: string): string {
  return (
    line
      // Links: [text](url) -> text (url). Matched before emphasis so a link
      // label written in bold, e.g. [**docs**](url), is not stripped by the
      // link pass into a bare "docs](url)".
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1 ($2)")
      // Bold / double-underscore emphasis markers - every "**" or "__" run,
      // whether or not it pairs with a matching close.
      .replace(/\*\*/g, "")
      .replace(/__/g, "")
      // Inline code backticks - every backtick, paired or not.
      .replace(/`/g, "")
      // A single "*" or "_" that opens a token (preceded by a non-word
      // character or the start of the line, followed by a word character)...
      .replace(/(?<![\w*_])[*_](?=\w)/g, "")
      // ...or closes one (preceded by a word character, followed by a
      // non-word character or the end of the line). Split into two passes,
      // rather than one lookaround covering both edges, so a single-word
      // token like "*Aorta*" strips both its markers correctly.
      .replace(/(?<=\w)[*_](?![\w*_])/g, "")
  )
}

/** One line of prose, already markdown-stripped, and how it should render. */
export interface ProseLine {
  /** "bullet" for a line that opened with a list marker; "paragraph" otherwise. */
  type: "paragraph" | "bullet"
  text: string
}

/**
 * Parses cleaned free text into lines a renderer can act on: a bullet line
 * (list markers stripped, `text` is the item's own words) or a paragraph
 * line (heading markers stripped the same way - this document has no
 * sub-heading typography inside a free-text field, so a heading's words
 * simply become a paragraph line). Blank lines are kept as empty paragraph
 * lines so a blank-line paragraph break survives into the rendered output
 * exactly as `cleanProse` left it.
 *
 * Shared by both exporters (see the module doc comment): the PDF renders a
 * bullet line as a real bulleted line; the Excel builder (`markdownToPlainText`)
 * flattens every bullet to a "• " line instead.
 */
export function parseProseLines(text: string): ProseLine[] {
  const cleaned = cleanProse(text)
  if (cleaned === "") return []
  return cleaned.split("\n").map((rawLine): ProseLine => {
    if (rawLine.trim() === "") return { type: "paragraph", text: "" }
    const bullet = rawLine.match(BULLET_LINE)
    if (bullet) return { type: "bullet", text: stripInlineMarkdown(bullet[1].trim()) }
    const heading = rawLine.match(HEADING_LINE)
    if (heading) return { type: "paragraph", text: stripInlineMarkdown(heading[1].trim()) }
    return { type: "paragraph", text: stripInlineMarkdown(rawLine) }
  })
}

/**
 * Flattens cleaned free text to plain text for a context with no structured
 * rendering (the Excel cell) - every bullet becomes its own "• " line, every
 * markdown marker is gone, and a link reads as "text (url)". Excel's own
 * wrapped cell already reflows this like any other multi-line string.
 */
export function markdownToPlainText(text: string): string {
  return parseProseLines(text)
    .map((line) => (line.type === "bullet" ? `• ${line.text}` : line.text))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * Render-time display casing for a raw participant name. Registration data
 * holds names typed however the person happened to type them ("simon",
 * "christian ng'ang'a") - this fixes the one shape that is safe to fix
 * without guessing: a token typed ENTIRELY lowercase gets its first
 * character upper-cased. Any other token - "Ge0frey", "Blu Chips",
 * "O'Donnell", "McArthur", "Pompompurin" - is left completely untouched,
 * because "entirely lowercase" is the only signal honest enough to act on;
 * anything with a capital already in it, or none of the letters a name has
 * at all, is a name we do not get to correct.
 *
 * Render time only - never mutates the stored value, and never applied to
 * the Excel workbook, which is the operational record and must show what
 * was actually typed.
 */
export function formatDisplayName(name: string): string {
  return name
    .split(/(\s+)/)
    .map((token) => {
      if (/^\s*$/.test(token)) return token
      const isEntirelyLowercase = token === token.toLowerCase() && token !== token.toUpperCase()
      if (!isEntirelyLowercase) return token
      return token.charAt(0).toUpperCase() + token.slice(1)
    })
    .join("")
}

function toMember(p: SourceParticipant, leaderId: string | null | undefined): ExportMember {
  return {
    fullName: p.fullName,
    email: p.email,
    primaryRole: p.primaryRole,
    institution: p.institution,
    isLeader: p.id === leaderId,
    checkedIn: p.checkedIn,
  }
}

function toJudgeScore(score: SourceScore, rubric: JudgingRubric): ExportJudgeScore {
  const criteria: Record<string, number | null> = {}
  for (const criterion of rubric.criteria) {
    const raw = score.sheet[criterion.key]
    criteria[criterion.key] =
      typeof raw === "number" && !Number.isNaN(raw) ? raw : null
  }
  const cleanedFeedback = score.feedback ? cleanProse(score.feedback) : ""
  return {
    judgeName: score.judgeName,
    judgeEmail: score.judgeEmail,
    criteria,
    weightedTotal: scoreTotal(score.sheet, rubric),
    writeupOnly: score.writeupOnly,
    feedback: cleanedFeedback === "" ? null : cleanedFeedback,
  }
}

/**
 * Assemble everything the Excel and PDF builders render.
 *
 * All ranking arithmetic is `standings`/`scoreTotal`/`trackWinners` from
 * `./judging` - this module joins and labels, it never re-derives a number
 * that decides who won. `rubric` must be the one this cohort was actually
 * judged on (resolve it with `resolveRubric` before calling this - it stays
 * pure and dependency-free, like `./judging`, so the caller owns the DB
 * lookup) or every criterion, total, and ranking below is scored against the
 * wrong event.
 */
export function buildResultsExport(
  source: ExportSource,
  rubric: JudgingRubric,
  now: Date = new Date(),
  options: {
    /**
     * An organiser-recorded check-in count (e.g. from Luma) that disagrees
     * with the system's own count. See `ExportSummary.participantsCheckedInRecorded`.
     */
    checkedInRecorded?: number
  } = {}
): ResultsExport {
  const participantById = new Map(source.participants.map((p) => [p.id, p]))
  const submissionByTeam = new Map(source.submissions.map((s) => [s.teamId, s]))
  const reviewByTeam = new Map(source.reviews.map((r) => [r.teamId, cleanProse(r.text)]))
  const commendationByTeam = new Map(
    Object.entries(source.snapshot?.commendations ?? {}).map(([teamId, text]) => [
      teamId,
      cleanProse(text),
    ])
  )

  const scoresByTeam = new Map<string, SourceScore[]>()
  for (const score of source.scores) {
    const list = scoresByTeam.get(score.teamId)
    if (list) list.push(score)
    else scoresByTeam.set(score.teamId, [score])
  }

  const table = standings(
    source.scores.map((s) => ({ judgeEmail: s.judgeEmail, teamId: s.teamId, sheet: s.sheet })),
    rubric
  )
  const standingByTeam = new Map(table.map((t) => [t.teamId, t]))
  // `standings` is already sorted by average desc, id - position is score rank.
  const scoreRankByTeam = new Map(table.map((t, i) => [t.teamId, i + 1]))

  const snapshot = source.snapshot
  const finalRankByTeam = new Map<string, RankedTeam>(
    (snapshot?.ranking ?? []).map((row) => [row.teamId, row])
  )

  const nameById = new Map(source.teams.map((t) => [t.id, t.name]))

  // How the team was actually matched (`trackKey`) wins over an organiser's
  // frozen label, which in turn wins over parsing the team name - see
  // `resolveTeamTrack`. This mirrors `buildResultsInputFromRun`'s resolution
  // exactly: the matcher names a team "${track.label} ${n}" with no dash to
  // parse, so name-first (the old behaviour here) put every matcher-built
  // team in "Unassigned" and collapsed every track into one.
  const labelByKey = trackLabelIndex(source.tracks ?? [])
  const trackById = new Map(source.teams.map((t) => [t.id, resolveTeamTrack(t, labelByKey)]))

  // Legacy snapshots (published before this field existed) carry no
  // `announcementMode` at all - they are always `"podium"`, the only shape
  // that could have been published then.
  const announcementMode = snapshot?.announcementMode ?? "podium"

  // Overall winners: the published snapshot is the record once it exists.
  // Before publication, fall back to score order for the champion.
  // `"tracks"` mode has no overall podium - `snapshot.overall` is already
  // `[]` there, so `announced` and `championTeamId` fall out empty/null with
  // no extra branching. Track winners are handled separately, further
  // below, once every team's corrected track and final rank are known - see
  // the comment there.
  let announced: ExportWinner[] = []
  let championTeamId: string | null = null

  if (snapshot) {
    announced = snapshot.overall.map((w) => ({
      rank: w.rank,
      teamName: nameById.get(w.teamId) ?? w.teamId,
      projectName: w.projectName,
    }))
    championTeamId = snapshot.overall.find((w) => w.rank === 1)?.teamId ?? null
  } else {
    const { champion } = trackWinners(table, nameById, trackById)
    championTeamId = champion?.teamId ?? null
  }

  const teams: ExportTeam[] = source.teams.map((team) => {
    const standing = standingByTeam.get(team.id)
    const judgeScores = (scoresByTeam.get(team.id) ?? []).map((s) => toJudgeScore(s, rubric))
    const snapshotRow = finalRankByTeam.get(team.id)
    const submission = submissionByTeam.get(team.id)

    // The snapshot's basis is authoritative once published; before that, the
    // scores themselves say whether every one came from the writeup.
    const scoredFromWriteup = snapshotRow
      ? snapshotRow.basis === "submission"
      : judgeScores.length > 0 && judgeScores.every((s) => s.writeupOnly)

    const track = trackById.get(team.id) ?? "Unassigned"

    return {
      teamId: team.id,
      teamName: team.name,
      projectDisplayName: submission?.projectName.trim() || team.name,
      tableLabel: teamPlaceLabel(team.table ?? null, team.name, track),
      track,
      members: team.memberIds
        .map((id) => participantById.get(id))
        .filter((p): p is SourceParticipant => p !== undefined)
        .map((p) => toMember(p, team.leaderId)),
      submission: submission
        ? {
            projectName: submission.projectName,
            pitch: cleanProse(submission.pitch),
            problemTackled: cleanProse(submission.problemTackled),
            description: cleanProse(submission.description),
            worksVsMocked: cleanProse(submission.worksVsMocked),
            claudeUsage: cleanProse(submission.claudeUsage),
            repoUrl: submission.repoUrl,
            demoUrl: submission.demoUrl,
            videoUrl: submission.videoUrl,
            slidesUrl: submission.slidesUrl,
          }
        : null,
      judgeScores,
      average: standing?.average ?? null,
      // Range across judges - presentation of totals `weightedTotal` already
      // produced, not new score arithmetic.
      scoreLow: judgeScores.length
        ? Math.min(...judgeScores.map((s) => s.weightedTotal))
        : null,
      scoreHigh: judgeScores.length
        ? Math.max(...judgeScores.map((s) => s.weightedTotal))
        : null,
      judgeCount: standing?.judgeCount ?? 0,
      criterionAverages: standing?.criterionAverages ?? {},
      finalRank: snapshotRow?.rank ?? null,
      finalRankBasis: snapshotRow?.basis ?? null,
      scoreRank: scoreRankByTeam.get(team.id) ?? null,
      scoredFromWriteup,
      // Patched once track winners are recomputed below, after the tail
      // re-sort - a team's own track isn't final until then.
      isTrackWinner: false,
      isChampion: team.id === championTeamId,
      communityReview: reviewByTeam.get(team.id) ?? null,
      commendation: commendationByTeam.get(team.id) ?? null,
    }
  })

  // The stored snapshot's `ranking` array holds the non-announced remainder
  // in whatever order the run produced on event day - arithmetic that this
  // export no longer trusts (see the July regression this fixed). The
  // announced podium is pinned exactly as the panel called it; everyone else
  // is re-sorted here by the average this export just recomputed, and their
  // printed `finalRank` is renumbered to match, so the "#" column and the
  // sort order can never disagree with each other again.
  const rankedTeams = teams.filter((t) => t.finalRank !== null)
  const announcedTeams = rankedTeams
    .filter((t) => t.finalRankBasis === "announced")
    .sort((a, b) => (a.finalRank as number) - (b.finalRank as number))
  const remainderTeams = rankedTeams
    .filter((t) => t.finalRankBasis !== "announced")
    .sort(
      (a, b) =>
        (b.average ?? -Infinity) - (a.average ?? -Infinity) || a.teamName.localeCompare(b.teamName)
    )
  let nextRank = announcedTeams.length + 1
  for (const team of remainderTeams) {
    team.finalRank = nextRank++
  }

  teams.sort(
    (a, b) =>
      (a.finalRank ?? Number.MAX_SAFE_INTEGER) - (b.finalRank ?? Number.MAX_SAFE_INTEGER) ||
      (a.scoreRank ?? Number.MAX_SAFE_INTEGER) - (b.scoreRank ?? Number.MAX_SAFE_INTEGER) ||
      a.teamName.localeCompare(b.teamName)
  )

  // Track winners: recomputed here, never trusted off `snapshot.trackWinners`
  // wholesale - that array (like the old ranking order) was frozen before
  // organiser track assignments existed, so its `track` values can lie. Feed
  // `buildTrackWinners` the same corrected order the tail re-sort just
  // produced (announced podium first, in podium mode) so "the champion
  // leads its own track" still holds, and only scored, ranked teams are
  // considered, so a track with nobody scored produces no winner line (and
  // no divide-by-zero below).
  //
  // `"tracks"` mode never marks a `finalRankBasis` "announced" (the whole
  // point of that mode is a pure-score-order ranking - see `buildRanking`),
  // so `rankedForTracks` alone cannot say which team was declared each
  // track's winner. The snapshot's own `trackWinners` already recorded that,
  // written once at publish time by `buildSnapshot` from the real
  // `announcedTeamIds` - reading it back here is the same pattern already
  // used for an `organiser` override two lines below, applied to `announced`
  // too.
  const announcedForTracks = new Set(
    (snapshot?.trackWinners ?? []).filter((w) => w.basis === "announced").map((w) => w.teamId)
  )

  // A hand-authored `organiser` override in the snapshot is a human
  // correction - an organiser deciding a team built outside its matched
  // track - that recomputation cannot reproduce, so it still wins for its
  // own track, the same reasoning that pins an announced winner.
  const teamById = new Map(teams.map((t) => [t.teamId, t]))
  const rankedForTracks: RankedTeam[] = teams
    .filter((t) => t.finalRank !== null)
    .sort((a, b) => (a.finalRank as number) - (b.finalRank as number))
    .map((t) => ({
      rank: t.finalRank as number,
      teamId: t.teamId,
      projectName: t.projectDisplayName,
      track: t.track,
      average: t.average ?? 0,
      basis: t.finalRankBasis ?? "demo",
    }))
  const winnersByTrack = new Map<string, ResultsTrackWinner>(
    buildTrackWinners(rankedForTracks, announcedForTracks).map((w) => [w.track, w])
  )
  for (const w of snapshot?.trackWinners ?? []) {
    if (w.basis === "organiser") winnersByTrack.set(w.track, w)
  }

  const exportTrackWinners: ExportTrackWinner[] = [...winnersByTrack.values()]
    .map((w) => ({
      track: w.track,
      teamName: nameById.get(w.teamId) ?? w.teamId,
      // The organiser's own frozen wording for a hand override; the live
      // recomputed display name for an algorithmic pick.
      projectName:
        w.basis === "organiser"
          ? w.projectName
          : (teamById.get(w.teamId)?.projectDisplayName ?? w.projectName),
      basis: w.basis,
    }))
    .sort((a, b) => a.track.localeCompare(b.track))

  const trackWinnerTeamIds = new Set([...winnersByTrack.values()].map((w) => w.teamId))
  for (const team of teams) team.isTrackWinner = trackWinnerTeamIds.has(team.teamId)

  const assignedIds = new Set(source.teams.flatMap((t) => t.memberIds))
  const unassignedParticipants = source.participants
    .filter((p) => !assignedIds.has(p.id))
    .map((p) => toMember(p, null))
    .sort((a, b) => a.fullName.localeCompare(b.fullName))

  // ── Judge summaries: each judge's footprint across the night ─────────────
  const byJudge = new Map<string, SourceScore[]>()
  for (const score of source.scores) {
    const list = byJudge.get(score.judgeEmail)
    if (list) list.push(score)
    else byJudge.set(score.judgeEmail, [score])
  }
  const judgeSummaries: ExportJudgeSummary[] = [...byJudge.values()]
    .map((sheets) => {
      const totals = sheets.map((s) => scoreTotal(s.sheet, rubric))
      return {
        judgeName: sheets[0].judgeName,
        judgeEmail: sheets[0].judgeEmail,
        sheets: sheets.length,
        liveSheets: sheets.filter((s) => !s.writeupOnly).length,
        writeupSheets: sheets.filter((s) => s.writeupOnly).length,
        feedbackCount: sheets.filter((s) => s.feedback?.trim()).length,
        meanWeightedTotal: totals.length
          ? Math.round((totals.reduce((a, b) => a + b, 0) / totals.length) * 10) / 10
          : 0,
      }
    })
    .sort((a, b) => b.sheets - a.sheets || a.judgeName.localeCompare(b.judgeName))

  // ── Track summaries: participation and outcome per track ─────────────────
  const winnerByTrack = new Map(exportTrackWinners.map((w) => [w.track, w]))
  const byTrack = new Map<string, ExportTeam[]>()
  for (const team of teams) {
    const list = byTrack.get(team.track)
    if (list) list.push(team)
    else byTrack.set(team.track, [team])
  }
  const trackSummaries: ExportTrackSummary[] = [...byTrack.entries()]
    .map(([track, trackTeams]) => {
      const scored = trackTeams.filter((t) => t.average !== null)
      const winner = winnerByTrack.get(track)
      return {
        track,
        teamsFormed: trackTeams.length,
        teamsSubmitted: trackTeams.filter((t) => t.submission !== null).length,
        teamsScored: scored.length,
        meanAverage: scored.length
          ? Math.round(
              (scored.reduce((sum, t) => sum + (t.average ?? 0), 0) / scored.length) * 10
            ) / 10
          : null,
        winnerTeamName: winner?.teamName ?? null,
        winnerProjectName: winner?.projectName ?? null,
        winnerBasis: winner?.basis ?? null,
      }
    })
    .sort((a, b) => a.track.localeCompare(b.track))

  // ── Coverage: how many judges actually reached each scored team ──────────
  const coverageCounts = new Map<number, number>()
  for (const team of teams) {
    if (team.judgeCount === 0) continue
    coverageCounts.set(team.judgeCount, (coverageCounts.get(team.judgeCount) ?? 0) + 1)
  }
  const coverage: ExportCoverageBucket[] = [...coverageCounts.entries()]
    .map(([judgeCount, count]) => ({ judgeCount, teams: count }))
    .sort((a, b) => a.judgeCount - b.judgeCount)

  const scoredTeams = teams.filter((t) => t.average !== null)
  const meanTeamAverage = scoredTeams.length
    ? Math.round(
        (scoredTeams.reduce((sum, t) => sum + (t.average ?? 0), 0) / scoredTeams.length) * 10
      ) / 10
    : null

  const participantsCheckedIn = source.participants.filter((p) => p.checkedIn).length
  // Only a real disagreement counts as an override - an organiser count that
  // happens to match the system's own is not a second fact worth carrying,
  // it is the same fact twice (see `ExportSummary.participantsCheckedInRecorded`).
  const participantsCheckedInRecorded =
    options.checkedInRecorded !== undefined && options.checkedInRecorded !== participantsCheckedIn
      ? options.checkedInRecorded
      : null

  return {
    cohort: source.cohort,
    generatedAt: now,
    rubric,
    published: snapshot !== null,
    publishedAt: snapshot?.publishedAt ?? source.publishedAt,
    announcementMode,
    announced,
    trackWinners: exportTrackWinners,
    teams,
    unassignedParticipants,
    judgeSummaries,
    trackSummaries,
    coverage,
    summary: {
      participantsRegistered: source.participants.length,
      participantsCheckedIn,
      participantsCheckedInRecorded,
      teamsFormed: source.teams.length,
      teamsSubmitted: source.submissions.length,
      teamsScored: scoredTeams.length,
      teamsScoredFromWriteup: teams.filter((t) => t.scoredFromWriteup).length,
      judges: new Set(source.scores.filter((s) => !s.writeupOnly).map((s) => s.judgeEmail)).size,
      scorecards: source.scores.length,
      meanTeamAverage,
      tracks: new Set(teams.map((t) => t.track)).size,
    },
  }
}
