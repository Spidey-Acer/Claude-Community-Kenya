/**
 * Impact Lab results export — the Excel workbook.
 *
 * Renders a `ResultsExport` (see ./export-data) into up to eight sheets:
 * Results, Submissions, Judging detail, Judges, Tracks, Project analyses
 * (when generated), Participants, Summary. Server-only (exceljs).
 *
 * Craft rules applied throughout: frozen header rows, autofilter on the wide
 * sheets, wrapped prose with estimated row heights so text is readable
 * in-cell, number formats on every score, and no merged cells inside data
 * ranges — merges break sorting and filtering, and this file exists to be
 * sorted and filtered.
 */

import ExcelJS from "exceljs"
import { JUDGING_CRITERIA, SCORE_LABELS } from "./judging"
import { type ExportTeam, type ResultsExport } from "./export-data"
import { brandingForCohort } from "./event-branding"
import { ANALYSIS_PROVENANCE, type TeamAnalysis } from "./export-analysis"

// ─── Palette (print-safe echoes of the Terminal Noir tokens) ─────────────────

const INK = "FF141414" // header fill — near-black
const INK_TEXT = "FFF5F5F5"
const GREEN = "FF00993D" // --green-primary, darkened for white paper
const AMBER_FILL = "FFFDF3D7" // announced-podium row tint
const AMBER_TEXT = "FF8A5B00" // basis notes
const DIM_TEXT = "FF666666"

const SCORE_FMT = "0.0"
const CLAY = "FFD97757" // Anthropic terracotta — the single data-bar hue

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
 * In-cell data bars on a numeric column — the honest kind: anchored 0→max so
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

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: ColumnSpec[],
  options: { autoFilter?: boolean } = {}
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  })
  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
    style: {
      alignment: { vertical: "top", wrapText: c.wrap ?? false },
      ...(c.numFmt ? { numFmt: c.numFmt } : {}),
    },
  }))

  const header = sheet.getRow(1)
  header.height = 28
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } }
    cell.font = { bold: true, size: 10, color: { argb: INK_TEXT } }
    cell.alignment = { vertical: "middle", wrapText: true }
    cell.border = { bottom: { style: "medium", color: { argb: GREEN } } }
  })

  if (options.autoFilter) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    }
  }
  return sheet
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

function placingBasisLabel(team: ExportTeam): string {
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
  "Scored from the written submission — no judge reached this table during demos."

// ─── Sheets ──────────────────────────────────────────────────────────────────

function addResultsSheet(workbook: ExcelJS.Workbook, data: ResultsExport): void {
  const columns: ColumnSpec[] = [
    { header: "Final placing", key: "finalRank", width: 12, numFmt: "0" },
    { header: "Placing basis", key: "basis", width: 26 },
    { header: "Team", key: "team", width: 30 },
    { header: "Table", key: "table", width: 10 },
    { header: "Track", key: "track", width: 22 },
    { header: "Project", key: "project", width: 26 },
    { header: "Score rank", key: "scoreRank", width: 11, numFmt: "0" },
    { header: "Weighted average (/100)", key: "average", width: 16, numFmt: SCORE_FMT },
    { header: "Judge low (/100)", key: "scoreLow", width: 11, numFmt: SCORE_FMT },
    { header: "Judge high (/100)", key: "scoreHigh", width: 11, numFmt: SCORE_FMT },
    { header: "Judge spread", key: "spread", width: 11, numFmt: SCORE_FMT },
    { header: "Judges", key: "judges", width: 8, numFmt: "0" },
    ...JUDGING_CRITERIA.map((c) => ({
      header: `${c.label} (avg /5)`,
      key: `avg_${c.key}`,
      width: 13,
      numFmt: SCORE_FMT,
    })),
    { header: "Track winner", key: "trackWinner", width: 12 },
    { header: "Champion", key: "champion", width: 10 },
    { header: "Note", key: "note", width: 52, wrap: true },
  ]
  const sheet = addSheet(workbook, "Results", columns, { autoFilter: true })

  for (const team of data.teams) {
    const note = [
      team.scoredFromWriteup ? WRITEUP_NOTE : null,
      team.submission === null ? "Did not submit a project." : null,
      team.average === null && team.submission !== null ? "Never scored." : null,
    ]
      .filter((n): n is string => n !== null)
      .join(" ")

    const row = sheet.addRow({
      finalRank: team.finalRank ?? "—",
      basis: placingBasisLabel(team),
      team: team.teamName,
      table: team.tableLabel,
      track: team.track,
      project: team.submission?.projectName ?? "—",
      scoreRank: team.scoreRank ?? "—",
      average: team.average ?? "—",
      scoreLow: team.scoreLow ?? "—",
      scoreHigh: team.scoreHigh ?? "—",
      spread:
        team.scoreLow !== null && team.scoreHigh !== null && team.judgeCount > 1
          ? Math.round((team.scoreHigh - team.scoreLow) * 10) / 10
          : "—",
      judges: team.judgeCount,
      ...Object.fromEntries(
        JUDGING_CRITERIA.map((c) => [`avg_${c.key}`, team.criterionAverages[c.key] ?? "—"])
      ),
      trackWinner: team.isTrackWinner ? "Yes" : "",
      champion: team.isChampion ? "Yes" : "",
      note,
    })

    if (team.finalRankBasis === "announced") {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AMBER_FILL } }
        cell.font = { ...cell.font, bold: team.isChampion }
      })
    }
    if (note) {
      row.getCell("note").font = { size: 9, color: { argb: AMBER_TEXT } }
    }
  }

  // Honest in-cell bars: 0→100 anchoring, on the average column.
  const averageColumn = columns.findIndex((c) => c.key === "average") + 1
  addDataBars(sheet, averageColumn, data.teams.length, 100)
}

