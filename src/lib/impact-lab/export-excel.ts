/**
 * Impact Lab results export - the Excel workbook.
 *
 * Renders a `ResultsExport` (see ./export-data) into up to eight sheets:
 * Summary, Results, Submissions, Judging detail, Judges, Tracks, Project
 * analyses (when generated), Participants. Server-only (exceljs).
 *
 * Craft rules applied throughout: frozen header rows, autofilter on every
 * sheet, wrapped prose with estimated row heights so text is readable
 * in-cell, number formats on every score, and no merged cells inside data
 * ranges - merges break sorting and filtering, and this file exists to be
 * sorted and filtered.
 *
 * Themed in Karibu, the same warm-light palette as claudekenya.org's public
 * site (see `CLAUDE.md`'s "Design systems" section) - this is a document a
 * team or sponsor opens after the event, and it should read as a Claude
 * Community Kenya artefact, not a raw data dump.
 */

import ExcelJS from "exceljs"
import { totalOutOf } from "./judging"
import {
  markdownToPlainText,
  type ExportTeam,
  type ExportTrackWinner,
  type ResultsExport,
} from "./export-data"
import { brandingForCohort } from "./event-branding"
import { ANALYSIS_PROVENANCE, type TeamAnalysis } from "./export-analysis"

// ─── Palette (Karibu - the public site's own warm-light tokens) ──────────────

const PAPER = "FFF4EEE3" // --paper
const PAPER_CARD = "FFFBF7F0" // --paper-card - zebra tint
const INK = "FF23201B" // --ink
const INK_MUTED = "FF6A6155" // --ink-muted
const CLAY = "FFA84E2D" // --clay - header fill, the single data-bar hue
const CLAY_DARK = "FF8F4023" // --clay-dark - small accent text on paper
const SAND = "FFE4DAC8" // --sand - hairlines and thin borders

// Placing tints - final-placing 1/2/3 on the Results sheet only.
const GOLD = "FFF3E2A8"
const SILVER = "FFE4E4EA"
const COPPER = "FFE7C9B0"

const SCORE_FMT = "0.0"
const BODY_FONT = "Arial"
const FOOTER_TEXT = "Claude Community Kenya · hackathon results · Page &P of &N"

/**
 * exceljs's `DataBarRuleType` omits `color` from its typings, but the writer
 * serialises it (see lib/.../cf/databar-xform.js). This extension keeps the
 * branded bars type-safe without `any`.
 */
interface BrandedDataBarRule extends ExcelJS.DataBarRuleType {
  color?: Partial<ExcelJS.Color>
}

/** "A"-style column letter for a 1-based column number. */
function columnLetter(column: number): string {
  let letter = ""
  for (let n = column; n > 0; n = Math.floor((n - 1) / 26)) {
    letter = String.fromCharCode(65 + ((n - 1) % 26)) + letter
  }
  return letter
}

/**
 * In-cell data bars on a numeric column - the honest kind: anchored 0→max so
 * bar length is proportional to the value, never rescaled to the visible
 * range (Excel's default min–max anchoring exaggerates small differences).
 */
function addDataBars(
  sheet: ExcelJS.Worksheet,
  column: number,
  rowCount: number,
  max: number
): void {
  if (rowCount === 0) return
  const letter = columnLetter(column)
  const rule: BrandedDataBarRule = {
    type: "dataBar",
    priority: 1,
    gradient: false,
    showValue: true,
    border: false,
    cfvo: [
      { type: "num", value: 0 },
      { type: "num", value: max },
    ],
    color: { argb: CLAY },
  }
  sheet.addConditionalFormatting({
    ref: `${letter}2:${letter}${rowCount + 1}`,
    rules: [rule],
  })
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

interface ColumnSpec {
  header: string
  key: string
  width: number
  numFmt?: string
  wrap?: boolean
}

const THIN_SAND_BORDER = {
  top: { style: "thin" as const, color: { argb: SAND } },
  left: { style: "thin" as const, color: { argb: SAND } },
  bottom: { style: "thin" as const, color: { argb: SAND } },
  right: { style: "thin" as const, color: { argb: SAND } },
}

/**
 * Every sheet's shared Karibu finish: clay header (paper text, bold, 22px
 * tall), frozen header row, autofilter, landscape print fit to one page
 * wide with the header row repeated on every printed page, and a sand-tan
 * tab colour (Results overrides it to gold; Summary sets its own clay tab
 * directly, since it is built outside this helper - see `addSummarySheet`).
 */
function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: ColumnSpec[],
  options: { autoFilter?: boolean; tabColor?: string } = {}
): ExcelJS.Worksheet {
  const { autoFilter = true, tabColor = SAND } = options
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { tabColor: { argb: tabColor } },
  })
  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
    style: {
      font: { name: BODY_FONT, size: 10, color: { argb: INK } },
      alignment: {
        vertical: "top",
        wrapText: c.wrap ?? false,
        ...(c.numFmt ? { horizontal: "right" as const } : {}),
      },
      ...(c.numFmt ? { numFmt: c.numFmt } : {}),
    },
  }))

  const header = sheet.getRow(1)
  header.height = 22
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CLAY } }
    cell.font = { bold: true, size: 10, name: BODY_FONT, color: { argb: PAPER } }
    cell.alignment = { vertical: "middle", wrapText: true }
    cell.border = THIN_SAND_BORDER
  })

  if (autoFilter) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    }
  }

  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: "1:1",
  }
  sheet.headerFooter = { oddFooter: FOOTER_TEXT }

  return sheet
}

/**
 * Karibu finish for one data row - alternating paper-card zebra fill on
 * every even row, and a thin sand border around every cell. Called right
 * after `sheet.addRow`, before any row-specific override (podium fills,
 * bold "Yes" cells, dim italic for a no-show or no-submit) - those apply on
 * top of this base.
 */
function styleDataRow(row: ExcelJS.Row): void {
  const zebra = row.number % 2 === 0
  row.eachCell({ includeEmpty: true }, (cell) => {
    if (zebra) {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PAPER_CARD } }
    }
    cell.border = THIN_SAND_BORDER
  })
}

/**
 * Excel does not auto-grow rows for wrapped text written by a library, so a
 * readable prose row needs an explicit height. Estimated from the longest
 * cell: characters per line from the column width, plus hard newlines.
 */
function estimateRowHeight(cells: { text: string; width: number }[]): number {
  let lines = 1
  for (const { text, width } of cells) {
    const perLine = Math.max(10, Math.floor(width * 1.05))
    const cellLines = text
      .split("\n")
      .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / perLine)), 0)
    lines = Math.max(lines, cellLines)
  }
  return Math.min(360, Math.max(16, lines * 13 + 4))
}

/**
 * `trackWinnerBasis` is this team's own track-winner basis (undefined when
 * the team did not win its track) - passed in rather than looked up here so
 * the caller can key the lookup by track (see `addResultsSheet`), not by
 * team name, which two teams in different tracks could share.
 *
 * In `"tracks"` mode there is no overall podium (see `ResultsExport`'s own
 * doc comment), so `finalRankBasis` is never `"announced"` there - the
 * `"Announced by judging panel"` branch below cannot fire for a tracks-mode
 * team by construction, not by convention. A tracks-mode track winner gets
 * its own label instead.
 *
 * `"champion"` mode is a hybrid of the two: the champion's own row DOES carry
 * `finalRankBasis: "announced"` (it is an overall placing, same as podium
 * mode), but an announced track winner who is not the champion is score
 * order on its ranking row (see `results.ts`'s `buildRanking`) and needs the
 * `trackWinnerBasis` check, same as tracks mode gives its own winners.
 */
function placingBasisLabel(
  team: ExportTeam,
  announcementMode: ResultsExport["announcementMode"],
  trackWinnerBasis: ExportTrackWinner["basis"] | undefined
): string {
  if (announcementMode === "tracks") {
    if (trackWinnerBasis === "announced") return "Announced track winner"
    return team.average !== null
      ? team.scoredFromWriteup
        ? "Score order (written submission)"
        : "Score order (live demo)"
      : ""
  }
  if (announcementMode === "champion") {
    if (team.finalRankBasis === "announced") return "Announced champion"
    if (trackWinnerBasis === "announced") return "Announced track winner"
    return team.average !== null
      ? team.scoredFromWriteup
        ? "Score order (written submission)"
        : "Score order (live demo)"
      : ""
  }
  switch (team.finalRankBasis) {
    case "announced":
      return "Announced by judging panel"
    case "demo":
      return "Score order (live demo)"
    case "submission":
      return "Score order (written submission)"
    default:
      return team.average !== null ? "Score order (unpublished)" : ""
  }
}

const WRITEUP_NOTE =
  "Scored from the written submission: no judge reached this table during demos."

/** Placing-tint fill for a final placing of 1, 2 or 3. `undefined` otherwise. */
const PLACING_FILL: Record<number, string> = { 1: GOLD, 2: SILVER, 3: COPPER }

// ─── Sheets ──────────────────────────────────────────────────────────────────