function addSubmissionsSheet(workbook: ExcelJS.Workbook, data: ResultsExport): void {
  const columns: ColumnSpec[] = [
    { header: "Final placing", key: "finalRank", width: 12, numFmt: "0" },
    { header: "Team", key: "team", width: 26 },
    { header: "Track", key: "track", width: 20 },
    { header: "Project", key: "project", width: 24 },
    { header: "Pitch", key: "pitch", width: 46, wrap: true },
    { header: "Problem tackled", key: "problem", width: 40, wrap: true },
    { header: "What it does", key: "description", width: 56, wrap: true },
    { header: "What works vs mocked", key: "worksVsMocked", width: 46, wrap: true },
    { header: "How AI was used", key: "claudeUsage", width: 46, wrap: true },
    { header: "Repo URL", key: "repoUrl", width: 34 },
    { header: "Demo URL", key: "demoUrl", width: 30 },
    { header: "Video URL", key: "videoUrl", width: 30 },
    { header: "Slides URL", key: "slidesUrl", width: 30 },
    { header: "Scoring basis", key: "scoringBasis", width: 30, wrap: true },
    // The approved community review — signed feedback from the host
    // community, never judge commentary; the header says whose words these
    // are so the label travels with any copy of the sheet.
    { header: "Impact Lab review (Claude Community Kenya)", key: "communityReview", width: 70, wrap: true },
  ]
  const sheet = addSheet(workbook, "Submissions", columns, { autoFilter: true })

  for (const team of data.teams) {
    if (!team.submission) continue
    const s = team.submission
    const row = sheet.addRow({
      finalRank: team.finalRank ?? "—",
      team: team.teamName,
      track: team.track,
      project: s.projectName,
      pitch: s.pitch,
      problem: s.problemTackled,
      description: s.description,
      worksVsMocked: s.worksVsMocked,
      claudeUsage: s.claudeUsage,
      repoUrl: s.repoUrl,
      demoUrl: s.demoUrl ?? "",
      videoUrl: s.videoUrl ?? "",
      slidesUrl: s.slidesUrl ?? "",
      scoringBasis: team.scoredFromWriteup ? WRITEUP_NOTE : "Scored at the table (live demo).",
      communityReview: team.communityReview ?? "",
    })
    row.height = estimateRowHeight([
      { text: s.pitch, width: 46 },
      { text: s.problemTackled, width: 40 },
      { text: s.description, width: 56 },
      { text: s.worksVsMocked, width: 46 },
      { text: s.claudeUsage, width: 46 },
      { text: team.communityReview ?? "", width: 70 },
    ])
    if (team.scoredFromWriteup) {
      row.getCell("scoringBasis").font = { size: 9, color: { argb: AMBER_TEXT } }
    }
  }
}