function addResultsSheet(workbook: ExcelJS.Workbook, data: ResultsExport): void {
  const rubric = data.rubric
  const denom = totalOutOf(rubric)
  const columns: ColumnSpec[] = [
    { header: "Final placing", key: "finalRank", width: 12, numFmt: "0" },
    { header: "Placing basis", key: "basis", width: 26 },
    { header: "Team", key: "team", width: 30 },
    { header: "Table", key: "table", width: 10 },
    { header: "Track", key: "track", width: 22 },
    { header: "Project", key: "project", width: 26 },
    { header: "Score rank", key: "scoreRank", width: 12, numFmt: "0" },
    { header: `Weighted average (/${denom})`, key: "average", width: 12, numFmt: SCORE_FMT },
    { header: `Judge low (/${denom})`, key: "scoreLow", width: 12, numFmt: SCORE_FMT },
    { header: `Judge high (/${denom})`, key: "scoreHigh", width: 12, numFmt: SCORE_FMT },
    { header: "Judge spread", key: "spread", width: 12, numFmt: SCORE_FMT },
    { header: "Judges", key: "judges", width: 10, numFmt: "0" },
    ...rubric.criteria.map((c) => ({
      header: `${c.label} (avg /${c.max})`,
      key: `avg_${c.key}`,
      width: 12,
      numFmt: SCORE_FMT,
    })),
    { header: "Track winner", key: "trackWinner", width: 12 },
    { header: "Champion", key: "champion", width: 10 },
    { header: "Note", key: "note", width: 60, wrap: true },
  ]
  const sheet = addSheet(workbook, "Results", columns, { tabColor: GOLD })

  // Keyed by track, not team name - two teams in different tracks could
  // share a name, and a track has exactly one winner.
  const trackWinnerByTrack = new Map(data.trackWinners.map((w) => [w.track, w]))

  for (const team of data.teams) {
    const note = [
      team.scoredFromWriteup ? WRITEUP_NOTE : null,
      team.submission === null ? "Did not submit a project." : null,
      team.average === null && team.submission !== null ? "Never scored." : null,
      team.commendation !== null
        ? `Judges' commendation: ${markdownToPlainText(team.commendation)}`
        : null,
    ]
      .filter((n): n is string => n !== null)
      .join(" ")

    const trackWinnerBasis = team.isTrackWinner
      ? trackWinnerByTrack.get(team.track)?.basis
      : undefined

    const row = sheet.addRow({
      finalRank: team.finalRank ?? "-",
      basis: placingBasisLabel(team, data.announcementMode, trackWinnerBasis),
      // `team.tableLabel` is already the deduplicated `teamPlaceLabel` value
      // ("Table 30", not "Table 30 · Breakthrough") - this sheet's Team and
      // Table columns sit right next to a Track column, so both take the
      // same deduplicated value rather than the Team column repeating the
      // track name the Track column already states.
      team: team.tableLabel,
      table: team.tableLabel,
      track: team.track,
      project: team.projectDisplayName,
      scoreRank: team.scoreRank ?? "-",
      average: team.average ?? "-",
      scoreLow: team.scoreLow ?? "-",
      scoreHigh: team.scoreHigh ?? "-",
      spread:
        team.scoreLow !== null && team.scoreHigh !== null && team.judgeCount > 1
          ? Math.round((team.scoreHigh - team.scoreLow) * 10) / 10
          : "-",
      judges: team.judgeCount,
      ...Object.fromEntries(
        rubric.criteria.map((c) => [`avg_${c.key}`, team.criterionAverages[c.key] ?? "-"])
      ),
      trackWinner: team.isTrackWinner ? "Yes" : "",
      champion: team.isChampion ? "Yes" : "",
      note,
    })
    styleDataRow(row)

    if (team.submission === null) {
      row.eachCell((cell) => {
        cell.font = { ...cell.font, italic: true, color: { argb: INK_MUTED } }
      })
    }

    const placingFill = team.finalRank !== null ? PLACING_FILL[team.finalRank] : undefined
    if (placingFill) {
      const fill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: placingFill },
      }
      row.getCell("finalRank").fill = fill
      row.getCell("project").fill = fill
    }

    if (team.isTrackWinner) {
      row.getCell("trackWinner").font = {
        ...row.getCell("trackWinner").font,
        bold: true,
        color: { argb: CLAY },
      }
    }
    if (team.isChampion) {
      row.getCell("champion").font = {
        ...row.getCell("champion").font,
        bold: true,
        color: { argb: CLAY },
      }
    }
    if (note) {
      row.getCell("note").font = { ...row.getCell("note").font, size: 9, color: { argb: CLAY_DARK } }
    }
  }

  // Honest in-cell bars: 0→denom anchoring, on the average column.
  const averageColumn = columns.findIndex((c) => c.key === "average") + 1
  addDataBars(sheet, averageColumn, data.teams.length, denom)
}

function addSubmissionsSheet(workbook: ExcelJS.Workbook, data: ResultsExport): void {
  const columns: ColumnSpec[] = [
    { header: "Final placing", key: "finalRank", width: 12, numFmt: "0" },
    { header: "Team", key: "team", width: 26 },
    { header: "Track", key: "track", width: 22 },
    { header: "Project", key: "project", width: 24 },
    { header: "Pitch", key: "pitch", width: 60, wrap: true },
    { header: "Problem tackled", key: "problem", width: 60, wrap: true },
    { header: "What it does", key: "description", width: 60, wrap: true },
    { header: "What works vs mocked", key: "worksVsMocked", width: 60, wrap: true },
    { header: "How AI was used", key: "claudeUsage", width: 60, wrap: true },
    { header: "Repo URL", key: "repoUrl", width: 34 },
    { header: "Demo URL", key: "demoUrl", width: 30 },
    { header: "Video URL", key: "videoUrl", width: 30 },
    { header: "Slides URL", key: "slidesUrl", width: 30 },
    { header: "Scoring basis", key: "scoringBasis", width: 30, wrap: true },
    // The approved community review - signed feedback from the host
    // community, never judge commentary; the header says whose words these
    // are so the label travels with any copy of the sheet.
    { header: "Impact Lab review (Claude Community Kenya)", key: "communityReview", width: 60, wrap: true },
  ]
  const sheet = addSheet(workbook, "Submissions", columns)

  for (const team of data.teams) {
    if (!team.submission) continue
    const s = team.submission
    // Markdown-flattened for a plain cell: markers stripped, bullets become
    // "• " lines - see `markdownToPlainText`. Windows line breaks are already
    // gone by the time these fields reach here (`cleanProse`, applied in
    // `buildResultsExport`).
    const pitch = markdownToPlainText(s.pitch)
    const problem = markdownToPlainText(s.problemTackled)
    const description = markdownToPlainText(s.description)
    const worksVsMocked = markdownToPlainText(s.worksVsMocked)
    const claudeUsage = markdownToPlainText(s.claudeUsage)
    const communityReview = team.communityReview ? markdownToPlainText(team.communityReview) : ""
    const row = sheet.addRow({
      finalRank: team.finalRank ?? "-",
      team: team.teamName,
      track: team.track,
      project: team.projectDisplayName,
      pitch,
      problem,
      description,
      worksVsMocked,
      claudeUsage,
      repoUrl: s.repoUrl,
      demoUrl: s.demoUrl ?? "",
      videoUrl: s.videoUrl ?? "",
      slidesUrl: s.slidesUrl ?? "",
      scoringBasis: team.scoredFromWriteup ? WRITEUP_NOTE : "Scored at the table (live demo).",
      communityReview,
    })
    styleDataRow(row)
    row.height = estimateRowHeight([
      { text: pitch, width: 60 },
      { text: problem, width: 60 },
      { text: description, width: 60 },
      { text: worksVsMocked, width: 60 },
      { text: claudeUsage, width: 60 },
      { text: communityReview, width: 60 },
    ])
    if (team.scoredFromWriteup) {
      row.getCell("scoringBasis").font = {
        ...row.getCell("scoringBasis").font,
        size: 9,
        color: { argb: CLAY_DARK },
      }
    }
  }
}

function addJudgingSheet(
  workbook: ExcelJS.Workbook,
  data: ResultsExport,
  includeContacts: boolean
): void {
  const rubric = data.rubric
  const columns: ColumnSpec[] = [
    { header: "Final placing", key: "finalRank", width: 12, numFmt: "0" },
    { header: "Team", key: "team", width: 26 },
    { header: "Project", key: "project", width: 24 },
    { header: "Track", key: "track", width: 22 },
    { header: "Judge", key: "judge", width: 22 },
    ...(includeContacts
      ? [{ header: "Judge email", key: "judgeEmail", width: 26 }]
      : []),
    { header: "Scoring basis", key: "basis", width: 20 },
    ...rubric.criteria.map((c) => ({
      header: `${c.label} (${c.min}–${c.max})`,
      key: `crit_${c.key}`,
      width: 12,
      numFmt: "0",
    })),
    { header: `Weighted total (/${totalOutOf(rubric)})`, key: "total", width: 12, numFmt: SCORE_FMT },
    { header: "Feedback", key: "feedback", width: 60, wrap: true },
  ]
  const sheet = addSheet(workbook, "Judging detail", columns)

  for (const team of data.teams) {
    for (const score of team.judgeScores) {
      const feedback = score.feedback ? markdownToPlainText(score.feedback) : ""
      const row = sheet.addRow({
        finalRank: team.finalRank ?? "-",
        team: team.teamName,
        project: team.projectDisplayName,
        track: team.track,
        judge: score.judgeName,
        ...(includeContacts ? { judgeEmail: score.judgeEmail } : {}),
        basis: score.writeupOnly ? "Written submission" : "Live demo",
        ...Object.fromEntries(
          rubric.criteria.map((c) => [`crit_${c.key}`, score.criteria[c.key] ?? "-"])
        ),
        total: score.weightedTotal,
        feedback,
      })
      styleDataRow(row)
      row.getCell("judge").font = { ...row.getCell("judge").font, bold: true }
      if (feedback) {
        row.height = estimateRowHeight([{ text: feedback, width: 60 }])
      }
      if (score.writeupOnly) {
        row.getCell("basis").font = { ...row.getCell("basis").font, size: 9, color: { argb: CLAY_DARK } }
      }
    }
  }
}