function addJudgingSheet(workbook: ExcelJS.Workbook, data: ResultsExport): void {
  const columns: ColumnSpec[] = [
    { header: "Final placing", key: "finalRank", width: 12, numFmt: "0" },
    { header: "Team", key: "team", width: 26 },
    { header: "Project", key: "project", width: 24 },
    { header: "Track", key: "track", width: 20 },
    { header: "Judge", key: "judge", width: 20 },
    { header: "Judge email", key: "judgeEmail", width: 26 },
    { header: "Scoring basis", key: "basis", width: 20 },
    ...JUDGING_CRITERIA.map((c) => ({
      header: `${c.label} (1–5)`,
      key: `crit_${c.key}`,
      width: 13,
      numFmt: "0",
    })),
    { header: "Weighted total (/100)", key: "total", width: 13, numFmt: SCORE_FMT },
    { header: "Feedback", key: "feedback", width: 70, wrap: true },
  ]
  const sheet = addSheet(workbook, "Judging detail", columns, { autoFilter: true })

  for (const team of data.teams) {
    for (const score of team.judgeScores) {
      const row = sheet.addRow({
        finalRank: team.finalRank ?? "—",
        team: team.teamName,
        project: team.submission?.projectName ?? "—",
        track: team.track,
        judge: score.judgeName,
        judgeEmail: score.judgeEmail,
        basis: score.writeupOnly ? "Written submission" : "Live demo",
        ...Object.fromEntries(
          JUDGING_CRITERIA.map((c) => [`crit_${c.key}`, score.criteria[c.key] ?? "—"])
        ),
        total: score.weightedTotal,
        feedback: score.feedback ?? "",
      })
      if (score.feedback) {
        row.height = estimateRowHeight([{ text: score.feedback, width: 70 }])
      }
      if (score.writeupOnly) {
        row.getCell("basis").font = { size: 9, color: { argb: AMBER_TEXT } }
      }
    }
  }
}

/** One row per judge: coverage and how they used the scale. */
function addJudgesSheet(workbook: ExcelJS.Workbook, data: ResultsExport): void {
  const columns: ColumnSpec[] = [
    { header: "Judge", key: "judge", width: 22 },
    { header: "Judge email", key: "email", width: 28 },
    { header: "Scorecards", key: "sheets", width: 11, numFmt: "0" },
    { header: "Live demos", key: "live", width: 11, numFmt: "0" },
    { header: "From writeups", key: "writeup", width: 12, numFmt: "0" },
    { header: "Written notes left", key: "notes", width: 14, numFmt: "0" },
    { header: "Mean weighted total (/100)", key: "mean", width: 16, numFmt: SCORE_FMT },
  ]
  const sheet = addSheet(workbook, "Judges", columns)
  for (const judge of data.judgeSummaries) {
    sheet.addRow({
      judge: judge.judgeName,
      email: judge.judgeEmail,
      sheets: judge.sheets,
      live: judge.liveSheets,
      writeup: judge.writeupSheets,
      notes: judge.feedbackCount,
      mean: judge.meanWeightedTotal,
    })
  }
  addDataBars(sheet, columns.findIndex((c) => c.key === "mean") + 1, data.judgeSummaries.length, 100)
  const note = sheet.addRow({})
  note.getCell("judge").value =
    "Judges saw different, overlapping sets of teams; mean totals show how each judge used the scale, not a ranking of judges."
  note.getCell("judge").font = { size: 9, italic: true, color: { argb: DIM_TEXT } }
}