/** One row per judge: coverage and how they used the scale. */
function addJudgesSheet(
  workbook: ExcelJS.Workbook,
  data: ResultsExport,
  includeContacts: boolean
): void {
  const denom = totalOutOf(data.rubric)
  const columns: ColumnSpec[] = [
    { header: "Judge", key: "judge", width: 22 },
    ...(includeContacts ? [{ header: "Judge email", key: "email", width: 28 }] : []),
    { header: "Scorecards", key: "sheets", width: 12, numFmt: "0" },
    { header: "Live demos", key: "live", width: 12, numFmt: "0" },
    { header: "From writeups", key: "writeup", width: 12, numFmt: "0" },
    { header: "Written notes left", key: "notes", width: 12, numFmt: "0" },
    { header: `Mean weighted total (/${denom})`, key: "mean", width: 12, numFmt: SCORE_FMT },
  ]
  const sheet = addSheet(workbook, "Judges", columns)
  for (const judge of data.judgeSummaries) {
    const row = sheet.addRow({
      judge: judge.judgeName,
      ...(includeContacts ? { email: judge.judgeEmail } : {}),
      sheets: judge.sheets,
      live: judge.liveSheets,
      writeup: judge.writeupSheets,
      notes: judge.feedbackCount,
      mean: judge.meanWeightedTotal,
    })
    styleDataRow(row)
  }
  addDataBars(sheet, columns.findIndex((c) => c.key === "mean") + 1, data.judgeSummaries.length, denom)
  const note = sheet.addRow({})
  styleDataRow(note)
  note.getCell("judge").value =
    "Judges saw different, overlapping sets of teams; mean totals show how each judge used the scale, not a ranking of judges."
  note.getCell("judge").font = { name: BODY_FONT, size: 9, italic: true, color: { argb: INK_MUTED } }
}

/** One row per track: participation, outcome, winner with its basis. */
function addTracksSheet(workbook: ExcelJS.Workbook, data: ResultsExport): void {
  const denom = totalOutOf(data.rubric)
  const columns: ColumnSpec[] = [
    { header: "Track", key: "track", width: 26 },
    { header: "Teams formed", key: "formed", width: 12, numFmt: "0" },
    { header: "Teams submitted", key: "submitted", width: 12, numFmt: "0" },
    { header: "Teams scored", key: "scored", width: 12, numFmt: "0" },
    { header: `Mean average (/${denom})`, key: "mean", width: 12, numFmt: SCORE_FMT },
    { header: "Track winner (project)", key: "winnerProject", width: 24 },
    { header: "Track winner (team)", key: "winnerTeam", width: 28 },
    { header: "Winner basis", key: "basis", width: 22 },
  ]
  const sheet = addSheet(workbook, "Tracks", columns)
  for (const track of data.trackSummaries) {
    const row = sheet.addRow({
      track: track.track,
      formed: track.teamsFormed,
      submitted: track.teamsSubmitted,
      scored: track.teamsScored,
      mean: track.meanAverage ?? "-",
      winnerProject: track.winnerProjectName ?? "-",
      winnerTeam: track.winnerTeamName ?? "-",
      basis:
        track.winnerBasis === "announced"
          ? "Announced by judging panel"
          : track.winnerBasis === "score"
            ? "Top of track by score"
            : track.winnerBasis === "organiser"
              ? "Assigned by organisers, see note"
              : "-",
    })
    styleDataRow(row)
  }
  addDataBars(sheet, columns.findIndex((c) => c.key === "mean") + 1, data.trackSummaries.length, denom)
}

/**
 * The generated project analyses, one row per analysed team, each row
 * carrying its provenance so the sheet stays honest even copied out alone.
 */
function addAnalysesSheet(
  workbook: ExcelJS.Workbook,
  data: ResultsExport,
  analyses: ReadonlyMap<string, TeamAnalysis>
): void {
  if (analyses.size === 0) return
  const columns: ColumnSpec[] = [
    { header: "Final placing", key: "finalRank", width: 12, numFmt: "0" },
    { header: "Team", key: "team", width: 26 },
    { header: "Project", key: "project", width: 24 },
    { header: "What they built", key: "built", width: 60, wrap: true },
    { header: "Who it serves", key: "serves", width: 60, wrap: true },
    { header: "Working vs mocked", key: "working", width: 60, wrap: true },
    { header: "How AI was used", key: "claude", width: 60, wrap: true },
    { header: "Provenance", key: "provenance", width: 60, wrap: true },
  ]
  const sheet = addSheet(workbook, "Project analyses", columns)
  for (const team of data.teams) {
    const analysis = analyses.get(team.teamId)
    if (!analysis || !team.submission) continue
    const row = sheet.addRow({
      finalRank: team.finalRank ?? "-",
      team: team.teamName,
      project: team.projectDisplayName,
      built: analysis.whatTheyBuilt,
      serves: analysis.whoItServes,
      working: analysis.workingVsMocked,
      claude: analysis.claudeUse,
      provenance: ANALYSIS_PROVENANCE,
    })
    styleDataRow(row)
    row.height = estimateRowHeight([
      { text: analysis.whatTheyBuilt, width: 60 },
      { text: analysis.whoItServes, width: 60 },
      { text: analysis.workingVsMocked, width: 60 },
      { text: analysis.claudeUse, width: 60 },
    ])
    row.getCell("provenance").font = {
      ...row.getCell("provenance").font,
      size: 9,
      italic: true,
      color: { argb: INK_MUTED },
    }
  }
}

function addParticipantsSheet(
  workbook: ExcelJS.Workbook,
  data: ResultsExport,
  includeContacts: boolean
): void {
  const columns: ColumnSpec[] = [
    { header: "Name", key: "name", width: 26 },
    ...(includeContacts ? [{ header: "Email", key: "email", width: 32 }] : []),
    { header: "Team", key: "team", width: 28 },
    { header: "Table", key: "table", width: 10 },
    { header: "Track", key: "track", width: 22 },
    { header: "Project", key: "project", width: 24 },
    { header: "Role", key: "role", width: 22 },
    { header: "Institution", key: "institution", width: 26 },
    { header: "Team leader", key: "leader", width: 11 },
    { header: "Checked in", key: "checkedIn", width: 10 },
  ]
  const sheet = addSheet(workbook, "Participants", columns)

  // A shareable copy carries only the people who actually showed up - the
  // full roster (including no-shows) is organiser detail that belongs with
  // the contact list it is filtered alongside, not in a copy meant to leave
  // the organising team.
  const includeMember = (checkedIn: boolean): boolean => includeContacts || checkedIn

  for (const team of data.teams) {
    for (const member of team.members) {
      if (!includeMember(member.checkedIn)) continue
      const row = sheet.addRow({
        name: member.fullName,
        ...(includeContacts ? { email: member.email } : {}),
        // Deduplicated, same reasoning as the Results sheet - Team, Table and
        // Track sit in three adjacent columns here.
        team: team.tableLabel,
        table: team.tableLabel,
        track: team.track,
        project: team.projectDisplayName,
        role: member.primaryRole,
        institution: member.institution ?? "",
        leader: member.isLeader ? "Yes" : "",
        checkedIn: member.checkedIn ? "Yes" : "No",
      })
      styleDataRow(row)
    }
  }
  for (const member of data.unassignedParticipants) {
    if (!includeMember(member.checkedIn)) continue
    const row = sheet.addRow({
      name: member.fullName,
      ...(includeContacts ? { email: member.email } : {}),
      team: "(not on a team)",
      table: "",
      track: "",
      project: "",
      role: member.primaryRole,
      institution: member.institution ?? "",
      leader: "",
      checkedIn: member.checkedIn ? "Yes" : "No",
    })
    styleDataRow(row)
    row.getCell("team").font = { ...row.getCell("team").font, color: { argb: INK_MUTED }, italic: true }
  }
}

/**
 * The Summary sheet as a cover, not a data table: masthead (event name,
 * host), then label/value sections with no header row, no autofilter and no
 * gridlines - see `buildResultsWorkbook`, which builds this one first so it
 * is the workbook's first tab.
 */