/** One row per track: participation, outcome, winner with its basis. */
function addTracksSheet(workbook: ExcelJS.Workbook, data: ResultsExport): void {
  const columns: ColumnSpec[] = [
    { header: "Track", key: "track", width: 26 },
    { header: "Teams formed", key: "formed", width: 12, numFmt: "0" },
    { header: "Teams submitted", key: "submitted", width: 13, numFmt: "0" },
    { header: "Teams scored", key: "scored", width: 12, numFmt: "0" },
    { header: "Mean average (/100)", key: "mean", width: 16, numFmt: SCORE_FMT },
    { header: "Track winner (project)", key: "winnerProject", width: 24 },
    { header: "Track winner (team)", key: "winnerTeam", width: 28 },
    { header: "Winner basis", key: "basis", width: 22 },
  ]
  const sheet = addSheet(workbook, "Tracks", columns)
  for (const track of data.trackSummaries) {
    sheet.addRow({
      track: track.track,
      formed: track.teamsFormed,
      submitted: track.teamsSubmitted,
      scored: track.teamsScored,
      mean: track.meanAverage ?? "—",
      winnerProject: track.winnerProjectName ?? "—",
      winnerTeam: track.winnerTeamName ?? "—",
      basis:
        track.winnerBasis === "announced"
          ? "Announced by judging panel"
          : track.winnerBasis === "score"
            ? "Top of track by score"
            : track.winnerBasis === "organiser"
              ? "Assigned by organisers — see note"
              : "—",
    })
  }
  addDataBars(sheet, columns.findIndex((c) => c.key === "mean") + 1, data.trackSummaries.length, 100)
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
    { header: "What they built", key: "built", width: 52, wrap: true },
    { header: "Who it serves", key: "serves", width: 44, wrap: true },
    { header: "Working vs mocked", key: "working", width: 52, wrap: true },
    { header: "How AI was used", key: "claude", width: 48, wrap: true },
    { header: "Provenance", key: "provenance", width: 40, wrap: true },
  ]
  const sheet = addSheet(workbook, "Project analyses", columns, { autoFilter: true })
  for (const team of data.teams) {
    const analysis = analyses.get(team.teamId)
    if (!analysis || !team.submission) continue
    const row = sheet.addRow({
      finalRank: team.finalRank ?? "—",
      team: team.teamName,
      project: team.submission.projectName,
      built: analysis.whatTheyBuilt,
      serves: analysis.whoItServes,
      working: analysis.workingVsMocked,
      claude: analysis.claudeUse,
      provenance: ANALYSIS_PROVENANCE,
    })
    row.height = estimateRowHeight([
      { text: analysis.whatTheyBuilt, width: 52 },
      { text: analysis.whoItServes, width: 44 },
      { text: analysis.workingVsMocked, width: 52 },
      { text: analysis.claudeUse, width: 48 },
    ])
    row.getCell("provenance").font = { size: 9, italic: true, color: { argb: DIM_TEXT } }
  }
}

function addParticipantsSheet(workbook: ExcelJS.Workbook, data: ResultsExport): void {
  const columns: ColumnSpec[] = [
    { header: "Name", key: "name", width: 26 },
    { header: "Email", key: "email", width: 32 },
    { header: "Team", key: "team", width: 28 },
    { header: "Table", key: "table", width: 10 },
    { header: "Track", key: "track", width: 20 },
    { header: "Project", key: "project", width: 24 },
    { header: "Role", key: "role", width: 22 },
    { header: "Institution", key: "institution", width: 26 },
    { header: "Team leader", key: "leader", width: 11 },
    { header: "Checked in", key: "checkedIn", width: 10 },
  ]
  const sheet = addSheet(workbook, "Participants", columns, { autoFilter: true })

  for (const team of data.teams) {
    for (const member of team.members) {
      sheet.addRow({
        name: member.fullName,
        email: member.email,
        team: team.teamName,
        table: team.tableLabel,
        track: team.track,
        project: team.submission?.projectName ?? "—",
        role: member.primaryRole,
        institution: member.institution ?? "",
        leader: member.isLeader ? "Yes" : "",
        checkedIn: member.checkedIn ? "Yes" : "No",
      })
    }
  }
  for (const member of data.unassignedParticipants) {
    const row = sheet.addRow({
      name: member.fullName,
      email: member.email,
      team: "— not on a team —",
      table: "",
      track: "",
      project: "",
      role: member.primaryRole,
      institution: member.institution ?? "",
      leader: "",
      checkedIn: member.checkedIn ? "Yes" : "No",
    })
    row.getCell("team").font = { color: { argb: DIM_TEXT }, italic: true }
  }
}

async function addSummarySheet(workbook: ExcelJS.Workbook, data: ResultsExport): Promise<void> {
  const sheet = workbook.addWorksheet("Summary")
  sheet.columns = [
    { key: "label", width: 34, style: { alignment: { vertical: "top" } } },
    { key: "value", width: 78, style: { alignment: { vertical: "top", wrapText: true } } },
  ]

  const section = (title: string): void => {
    const row = sheet.addRow({ label: title })
    row.height = 24
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > 2) return
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK } }
      cell.font = { bold: true, size: 10, color: { argb: INK_TEXT } }
      cell.alignment = { vertical: "middle" }
      cell.border = { bottom: { style: "medium", color: { argb: GREEN } } }
    })
  }
  const fact = (label: string, value: string | number, note = false): void => {
    const row = sheet.addRow({ label, value })
    row.getCell("label").font = { bold: true, size: 10 }
    if (note) {
      row.getCell("value").font = { size: 9, color: { argb: AMBER_TEXT } }
      row.height = estimateRowHeight([{ text: String(value), width: 78 }])
    }
  }
  const gap = (): void => {
    sheet.addRow({})
  }

  const branding = await brandingForCohort(data.cohort)

  section("Event")
  fact("Event", branding.title)
  fact("Hosted by", branding.host)
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
  fact("Participants registered", s.participantsRegistered)
  fact("Participants checked in", s.participantsCheckedIn)
  fact("Teams formed", s.teamsFormed)
  fact("Teams that submitted", s.teamsSubmitted)
  fact("Teams scored", s.teamsScored)
  fact("Teams scored from their writeup", s.teamsScoredFromWriteup)
  fact("Judges on the floor", s.judges)
  fact("Scorecards recorded", s.scorecards)
  fact("Mean team score (/100)", s.meanTeamAverage ?? "—")
  fact("Tracks", s.tracks)
  gap()

  section("Winners")
  if (data.announced.length > 0) {
    for (const winner of data.announced) {
      fact(`#${winner.rank} (announced)`, `${winner.projectName} — ${winner.teamName}`)
    }
  } else {
    fact("Announced winners", "Results not yet published.")
  }
  for (const w of data.trackWinners) {
    fact(
      `Track — ${w.track}`,
      `${w.projectName} — ${w.teamName}${
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
  for (const criterion of JUDGING_CRITERIA) {
    fact(`${criterion.label} — ${criterion.weight} pts`, criterion.guidance, true)
  }
  fact(
    "Scale",
    Object.entries(SCORE_LABELS)
      .map(([n, label]) => `${n} = ${label}`)
      .join(" · ") +
      ". A criterion contributes (score - 1) / 4 of its weight; a team's number is the mean of " +
      "its judges' weighted totals.",
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
    "This workbook carries participant emails and is the organisers' operational record — " +
      "treat it accordingly. The PDF built for sharing omits all contact details.",
    true
  )
  gap()

  section("How to read this workbook")
  fact(
    "Final placing vs score rank",
    "The judging panel deliberated and announced the podium; the raw score averages order the rest. " +
      "“Final placing” is the published result (announced winners first), “Score rank” is the raw " +
      "average order — the two columns disagree by design, and each row's “Placing basis” says " +
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
 * Build the workbook — Results, Submissions, Judging detail, Judges, Tracks,
 * Project analyses (when generated), Participants, Summary — and return it as
 * a Node buffer to stream. A missing analyses map simply omits that sheet
 * (the fail-soft rule from export-analysis).
 */
export async function buildResultsWorkbook(
  data: ResultsExport,
  analyses: ReadonlyMap<string, TeamAnalysis> = new Map()
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = (await brandingForCohort(data.cohort)).host
  workbook.created = data.generatedAt

  addResultsSheet(workbook, data)
  addSubmissionsSheet(workbook, data)
  addJudgingSheet(workbook, data)
  addJudgesSheet(workbook, data)
  addTracksSheet(workbook, data)
  addAnalysesSheet(workbook, data, analyses)
  addParticipantsSheet(workbook, data)
  await addSummarySheet(workbook, data)

  return Buffer.from(await workbook.xlsx.writeBuffer())
}