async function addSummarySheet(
  workbook: ExcelJS.Workbook,
  data: ResultsExport,
  includeContacts: boolean
): Promise<void> {
  const sheet = workbook.addWorksheet("Summary", {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: CLAY } },
  })
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    printTitlesRow: "1:1",
  }
  sheet.headerFooter = { oddFooter: FOOTER_TEXT }
  sheet.columns = [
    { key: "label", width: 34, style: { font: { name: BODY_FONT, size: 10 }, alignment: { vertical: "top" } } },
    {
      key: "value",
      width: 78,
      style: { font: { name: BODY_FONT, size: 10 }, alignment: { vertical: "top", wrapText: true } },
    },
  ]

  // Section title band: clay fill, paper bold caps - the same header
  // language as every other sheet's column header, so the cover still reads
  // as part of the same workbook.
  const section = (title: string): void => {
    const row = sheet.addRow({ label: title.toUpperCase() })
    row.height = 24
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > 2) return
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CLAY } }
      cell.font = { bold: true, size: 10, name: BODY_FONT, color: { argb: PAPER } }
      cell.alignment = { vertical: "middle" }
    })
  }
  const fact = (label: string, value: string | number, note = false, valueSize?: number): void => {
    const row = sheet.addRow({ label, value })
    row.getCell("label").font = { bold: true, size: 10, name: BODY_FONT, color: { argb: INK } }
    row.getCell("value").font = {
      size: valueSize ?? (note ? 9 : 10),
      name: BODY_FONT,
      italic: note,
      color: { argb: note ? CLAY_DARK : INK },
    }
    if (note) {
      row.height = estimateRowHeight([{ text: String(value), width: 78 }])
    }
  }
  const gap = (): void => {
    sheet.addRow({})
  }

  const branding = await brandingForCohort(data.cohort)

  // ── Masthead ──────────────────────────────────────────────────────────────
  const titleRow = sheet.addRow({ label: branding.title })
  titleRow.height = 30
  titleRow.getCell("label").font = { bold: true, size: 20, name: BODY_FONT, color: { argb: INK } }
  const hostRow = sheet.addRow({ label: `Hosted by ${branding.host}` })
  hostRow.getCell("label").font = { size: 12, italic: true, name: BODY_FONT, color: { argb: INK_MUTED } }
  gap()

  section("Event")
  if (branding.platformNote) fact("Platform", branding.platformNote)
  fact("Dates", branding.dates)
  fact("Location", branding.location)
  fact("Cohort", data.cohort)
  fact("Generated", data.generatedAt.toISOString())
  fact(
    "Results published",
    data.published && data.publishedAt ? data.publishedAt : "Not yet published"
  )
  gap()

  section("The event in numbers")
  const s = data.summary
  fact("Participants registered", s.participantsRegistered, false, 14)
  // An organiser-recorded count (e.g. from Luma) is added alongside the
  // system's own, never in place of it - the two are different facts (who
  // Impact Lab's own check-in flow saw vs who the door recorded), and a
  // reader comparing them against each other needs both on the page. With
  // no override the site's own count is the only figure available, and it
  // is labelled as what it is - self-service check-ins, not the room's full
  // attendance - never printed as a bare "checked in" that reads as a total.
  if (s.participantsCheckedInRecorded !== null) {
    fact("Participants checked in (system)", s.participantsCheckedIn, false, 14)
    fact("Participants checked in (recorded)", s.participantsCheckedInRecorded, false, 14)
  } else {
    fact("Participants checked in (site)", s.participantsCheckedIn, false, 14)
  }
  fact("Teams formed", s.teamsFormed, false, 14)
  fact("Teams that submitted", s.teamsSubmitted, false, 14)
  fact("Teams scored", s.teamsScored, false, 14)
  fact("Teams scored from their writeup", s.teamsScoredFromWriteup, false, 14)
  fact("Judges on the floor", s.judges, false, 14)
  fact("Scorecards recorded", s.scorecards, false, 14)
  fact(`Mean team score (/${totalOutOf(data.rubric)})`, s.meanTeamAverage ?? "-", false, 14)
  fact("Tracks", s.tracks, false, 14)
  gap()

  section("Winners")
  // No overall podium exists in "tracks" mode (see `ResultsExport`'s own doc
  // comment) - `data.announced` is always `[]` there, published or not, so
  // the unpublished branch below must never run for a published tracks-mode
  // run: it would print "Results not yet published" over a result that has
  // been.
  if (data.announcementMode === "tracks") {
    fact(
      "Overall podium",
      "Not announced. This event named one winner per track instead. See the track rows below."
    )
  } else if (data.announced.length > 0) {
    for (const winner of data.announced) {
      const label =
        data.announcementMode === "champion" ? "Champion (announced)" : `#${winner.rank} (announced)`
      fact(label, `${winner.projectName} · ${winner.teamName}`)
    }
  } else {
    fact("Announced winners", "Results not yet published.")
  }
  for (const w of data.trackWinners) {
    fact(
      `Track · ${w.track}`,
      `${w.projectName} · ${w.teamName}${
        w.basis === "announced"
          ? " (announced)"
          : w.basis === "organiser"
            ? " (organiser decision)"
            : " (by score)"
      }`
    )
  }
  gap()

  section("Scoring criteria and weights")
  const rubric = data.rubric
  for (const criterion of rubric.criteria) {
    fact(
      `${criterion.label} · ${
        rubric.scoring === "points" ? `${criterion.min}–${criterion.max} pts` : `${criterion.weight} pts`
      }`,
      criterion.guidance,
      true
    )
  }
  fact(
    "Scale",
    rubric.scoreLabels
      ? Object.entries(rubric.scoreLabels)
          .map(([n, label]) => `${n} = ${label}`)
          .join(" · ") +
          ". A criterion contributes (score - min) / (max - min) of its weight; a team's number is " +
          "the mean of its judges' weighted totals."
      : "Each criterion's raw score IS its points, on the scale stated in its own guidance above " +
          "(no shared anchor text: the panel published a points rubric, not a normalised one). A " +
          "team's number is the mean of its judges' totals.",
    true
  )
  gap()

  section("Provenance")
  const judgesWithNotes = data.judgeSummaries.filter((j) => j.feedbackCount > 0)
  const notesTotal = judgesWithNotes.reduce((sum, j) => sum + j.feedbackCount, 0)
  fact(
    "Judge notes",
    judgesWithNotes.length === 0
      ? "No judge left written notes during scoring."
      : `Written notes were left by ${judgesWithNotes.length === 1 ? `one judge (${judgesWithNotes[0].judgeName})` : `${judgesWithNotes.length} judges`} ` +
          `on ${notesTotal} scorecard${notesTotal === 1 ? "" : "s"}. They appear verbatim in “Judging detail”; ` +
          "no judge's words have been extended or invented anywhere in this workbook.",
    true
  )
  fact("Project analyses", `The “Project analyses” sheet is generated: ${ANALYSIS_PROVENANCE}`, true)
  fact(
    "Contact details",
    includeContacts
      ? "This workbook carries participant and judge emails and is the organisers' operational " +
          "record; treat it accordingly. Generate it with contacts=off to share a copy outside " +
          "the organising team; the PDF built for sharing omits all contact details regardless."
      : "Generated with contacts=off: every participant and judge email column has been omitted, " +
          "and the Participants sheet is filtered to people who actually checked in; a no-show's " +
          "name is organiser detail, not something this copy carries. Re-generate without that " +
          "flag for the organisers' own operational record.",
    true
  )
  gap()

  section("How to read this workbook")
  fact(
    "Final placing vs score rank",
    data.announcementMode === "tracks"
      ? "There was no overall podium at this event; the panel named one winner per track instead " +
          "(see “Winners” above). “Final placing” here is pure score order throughout, and does not " +
          "imply or reproduce which team led its track; “Score rank” is the same order restated. " +
          "Each row's “Placing basis” says whether that row is a declared track winner or plain " +
          "score order."
      : data.announcementMode === "champion"
        ? "The judging panel announced a champion and a winner for each track; the raw score " +
            "averages order everyone else. “Final placing” is the published result (the champion " +
            "first, then score order), “Score rank” is the raw average order; the two columns " +
            "disagree by design for the champion, and each row's “Placing basis” says which applies."
        : "The judging panel deliberated and announced the podium; the raw score averages order the rest. " +
            "“Final placing” is the published result (announced winners first), “Score rank” is the raw " +
            "average order; the two columns disagree by design, and each row's “Placing basis” says " +
            "which applies.",
    true
  )
  fact(
    "Writeup-scored teams",
    "Teams marked “Written submission” submitted on time and presented their work in writing; no " +
      "judge reached their table during live demos, so the panel scored them from the written " +
      "submission instead. It is a note on how the score was produced, not on the team.",
    true
  )
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Build the workbook - Summary, Results, Submissions, Judging detail,
 * Judges, Tracks, Project analyses (when generated), Participants - and
 * return it as a Node buffer to stream. A missing analyses map simply omits
 * that sheet (the fail-soft rule from export-analysis). Summary is built
 * first so it lands as the workbook's first tab, the cover a reader sees on
 * open.
 *
 * `includeContacts` defaults to true - the organisers' own operational
 * record, unchanged from before this option existed. Pass `false` (the
 * export route's `contacts=off`) to omit every participant and judge email
 * column and filter the Participants sheet to people who checked in,
 * producing a workbook safe to hand outside the organising team; nothing
 * else about the sheets changes.
 */
export async function buildResultsWorkbook(
  data: ResultsExport,
  analyses: ReadonlyMap<string, TeamAnalysis> = new Map(),
  includeContacts = true
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = (await brandingForCohort(data.cohort)).host
  workbook.created = data.generatedAt

  await addSummarySheet(workbook, data, includeContacts)
  addResultsSheet(workbook, data)
  addSubmissionsSheet(workbook, data)
  addJudgingSheet(workbook, data, includeContacts)
  addJudgesSheet(workbook, data, includeContacts)
  addTracksSheet(workbook, data)
  addAnalysesSheet(workbook, data, analyses)
  addParticipantsSheet(workbook, data, includeContacts)

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
