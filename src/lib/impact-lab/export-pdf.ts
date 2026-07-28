/**
 * Impact Lab results export — the PDF.
 *
 * The artefact that leaves the building: the permanent record of Kenya's
 * first Claude hackathon, built to be read by Anthropic. A4, print-first,
 * greyscale-safe. Structure: cover → contents → how this record was produced
 * → the event in numbers (infographics) → winners → full ranking → one
 * profile per team → appendix. Server-only (pdfkit, streamed to a buffer —
 * nothing touches disk).
 *
 * The honesty rules, enforced in layout as much as in words:
 *
 * 1. Announced placings are the panel's decision; score order is shown
 *    separately as what it is. Every placing names its basis.
 * 2. Writeup-scored teams carry that basis wherever their scores appear — a
 *    note on how the score was produced, never a mark against the team.
 * 3. Judge notes are printed verbatim and attributed; generated project
 *    analyses are labelled with their provenance every time they appear and
 *    never sit inside the judging section.
 * 4. Participant contact details never enter this document — names and roles
 *    only. The Excel workbook is the organisers' operational record.
 */

import PDFDocument from "pdfkit"
import { JUDGING_CRITERIA, SCORE_LABELS } from "./judging"
import {
  EVENT_DATES,
  EVENT_FORMAT_NOTE,
  EVENT_HOST,
  EVENT_LOCATION,
  EVENT_TITLE,
  type ExportTeam,
  type ResultsExport,
} from "./export-data"
import { ANALYSIS_LABEL, ANALYSIS_PROVENANCE, type TeamAnalysis } from "./export-analysis"
import {
  drawDotRows,
  drawHBars,
  drawHistogram,
  drawStatTiles,
  type DotRow,
  type HBarRow,
  type HistogramBin,
} from "./export-pdf-charts"
import {
  CALLOUT_BG,
  CLAY,
  CLAY_DEEP,
  DIM,
  FAINT,
  INK,
  MID_GRAY,
  OLIVE,
  PAPER,
  RULE,
  SANS,
  SANS_BOLD,
  SANS_ITALIC,
  SERIF,
  SERIF_ITALIC,
} from "./export-theme"

// ─── Geometry ────────────────────────────────────────────────────────────────

const MARGIN = 56
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const FOOTER_Y = PAGE_HEIGHT - 40
const CONTENT_BOTTOM = FOOTER_Y - 18
const HEADER_Y = 26

const WRITEUP_NOTE =
  "Scored from the written submission — no judge reached this table during live demos. " +
  "The team submitted on time; this is a note on how the score was produced, not on the team."

type Doc = PDFKit.PDFDocument

// ─── Document state (contents + running headers) ─────────────────────────────

interface TocEntry {
  title: string
  /** Printed page number (1-based). */
  page: number
  /** 0 = section, 1 = team profile within the profiles section. */
  level: number
}

interface RenderState {
  toc: TocEntry[]
  /** Page the contents will be written onto, reserved early. */
  tocPageIndex: number
}

/** Printed number of the page currently being written. */
function currentPage(doc: Doc): number {
  return doc.bufferedPageRange().count
}

function markSection(doc: Doc, state: RenderState, title: string, level = 0): void {
  state.toc.push({ title, page: currentPage(doc), level })
}

// ─── Small helpers ───────────────────────────────────────────────────────────

/** Start a new page when fewer than `needed` points remain above the footer. */
function ensureSpace(doc: Doc, needed: number): void {
  if (doc.y + needed > CONTENT_BOTTOM) doc.addPage()
}

/** Small-caps kicker in clay — the label above every heading. */
function kicker(doc: Doc, text: string, color = CLAY_DEEP): void {
  doc
    .font(SANS_BOLD)
    .fontSize(7.5)
    .fillColor(color)
    .text(text.toUpperCase(), MARGIN, doc.y, { characterSpacing: 1.4, width: CONTENT_WIDTH })
  doc.moveDown(0.4)
}

/** A section opener: fresh page, kicker, serif display heading, lede. */
function sectionOpener(doc: Doc, label: string, heading: string, lede?: string): void {
  doc.addPage()
  doc.y = MARGIN + 8
  kicker(doc, label)
  doc.font(SERIF).fontSize(24).fillColor(INK).text(heading, { width: CONTENT_WIDTH })
  if (lede) {
    doc.moveDown(0.4)
    doc.font(SANS).fontSize(9.5).fillColor(DIM).text(lede, { width: CONTENT_WIDTH * 0.86, lineGap: 3 })
  }
  doc.moveDown(0.7)
  rule(doc, INK, 1)
  doc.moveDown(0.9)
}

function rule(doc: Doc, color = RULE, width = 0.6): void {
  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(MARGIN + CONTENT_WIDTH, doc.y)
    .lineWidth(width)
    .strokeColor(color)
    .stroke()
  doc.moveDown(0.5)
}

function paragraph(doc: Doc, label: string, text: string): void {
  const body = text.trim() || "—"
  ensureSpace(
    doc,
    24 + doc.font(SANS).fontSize(9).heightOfString(body, { width: CONTENT_WIDTH, lineGap: 2.5 })
  )
  doc
    .font(SANS_BOLD)
    .fontSize(7)
    .fillColor(FAINT)
    .text(label.toUpperCase(), MARGIN, doc.y, { characterSpacing: 1.1, width: CONTENT_WIDTH })
  doc.moveDown(0.25)
  doc.font(SANS).fontSize(9).fillColor(INK).text(body, MARGIN, doc.y, {
    width: CONTENT_WIDTH,
    lineGap: 2.5,
  })
  doc.moveDown(0.85)
}

/** A filled callout box. Returns nothing; advances doc.y past the box. */
function callout(doc: Doc, body: string, options: { fill?: string; ink?: string } = {}): void {
  const width = CONTENT_WIDTH - 28
  doc.font(SANS).fontSize(8.5)
  const h = doc.heightOfString(body, { width, lineGap: 2.5 }) + 18
  ensureSpace(doc, h + 6)
  const top = doc.y
  doc.roundedRect(MARGIN, top, CONTENT_WIDTH, h, 3).fillColor(options.fill ?? CALLOUT_BG).fill()
  doc.rect(MARGIN, top, 2.5, h).fillColor(CLAY).fill()
  doc
    .font(SANS)
    .fontSize(8.5)
    .fillColor(options.ink ?? DIM)
    .text(body, MARGIN + 14, top + 9, { width, lineGap: 2.5 })
  doc.x = MARGIN
  doc.y = top + h + 12
}

function placingKicker(team: ExportTeam): string {
  if (team.finalRank !== null) {
    const basis =
      team.finalRankBasis === "announced"
        ? "announced by the judging panel"
        : team.finalRankBasis === "submission"
          ? "score order · writeup-scored"
          : "score order"
    return `Final placing #${team.finalRank} · ${basis}`
  }
  return team.average !== null ? `Score rank #${team.scoreRank} · unpublished` : "Not scored"
}

const fmt1 = (value: number): string => value.toFixed(1)

// ─── Cover ───────────────────────────────────────────────────────────────────

/**
 * The cover: warm paper, clay band, serif display title, the event in six
 * figures, and the provenance line. Longer than 50 lines because a cover is
 * one composition — splitting it would scatter its geometry.
 */
function renderCover(doc: Doc, data: ResultsExport): void {
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fillColor(PAPER).fill()
  doc.rect(0, 0, PAGE_WIDTH, 10).fillColor(CLAY).fill()

  // Wordmark row: host left, cohort right.
  doc
    .font(SANS_BOLD)
    .fontSize(8.5)
    .fillColor(INK)
    .text(EVENT_HOST.toUpperCase(), MARGIN, 64, { characterSpacing: 2.2, width: CONTENT_WIDTH })
  doc
    .font(SANS)
    .fontSize(8.5)
    .fillColor(FAINT)
    .text(data.cohort, MARGIN, 64, { width: CONTENT_WIDTH, align: "right" })

  doc.y = 168
  kicker(doc, "Hackathon results — the complete record", CLAY_DEEP)
  doc.font(SERIF).fontSize(44).fillColor(INK).text("Impact Lab:", MARGIN, doc.y, {
    width: CONTENT_WIDTH,
  })
  doc.font(SERIF).fontSize(44).fillColor(CLAY).text("AI Mashinani", MARGIN, doc.y - 6, {
    width: CONTENT_WIDTH,
  })
  doc.moveDown(0.5)
  doc
    .font(SANS)
    .fontSize(11)
    .fillColor(DIM)
    .text(`${EVENT_DATES} · ${EVENT_LOCATION}`, MARGIN, doc.y, { width: CONTENT_WIDTH })
  doc.moveDown(0.3)
  doc
    .font(SERIF_ITALIC)
    .fontSize(10.5)
    .fillColor(DIM)
    .text(EVENT_FORMAT_NOTE, MARGIN, doc.y, { width: CONTENT_WIDTH * 0.8, lineGap: 2.5 })

  doc.y += 30
  rule(doc, INK, 1)
  doc.y += 12

  const s = data.summary
  drawStatTiles(
    doc,
    MARGIN,
    doc.y,
    CONTENT_WIDTH,
    [
      { value: String(s.participantsRegistered), label: "Builders" },
      { value: String(s.teamsFormed), label: "Teams formed" },
      { value: String(s.teamsSubmitted), label: "Projects submitted" },
      { value: String(s.judges), label: "Judges" },
      { value: String(s.scorecards), label: "Scorecards" },
      { value: String(s.tracks), label: "Tracks" },
    ],
    3
  )
  doc.y += 2 * 58 + 12
  rule(doc, INK, 1)

  // Champion line — the one result worth putting on the front.
  const champion = data.announced.find((w) => w.rank === 1)
  if (champion) {
    doc.y += 14
    kicker(doc, "Champion, as announced", CLAY_DEEP)
    doc
      .font(SERIF)
      .fontSize(17)
      .fillColor(INK)
      .text(`${champion.projectName} — ${champion.teamName}`, MARGIN, doc.y, {
        width: CONTENT_WIDTH,
      })
  }

  // Writing inside the bottom margin would auto-add a page (the pdfkit
  // gotcha renderFurniture also dodges) — lift the margin for the footer.
  doc.page.margins.bottom = 0
  doc
    .font(SANS)
    .fontSize(7.5)
    .fillColor(FAINT)
    .text(
      `Generated ${data.generatedAt.toISOString().slice(0, 10)}` +
        (data.published && data.publishedAt
          ? ` · Results published ${data.publishedAt.slice(0, 10)}`
          : " · Results not yet published") +
        ` · Hosted by ${EVENT_HOST}`,
      MARGIN,
      FOOTER_Y - 14,
      { width: CONTENT_WIDTH, lineBreak: false }
    )
  doc.page.margins.bottom = 60
}

// ─── Contents (reserved page, filled after rendering) ────────────────────────

function reserveContentsPage(doc: Doc, state: RenderState): void {
  doc.addPage()
  state.tocPageIndex = doc.bufferedPageRange().count - 1
}

/**
 * Fill the reserved contents page. Two columns when the team list is long —
 * every profile is listed because "find one team fast" is the reader's most
 * likely task. Longer than 50 lines: one composition, one place.
 */
function renderContents(doc: Doc, state: RenderState): void {
  doc.switchToPage(state.tocPageIndex)
  doc.y = MARGIN + 8
  kicker(doc, "Contents")
  doc.font(SERIF).fontSize(24).fillColor(INK).text("What is in this record", MARGIN, doc.y, {
    width: CONTENT_WIDTH,
  })
  doc.moveDown(0.7)
  rule(doc, INK, 1)
  doc.moveDown(0.6)

  const sections = state.toc.filter((e) => e.level === 0)
  const teams = state.toc.filter((e) => e.level === 1)

  let y = doc.y
  for (const entry of sections) {
    doc.font(SANS_BOLD).fontSize(9.5).fillColor(INK).text(entry.title, MARGIN, y, {
      width: CONTENT_WIDTH - 40,
      lineBreak: false,
    })
    doc
      .font(SANS)
      .fontSize(9.5)
      .fillColor(DIM)
      .text(String(entry.page), MARGIN, y, { width: CONTENT_WIDTH, align: "right", lineBreak: false })
    y += 17
  }

  if (teams.length > 0) {
    y += 8
    doc
      .font(SANS_BOLD)
      .fontSize(7)
      .fillColor(FAINT)
      .text("TEAM PROFILES", MARGIN, y, { characterSpacing: 1.2 })
    y += 14

    const colWidth = (CONTENT_WIDTH - 24) / 2
    const perColumn = Math.ceil(teams.length / 2)
    teams.forEach((entry, i) => {
      const col = Math.floor(i / perColumn)
      const x = MARGIN + col * (colWidth + 24)
      const ey = y + (i % perColumn) * 13.5
      if (ey > CONTENT_BOTTOM - 10) return
      doc.font(SANS).fontSize(8).fillColor(INK).text(entry.title, x, ey, {
        width: colWidth - 26,
        lineBreak: false,
        ellipsis: true,
      })
      doc
        .font(SANS)
        .fontSize(8)
        .fillColor(FAINT)
        .text(String(entry.page), x, ey, { width: colWidth, align: "right", lineBreak: false })
    })
  }
}

// ─── How this record was produced ────────────────────────────────────────────

/**
 * The provenance section, near the front on purpose: a reader should never
 * have to guess how any number or sentence in this document came to be.
 * Longer than 50 lines because it is one continuous argument.
 */
function renderMethodology(doc: Doc, data: ResultsExport, state: RenderState): void {
  sectionOpener(
    doc,
    "Methodology",
    "How this record was produced",
    "Everything in this document traces to one of three sources: the judges' scorecards, " +
      "the teams' own submissions, or the organisers' registration records. This page says " +
      "which is which."
  )
  markSection(doc, state, "How this record was produced")

  // 1 — Scoring model.
  kicker(doc, "The scoring model")
  doc
    .font(SANS)
    .fontSize(9)
    .fillColor(INK)
    .text(
      // Plain ASCII arithmetic: U+2212 and U+2044 fall outside pdfkit's
      // WinAnsi standard-font encoding and print as garbage.
      "Judges scored each project on five published criteria, 1 to 5, anchored the same way for " +
        "everyone. A score of 1 means “not shown” and earns none of that criterion's weight; the " +
        "scale is normalised so a criterion contributes (score - 1) / 4 of its weight, out of 100. " +
        "A team's number is the mean of its judges' weighted totals — judges are averaged, not " +
        "summed, so a team seen by two judges is not beaten by an identical team seen by four.",
      MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, lineGap: 2.5 }
    )
  doc.moveDown(0.8)

  // Criteria table: label, weight, guidance.
  const wCrit = 150
  const wWeight = 46
  for (const criterion of JUDGING_CRITERIA) {
    const top = doc.y
    doc.font(SANS_BOLD).fontSize(8.5).fillColor(INK).text(criterion.label, MARGIN, top, {
      width: wCrit - 8,
    })
    doc
      .font(SANS_BOLD)
      .fontSize(8.5)
      .fillColor(CLAY_DEEP)
      .text(`${criterion.weight} pts`, MARGIN + wCrit, top, { width: wWeight, lineBreak: false })
    doc
      .font(SANS)
      .fontSize(8.5)
      .fillColor(DIM)
      .text(criterion.guidance, MARGIN + wCrit + wWeight, top, {
        width: CONTENT_WIDTH - wCrit - wWeight,
        lineGap: 2,
      })
    doc.x = MARGIN
    doc.moveDown(0.55)
  }
  doc
    .font(SANS)
    .fontSize(7.5)
    .fillColor(FAINT)
    .text(
      "Scale anchors: " +
        Object.entries(SCORE_LABELS)
          .map(([n, label]) => `${n} = ${label}`)
          .join(" · "),
      MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, lineGap: 2 }
    )
  doc.moveDown(1.1)

  // 2 — Coverage and the writeup rule.
  const scoredTeams = data.teams.filter((t) => t.judgeCount > 0)
  const coverageMin = Math.min(...scoredTeams.map((t) => t.judgeCount))
  const coverageMax = Math.max(...scoredTeams.map((t) => t.judgeCount))
  kicker(doc, "Who saw whom")
  doc
    .font(SANS)
    .fontSize(9)
    .fillColor(INK)
    .text(
      `${data.summary.judges} judges worked the floor and recorded ${data.summary.scorecards} ` +
        `scorecards across ${scoredTeams.length} teams. Judging ran overnight, and no judge could ` +
        `reach every table: coverage ranged from ${coverageMin} to ${coverageMax} judges per team, ` +
        `and each team's profile states how many judges saw it. ` +
        `${data.summary.teamsScoredFromWriteup} team${data.summary.teamsScoredFromWriteup === 1 ? " was" : "s were"} ` +
        "scored from their written submission because no judge reached their table during live " +
        "demos — that basis is marked wherever those scores appear, as a note on how the score " +
        "was produced, never on the team.",
      MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, lineGap: 2.5 }
    )
  doc.moveDown(1.1)

  // 3 — The podium.
  kicker(doc, "How the winners were decided")
  doc
    .font(SANS)
    .fontSize(9)
    .fillColor(INK)
    .text(
      "The podium was decided by the judging panel in deliberation, after watching the demos — " +
        "not by the raw score order, which it does not reproduce. Both orderings appear in this " +
        "document, each labelled as what it is: “announced” placings are the panel's decision; " +
        "“score order” is the arithmetic. Neither is silently dressed as the other.",
      MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, lineGap: 2.5 }
    )
  doc.moveDown(1.1)

  // 4 — Written words: what the judges left, and what was written afterwards.
  const judgesWithNotes = data.judgeSummaries.filter((j) => j.feedbackCount > 0)
  const notesTotal = judgesWithNotes.reduce((sum, j) => sum + j.feedbackCount, 0)
  const teamsWithNotes = data.teams.filter((t) =>
    t.judgeScores.some((score) => score.feedback !== null)
  ).length
  kicker(doc, "Whose words are whose")
  doc
    .font(SANS)
    .fontSize(9)
    .fillColor(INK)
    .text(
      (judgesWithNotes.length === 0
        ? "No judge left written notes during scoring. "
        : judgesWithNotes.length === 1
          ? `Written notes were left by one judge, ${judgesWithNotes[0].judgeName}, on ` +
            `${notesTotal} scorecard${notesTotal === 1 ? "" : "s"} covering ${teamsWithNotes} ` +
            `project${teamsWithNotes === 1 ? "" : "s"} — brief working notes, printed verbatim and ` +
            "attributed on the team profiles. "
          : `Written notes were left by ${judgesWithNotes.length} judges on ${notesTotal} ` +
            `scorecards covering ${teamsWithNotes} projects, printed verbatim and attributed on ` +
            "the team profiles. ") +
        "No judge's words have been extended, paraphrased, or invented anywhere in this document.",
      MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, lineGap: 2.5 }
    )
  doc.moveDown(0.7)
  callout(
    doc,
    `Each team profile also carries a “${ANALYSIS_LABEL}” — a descriptive account written after ` +
      "the event, drawn solely from that team's own submission. The analyses describe what each " +
      "team built, who it serves, what was working versus mocked, and how Claude was used — in " +
      "the team's own terms, with nothing inferred beyond what they wrote. They are labelled " +
      "wherever they appear and are not judge commentary."
  )

  // 5 — Privacy.
  kicker(doc, "What is deliberately left out")
  doc
    .font(SANS)
    .fontSize(9)
    .fillColor(INK)
    .text(
      "This document names builders and their roles — that is the record. Personal contact " +
        "details (email addresses) are deliberately omitted for every participant and judge. The " +
        "companion Excel workbook, held by the organisers, is the operational record.",
      MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, lineGap: 2.5 }
    )
}

// ─── The event in numbers ────────────────────────────────────────────────────

function scoreBins(teams: ExportTeam[]): HistogramBin[] {
  const bins: HistogramBin[] = Array.from({ length: 10 }, (_, i) => ({
    label: `${i * 10}–${i * 10 + 10}`,
    count: 0,
  }))
  for (const team of teams) {
    if (team.average === null) continue
    const index = Math.min(9, Math.floor(team.average / 10))
    bins[index].count += 1
  }
  return bins
}

/**
 * The infographic spread: distribution, tracks, coverage, and the judge
 * panel — every figure computed from the data, none asserted. Longer than 50
 * lines because it is one composed page of charts.
 */
function renderEventInNumbers(doc: Doc, data: ResultsExport, state: RenderState): void {
  sectionOpener(
    doc,
    "The field",
    "The event in numbers",
    "How the scores fell across the whole field — read alongside the methodology on the " +
      "previous page. Score charts show weighted averages out of 100; the podium was decided " +
      "by the panel, not by these charts."
  )
  markSection(doc, state, "The event in numbers")

  // Score distribution.
  kicker(doc, "Score distribution", DIM)
  doc
    .font(SANS)
    .fontSize(8)
    .fillColor(FAINT)
    .text("Teams by weighted average (/100)", MARGIN, doc.y, { width: CONTENT_WIDTH })
  doc.moveDown(0.5)
  doc.y += drawHistogram(doc, MARGIN + 16, doc.y, CONTENT_WIDTH - 16, 90, scoreBins(data.teams))
  doc.moveDown(1.2)

  // Tracks: mean score, with participation in the sublabel.
  kicker(doc, "The five tracks", DIM)
  const trackRows: HBarRow[] = data.trackSummaries
    .filter((t) => t.track !== "Unassigned" || t.teamsFormed > 0)
    .map((t) => ({
      label: t.track,
      sublabel: `${t.teamsFormed} teams · ${t.teamsSubmitted} submitted · ${t.teamsScored} scored`,
      value: t.meanAverage ?? 0,
      valueLabel: t.meanAverage !== null ? fmt1(t.meanAverage) : "—",
    }))
  doc.y += drawHBars(doc, MARGIN, doc.y, CONTENT_WIDTH, trackRows, {
    max: 100,
    labelWidth: 168,
    scaleNote: "Mean of scored teams' weighted averages, 0–100. Track sizes differ — see sublabels.",
  })
  doc.moveDown(1.2)

  // Coverage.
  ensureSpace(doc, 120)
  kicker(doc, "Judging coverage", DIM)
  const coverageRows: HBarRow[] = data.coverage.map((bucket) => ({
    label: `Seen by ${bucket.judgeCount} judge${bucket.judgeCount === 1 ? "" : "s"}`,
    value: bucket.teams,
    valueLabel: String(bucket.teams),
  }))
  const maxCoverage = Math.max(1, ...data.coverage.map((b) => b.teams))
  doc.y += drawHBars(doc, MARGIN, doc.y, CONTENT_WIDTH, coverageRows, {
    max: maxCoverage,
    labelWidth: 168,
    rowHeight: 16,
    scaleNote: "Number of scored teams.",
  })
  doc.moveDown(1.2)

  // The judge panel gets the facing page: a half-page of dots and a finding,
  // not squeezed under the coverage bars.
  doc.addPage()
  doc.y = MARGIN + 8
  kicker(doc, "The judge panel", DIM)
  doc
    .font(SANS)
    .fontSize(8)
    .fillColor(FAINT)
    .text(
      "Each judge's mean weighted total across their own scorecards (/100). Judges saw " +
        "different, overlapping sets of teams, so these are calibration profiles — not rankings " +
        "of the judges and not comparable head-to-head.",
      MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, lineGap: 2 }
    )
  doc.moveDown(0.6)
  const judgeRows: DotRow[] = data.judgeSummaries.map((j) => ({
    label: j.judgeName,
    sublabel:
      `${j.sheets} sheet${j.sheets === 1 ? "" : "s"}` +
      (j.writeupSheets > 0 ? ` · ${j.writeupSheets} from writeups` : "") +
      (j.feedbackCount > 0 ? ` · ${j.feedbackCount} written notes` : ""),
    dots: [j.meanWeightedTotal],
  }))
  doc.y += drawDotRows(doc, MARGIN, doc.y, CONTENT_WIDTH, judgeRows, {
    max: 100,
    labelWidth: 168,
    rowHeight: 28,
  })
  doc.moveDown(0.6)

  // The spread finding — computed, not asserted.
  const judgeMeans = data.judgeSummaries.map((j) => j.meanWeightedTotal)
  const widest = data.teams
    .filter((t) => t.judgeCount >= 2 && t.scoreLow !== null && t.scoreHigh !== null)
    .reduce<ExportTeam | null>(
      (top, t) =>
        top === null ||
        (t.scoreHigh ?? 0) - (t.scoreLow ?? 0) > (top.scoreHigh ?? 0) - (top.scoreLow ?? 0)
          ? t
          : top,
      null
    )
  if (judgeMeans.length >= 2 && widest?.submission) {
    callout(
      doc,
      `The spread is part of the record. Judge means ranged from ${fmt1(Math.min(...judgeMeans))} ` +
        `to ${fmt1(Math.max(...judgeMeans))} — the panel used the scale differently, which is why ` +
        `teams are averaged across their judges rather than summed. The widest disagreement on a ` +
        `single project was ${widest.submission.projectName}, where ${widest.judgeCount} judges ` +
        `scored from ${fmt1(widest.scoreLow ?? 0)} to ${fmt1(widest.scoreHigh ?? 0)}. Honest ` +
        "disagreement between judges who saw different moments of a live demo is what a real " +
        "panel looks like; each profile shows its own spread."
    )
  }
}

// ─── Winners ─────────────────────────────────────────────────────────────────

/** Podium cards and the track winners table. One composition, one place. */
function renderWinners(doc: Doc, data: ResultsExport, state: RenderState): void {
  sectionOpener(
    doc,
    "Results",
    "The winners",
    data.announced.length > 0
      ? "As announced in the room by the judging panel after deliberation."
      : "Results have not been published; the leaders below are ordered by score alone."
  )
  markSection(doc, state, "The winners")

  const medals = ["Champion", "First runner-up", "Second runner-up"]
  const teamByName = new Map(data.teams.map((t) => [t.teamName, t]))
  for (const winner of data.announced) {
    ensureSpace(doc, 74)
    const top = doc.y
    const team = teamByName.get(winner.teamName)
    const isChampion = winner.rank === 1
    const boxHeight = 58
    if (isChampion) {
      doc.roundedRect(MARGIN, top, CONTENT_WIDTH, boxHeight, 3).fillColor(PAPER).fill()
      doc.roundedRect(MARGIN, top, CONTENT_WIDTH, boxHeight, 3).lineWidth(1).strokeColor(CLAY).stroke()
    }
    doc.rect(MARGIN, top, 3, boxHeight).fillColor(isChampion ? CLAY : MID_GRAY).fill()
    doc
      .font(SANS_BOLD)
      .fontSize(7.5)
      .fillColor(isChampion ? CLAY_DEEP : DIM)
      .text((medals[winner.rank - 1] ?? `#${winner.rank}`).toUpperCase(), MARGIN + 16, top + 9, {
        characterSpacing: 1.4,
      })
    doc
      .font(SERIF)
      .fontSize(18)
      .fillColor(INK)
      .text(winner.projectName, MARGIN + 16, top + 20, { width: CONTENT_WIDTH - 32, lineBreak: false })
    doc
      .font(SANS)
      .fontSize(8.5)
      .fillColor(DIM)
      // The team name already carries table and track — nothing to append.
      .text(
        winner.teamName +
          (team?.average !== null && team?.average !== undefined
            ? `  ·  panel average ${fmt1(team.average)}/100`
            : ""),
        MARGIN + 16,
        top + 41,
        { width: CONTENT_WIDTH - 32, lineBreak: false }
      )
    doc.y = top + boxHeight + 12
  }

  doc.moveDown(0.8)
  kicker(doc, "Track winners")
  doc.moveDown(0.2)
  for (const w of data.trackWinners) {
    ensureSpace(doc, 26)
    const top = doc.y
    const middle = `${w.projectName} — ${w.teamName}`
    const middleWidth = CONTENT_WIDTH - 184 - 70
    // Rows advance by measured height so a wrapping name never overstrikes
    // the next row.
    doc.font(SANS).fontSize(9)
    const rowHeight = Math.max(14, doc.heightOfString(middle, { width: middleWidth }) + 2)
    doc.font(SANS_BOLD).fontSize(9).fillColor(INK).text(w.track, MARGIN, top, {
      width: 176,
      lineBreak: false,
    })
    doc.font(SANS).fontSize(9).fillColor(INK).text(middle, MARGIN + 184, top, {
      width: middleWidth,
    })
    doc
      .font(SANS_ITALIC)
      .fontSize(7.5)
      .fillColor(FAINT)
      .text(
        w.basis === "announced" ? "announced" : "by score",
        MARGIN + CONTENT_WIDTH - 62,
        top + 1,
        { width: 62, align: "right", lineBreak: false }
      )
    doc.x = MARGIN
    doc.y = top + rowHeight + 4
    doc
      .moveTo(MARGIN, doc.y - 3)
      .lineTo(MARGIN + CONTENT_WIDTH, doc.y - 3)
      .lineWidth(0.4)
      .strokeColor(RULE)
      .stroke()
  }
  doc.moveDown(0.6)
  doc
    .font(SANS)
    .fontSize(7.5)
    .fillColor(FAINT)
    .text(
      "“Announced” track winners follow from the podium (the champion leads its own track); " +
        "“by score” winners top their track on weighted average.",
      MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, lineGap: 2 }
    )
}

// ─── Full ranking ────────────────────────────────────────────────────────────

// The team name is "Table N — Track", so a Team column would print the table
// and track twice; Table + Track columns carry the same facts without the
// noise. Headers sized to stay on one line at 7pt.
const RANK_COLS = [
  { label: "#", width: 24 },
  { label: "Project", width: 132 },
  { label: "Table", width: 48 },
  { label: "Track", width: 100 },
  { label: "Avg /100", width: 42 },
  { label: "Range", width: 60 },
  { label: "Judges", width: 38 },
  { label: "Basis", width: 39 },
] as const

function rankingHeader(doc: Doc): void {
  if (doc.y < MARGIN + 8) doc.y = MARGIN + 8
  let x = MARGIN
  doc.font(SANS_BOLD).fontSize(7).fillColor(DIM)
  const top = doc.y
  for (const col of RANK_COLS) {
    doc.text(col.label.toUpperCase(), x, top, { width: col.width - 6, characterSpacing: 0.5 })
    x += col.width
  }
  doc.x = MARGIN
  doc.y = top + 12
  rule(doc, INK, 0.9)
}

/**
 * The full ranking, one row per team, announced placings tinted paper-warm
 * with a clay spine. Longer than 50 lines because a multi-page table needs
 * its row layout, page breaks and header re-draws in one place.
 */
function renderRanking(doc: Doc, data: ResultsExport, state: RenderState): void {
  sectionOpener(
    doc,
    "Results",
    "Every team, and how its placing was decided",
    "Placings 1–3 were announced by the panel; every other scored team follows in raw score " +
      "order. The averages are the archival record — they order this list, they did not decide " +
      "the podium."
  )
  markSection(doc, state, "Full ranking")
  rankingHeader(doc)

  const ranked = data.teams.filter((t) => t.average !== null)
  for (const team of ranked) {
    const cells = [
      team.finalRank !== null ? String(team.finalRank) : `(${team.scoreRank})`,
      team.submission?.projectName ?? "—",
      team.tableLabel,
      team.track,
      team.average !== null ? fmt1(team.average) : "—",
      team.scoreLow !== null && team.scoreHigh !== null && team.judgeCount > 1
        ? `${fmt1(team.scoreLow)}–${fmt1(team.scoreHigh)}`
        : "—",
      String(team.judgeCount),
      team.finalRankBasis === "announced" ? "panel" : team.scoredFromWriteup ? "score †" : "score",
    ]
    doc.font(SANS).fontSize(8)
    const rowHeight =
      Math.max(
        ...cells.map((text, i) => doc.heightOfString(text, { width: RANK_COLS[i].width - 6 }))
      ) + 7
    if (doc.y + rowHeight > CONTENT_BOTTOM) {
      doc.addPage()
      doc.y = MARGIN + 8
      rankingHeader(doc)
    }
    const top = doc.y
    if (team.finalRankBasis === "announced") {
      doc.rect(MARGIN - 6, top - 3, CONTENT_WIDTH + 12, rowHeight).fillColor(CALLOUT_BG).fill()
      doc.rect(MARGIN - 6, top - 3, 2.5, rowHeight).fillColor(CLAY).fill()
    }
    let x = MARGIN
    cells.forEach((text, i) => {
      doc
        .font(i === 1 ? SANS_BOLD : SANS)
        .fontSize(8)
        .fillColor(i === 3 || i === 5 || i === 7 ? DIM : INK)
        .text(text, x, top, { width: RANK_COLS[i].width - 6 })
      x += RANK_COLS[i].width
    })
    doc.x = MARGIN
    doc.y = top + rowHeight
    doc
      .moveTo(MARGIN, doc.y - 3)
      .lineTo(MARGIN + CONTENT_WIDTH, doc.y - 3)
      .lineWidth(0.4)
      .strokeColor(RULE)
      .stroke()
  }

  doc.moveDown(0.6)
  doc
    .font(SANS)
    .fontSize(7.5)
    .fillColor(CLAY_DEEP)
    .text("†  " + WRITEUP_NOTE, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 2 })
  doc.moveDown(0.4)
  doc
    .font(SANS)
    .fontSize(7.5)
    .fillColor(DIM)
    .text(
      "“Judge range” is the lowest and highest weighted total among that team's judges — the " +
        "spread discussed in “The event in numbers”.",
      MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, lineGap: 2 }
    )

  const unscored = data.teams.filter((t) => t.average === null)
  if (unscored.length > 0) {
    doc.moveDown(1)
    kicker(doc, "Teams without a score", DIM)
    doc
      .font(SANS)
      .fontSize(8)
      .fillColor(DIM)
      .text(
        unscored
          .map((t) => `${t.teamName}${t.submission ? ` — ${t.submission.projectName}` : ""}`)
          .join("  ·  "),
        MARGIN,
        doc.y,
        { width: CONTENT_WIDTH, lineGap: 2.5 }
      )
  }
}

// ─── Team profiles ───────────────────────────────────────────────────────────

function renderMembers(doc: Doc, team: ExportTeam): void {
  kicker(doc, "The team", DIM)
  if (team.members.length === 0) {
    doc
      .font(SANS)
      .fontSize(8.5)
      .fillColor(DIM)
      .text("No roster was frozen for this team.", MARGIN, doc.y, { width: CONTENT_WIDTH })
    doc.moveDown(0.8)
    return
  }
  const lines = team.members.map(
    (m) =>
      `${m.fullName}${m.isLeader ? " (lead)" : ""} — ${m.primaryRole}` +
      (m.institution ? `, ${m.institution}` : "")
  )
  // Two columns: rosters are 3–7 people; one per line reads best, half-page wide.
  const colWidth = (CONTENT_WIDTH - 20) / 2
  const perColumn = Math.ceil(lines.length / 2)
  const top = doc.y
  let maxY = top
  lines.forEach((line, i) => {
    const col = Math.floor(i / perColumn)
    const x = MARGIN + col * (colWidth + 20)
    const y = top + (i % perColumn) * 12.5
    doc.font(SANS).fontSize(8.5).fillColor(INK).text(line, x, y, {
      width: colWidth,
      lineBreak: false,
      ellipsis: true,
    })
    maxY = Math.max(maxY, y + 12.5)
  })
  doc.x = MARGIN
  doc.y = maxY + 8
}

/** The generated analysis, boxed and labelled so it can never be misread. */
function renderAnalysis(doc: Doc, analysis: TeamAnalysis): void {
  const parts: [string, string][] = [
    ["What they built", analysis.whatTheyBuilt],
    ["Who it serves", analysis.whoItServes],
    ["Working vs mocked", analysis.workingVsMocked],
    ["How Claude was used", analysis.claudeUse],
  ]
  const innerWidth = CONTENT_WIDTH - 28
  doc.font(SANS).fontSize(8.5)
  const bodyHeight = parts.reduce(
    (sum, [, text]) => sum + 11 + doc.heightOfString(text, { width: innerWidth, lineGap: 2.2 }) + 7,
    0
  )
  const boxHeight = bodyHeight + 40
  ensureSpace(doc, Math.min(boxHeight + 8, CONTENT_BOTTOM - MARGIN))
  const top = doc.y
  doc.roundedRect(MARGIN, top, CONTENT_WIDTH, boxHeight, 3).fillColor(CALLOUT_BG).fill()
  doc.rect(MARGIN, top, 2.5, boxHeight).fillColor(OLIVE).fill()

  doc
    .font(SANS_BOLD)
    .fontSize(7.5)
    .fillColor(INK)
    .text(ANALYSIS_LABEL.toUpperCase(), MARGIN + 14, top + 10, { characterSpacing: 1.4 })
  doc
    .font(SANS_ITALIC)
    .fontSize(7.5)
    .fillColor(DIM)
    .text(ANALYSIS_PROVENANCE, MARGIN + 14, doc.y + 1, { width: innerWidth })

  let y = doc.y + 8
  for (const [label, text] of parts) {
    doc
      .font(SANS_BOLD)
      .fontSize(7)
      .fillColor(FAINT)
      .text(label.toUpperCase(), MARGIN + 14, y, { characterSpacing: 0.8 })
    y += 10
    doc.font(SANS).fontSize(8.5).fillColor(INK).text(text, MARGIN + 14, y, {
      width: innerWidth,
      lineGap: 2.2,
    })
    y = doc.y + 7
  }
  doc.x = MARGIN
  doc.y = top + boxHeight + 12
}

function renderSubmission(doc: Doc, team: ExportTeam): void {
  if (!team.submission) {
    paragraph(doc, "Submission", "This team did not submit a project.")
    return
  }
  const s = team.submission
  ensureSpace(doc, 60)
  kicker(doc, "The submission — in the team's own words", DIM)
  doc
    .font(SERIF_ITALIC)
    .fontSize(11)
    .fillColor(INK)
    .text(`“${s.pitch.trim()}”`, MARGIN, doc.y, { width: CONTENT_WIDTH * 0.92, lineGap: 3 })
  doc.moveDown(0.8)
  paragraph(doc, "Problem tackled", s.problemTackled)
  paragraph(doc, "What it does", s.description)
  paragraph(doc, "What works vs what is mocked", s.worksVsMocked)
  paragraph(doc, "How the team used Claude", s.claudeUsage)

  const links = [
    ["Repository", s.repoUrl],
    ["Demo", s.demoUrl],
    ["Video", s.videoUrl],
    ["Slides", s.slidesUrl],
  ].filter((pair): pair is [string, string] => Boolean(pair[1]))
  if (links.length > 0) {
    ensureSpace(doc, 18 + links.length * 12)
    doc
      .font(SANS_BOLD)
      .fontSize(7)
      .fillColor(FAINT)
      .text("LINKS", MARGIN, doc.y, { characterSpacing: 1.1 })
    doc.moveDown(0.3)
    for (const [label, url] of links) {
      doc.font(SANS_BOLD).fontSize(8.5).fillColor(INK).text(`${label}  `, MARGIN, doc.y, {
        continued: true,
      })
      doc.font(SANS).fillColor(CLAY_DEEP).text(url, { link: url, underline: false })
    }
    doc.moveDown(0.8)
  }
}

/**
 * The judging block: criterion profile, per-judge table, spread strip, and
 * verbatim judge notes. Longer than 50 lines because the pieces share
 * geometry and pagination decisions that must be made together.
 */
function renderJudging(doc: Doc, team: ExportTeam): void {
  if (team.judgeScores.length === 0) return
  ensureSpace(doc, 200)
  // No divider when the block landed at the top of a fresh page — it would
  // double the running header's rule.
  if (doc.y > MARGIN + 24) {
    rule(doc)
    doc.moveDown(0.2)
  }
  kicker(doc, "Judging", DIM)

  // Criterion profile: the five published criteria, averaged across judges.
  if (team.average !== null) {
    const rows: HBarRow[] = JUDGING_CRITERIA.map((criterion) => ({
      label: criterion.label,
      value: team.criterionAverages[criterion.key] ?? 0,
      valueLabel: fmt1(team.criterionAverages[criterion.key] ?? 0),
    }))
    doc.y += drawHBars(doc, MARGIN, doc.y, CONTENT_WIDTH * 0.72, rows, {
      max: 5,
      labelWidth: 150,
      rowHeight: 15,
      scaleNote: "Mean of judges' raw 1–5 scores per criterion. 1 = not shown.",
    })
    doc.moveDown(0.8)
  }

  // Per-judge table.
  const nameWidth = 104
  const basisWidth = 62
  const critWidth = 42
  const totalWidth = CONTENT_WIDTH - nameWidth - basisWidth - critWidth * JUDGING_CRITERIA.length
  ensureSpace(doc, 30 + team.judgeScores.length * 15)
  const shortLabels = ["Impact", "Demo", "Claude", "Clarity", "Present."]
  let x = MARGIN
  const headTop = doc.y
  doc.font(SANS_BOLD).fontSize(6.5).fillColor(DIM)
  doc.text("JUDGE", x, headTop, { width: nameWidth - 6 })
  x += nameWidth
  doc.text("BASIS", x, headTop, { width: basisWidth - 6 })
  x += basisWidth
  shortLabels.forEach((label) => {
    doc.text(label.toUpperCase(), x, headTop, { width: critWidth - 4 })
    x += critWidth
  })
  doc.text("TOTAL /100", x, headTop, { width: totalWidth })
  doc.x = MARGIN
  doc.y = headTop + 11
  rule(doc, INK, 0.8)

  for (const score of team.judgeScores) {
    const top = doc.y
    let cx = MARGIN
    doc.font(SANS).fontSize(8).fillColor(INK).text(score.judgeName, cx, top, {
      width: nameWidth - 6,
      lineBreak: false,
      ellipsis: true,
    })
    cx += nameWidth
    doc
      .font(SANS)
      .fontSize(7.5)
      .fillColor(score.writeupOnly ? CLAY_DEEP : DIM)
      .text(score.writeupOnly ? "Writeup" : "Live demo", cx, top, { width: basisWidth - 6 })
    cx += basisWidth
    for (const criterion of JUDGING_CRITERIA) {
      const value = score.criteria[criterion.key]
      doc
        .font(SANS)
        .fontSize(8)
        .fillColor(INK)
        .text(value === null ? "—" : String(value), cx, top, { width: critWidth - 4 })
      cx += critWidth
    }
    doc.font(SANS_BOLD).fontSize(8).fillColor(INK).text(fmt1(score.weightedTotal), cx, top, {
      width: totalWidth,
    })
    doc.x = MARGIN
    doc.y = top + 14
  }
  rule(doc)

  // Spread strip when more than one judge scored: the range, drawn honestly.
  if (team.judgeCount > 1 && team.scoreLow !== null && team.scoreHigh !== null) {
    ensureSpace(doc, 56)
    doc.moveDown(0.3)
    const spreadRows: DotRow[] = [
      {
        label: "Judge totals",
        sublabel: `spread ${fmt1(team.scoreHigh - team.scoreLow)}`,
        dots: team.judgeScores.map((s) => s.weightedTotal),
      },
    ]
    doc.y += drawDotRows(doc, MARGIN, doc.y, CONTENT_WIDTH * 0.72, spreadRows, {
      max: 100,
      labelWidth: 92,
    })
    doc.moveDown(0.4)
  }

  // Verbatim notes — the only judge words in the document.
  const withFeedback = team.judgeScores.filter((s) => s.feedback !== null)
  if (withFeedback.length > 0) {
    doc.moveDown(0.3)
    doc
      .font(SANS_BOLD)
      .fontSize(7)
      .fillColor(FAINT)
      .text("JUDGE NOTES — RECORDED DURING JUDGING, VERBATIM", MARGIN, doc.y, {
        characterSpacing: 1,
      })
    doc.moveDown(0.4)
    for (const score of withFeedback) {
      const body = score.feedback ?? ""
      doc.font(SERIF_ITALIC).fontSize(9.5)
      ensureSpace(doc, 16 + doc.heightOfString(body, { width: CONTENT_WIDTH - 16, lineGap: 2 }))
      doc
        .font(SERIF_ITALIC)
        .fontSize(9.5)
        .fillColor(INK)
        .text(`“${body}”`, MARGIN, doc.y, { width: CONTENT_WIDTH - 16, lineGap: 2 })
      doc
        .font(SANS)
        .fontSize(7.5)
        .fillColor(DIM)
        .text(
          `— ${score.judgeName}` + (score.writeupOnly ? ", from the written submission" : ""),
          MARGIN,
          doc.y + 1
        )
      doc.moveDown(0.6)
    }
  }
}

/**
 * One profile per team, each starting on a fresh page: identity, roster,
 * the labelled analysis, the submission verbatim, then judging.
 */
function renderTeamProfile(
  doc: Doc,
  team: ExportTeam,
  analysis: TeamAnalysis | undefined,
  state: RenderState
): void {
  doc.addPage()
  doc.y = MARGIN + 8
  markSection(doc, state, team.submission?.projectName ?? team.teamName, 1)

  // Header: placing kicker left, honours chip right.
  const kickerTop = doc.y
  kicker(doc, placingKicker(team))
  if (team.isChampion || team.isTrackWinner) {
    const afterKicker = doc.y
    const chip = team.isChampion ? "CHAMPION" : "TRACK WINNER"
    // widthOfString ignores characterSpacing — add it per character.
    const chipWidth =
      doc.font(SANS_BOLD).fontSize(7).widthOfString(chip) + chip.length * 0.8 + 16
    doc
      .roundedRect(MARGIN + CONTENT_WIDTH - chipWidth, kickerTop - 3, chipWidth, 14, 7)
      .fillColor(team.isChampion ? CLAY : OLIVE)
      .fill()
    doc
      .font(SANS_BOLD)
      .fontSize(7)
      .fillColor(PAPER)
      .text(chip, MARGIN + CONTENT_WIDTH - chipWidth + 8, kickerTop, {
        characterSpacing: 0.8,
        lineBreak: false,
      })
    // The chip is an overlay; put the flow back where the kicker left it.
    doc.x = MARGIN
    doc.y = afterKicker
  }

  doc
    .font(SERIF)
    .fontSize(21)
    .fillColor(INK)
    .text(team.submission?.projectName ?? team.teamName, MARGIN, doc.y, { width: CONTENT_WIDTH })
  doc
    .font(SANS)
    .fontSize(9)
    .fillColor(DIM)
    .text(team.teamName, MARGIN, doc.y + 2, { width: CONTENT_WIDTH })
  if (team.average !== null) {
    doc
      .font(SANS)
      .fontSize(8.5)
      .fillColor(DIM)
      .text(
        `Panel average ${fmt1(team.average)}/100 across ${team.judgeCount} scorecard` +
          `${team.judgeCount === 1 ? "" : "s"}` +
          (team.judgeCount > 1 && team.scoreLow !== null && team.scoreHigh !== null
            ? ` (judges ranged ${fmt1(team.scoreLow)}–${fmt1(team.scoreHigh)})`
            : "") +
          ` · score rank #${team.scoreRank}`,
        MARGIN,
        doc.y + 2,
        { width: CONTENT_WIDTH }
      )
  }
  doc.moveDown(0.6)
  rule(doc, INK, 0.9)
  doc.moveDown(0.4)

  if (team.scoredFromWriteup) callout(doc, WRITEUP_NOTE)

  renderMembers(doc, team)
  if (analysis) renderAnalysis(doc, analysis)
  renderSubmission(doc, team)
  renderJudging(doc, team)
}

// ─── Appendix ────────────────────────────────────────────────────────────────

function renderAppendix(doc: Doc, data: ResultsExport, state: RenderState): void {
  sectionOpener(
    doc,
    "Appendix",
    "The rest of the room",
    "A complete record includes the teams that formed but did not submit, and the builders " +
      "who registered without landing on a frozen team. They were part of the night too."
  )
  markSection(doc, state, "Appendix — the rest of the room")

  const noSubmission = data.teams.filter((t) => t.submission === null)
  if (noSubmission.length > 0) {
    kicker(doc, `Teams that formed but did not submit (${noSubmission.length})`, DIM)
    doc
      .font(SANS)
      .fontSize(8.5)
      .fillColor(DIM)
      .text(noSubmission.map((t) => t.teamName).join("  ·  "), MARGIN, doc.y, {
        width: CONTENT_WIDTH,
        lineGap: 2.5,
      })
    doc.moveDown(1)
  }

  if (data.unassignedParticipants.length > 0) {
    ensureSpace(doc, 60)
    kicker(doc, `Registered but not on a frozen team (${data.unassignedParticipants.length})`, DIM)
    doc
      .font(SANS)
      .fontSize(8.5)
      .fillColor(DIM)
      .text(
        data.unassignedParticipants
          .map((m) => `${m.fullName} — ${m.primaryRole}`)
          .join("  ·  "),
        MARGIN,
        doc.y,
        { width: CONTENT_WIDTH, lineGap: 2.5 }
      )
    doc.moveDown(1)
  }

  ensureSpace(doc, 50)
  kicker(doc, "About this document", DIM)
  doc
    .font(SANS)
    .fontSize(8.5)
    .fillColor(DIM)
    .text(
      `Produced by ${EVENT_HOST} from the event's operational records. Scores, submissions and ` +
        "judge notes are reproduced exactly as recorded; provenance for every element is stated " +
        "in “How this record was produced”. Contact details are deliberately omitted.",
      MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, lineGap: 2.5 }
    )
}

// ─── Page furniture pass ─────────────────────────────────────────────────────

/**
 * Running headers and page numbers on every page after the cover, written in
 * a final pass over the buffered pages. The section for each page is the last
 * TOC mark at or before it.
 */
function renderFurniture(doc: Doc, state: RenderState): void {
  const range = doc.bufferedPageRange()
  const sections = state.toc.filter((e) => e.level === 0)
  for (let i = range.start + 1; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    const printed = i + 1
    // Writing inside the margins would trigger an automatic page add — the
    // classic pdfkit footer gotcha — so lift them for the furniture pass.
    doc.page.margins.bottom = 0
    doc.page.margins.top = 0

    const section = [...sections].reverse().find((e) => e.page <= printed)
    const isContents = i === state.tocPageIndex
    doc
      .font(SANS)
      .fontSize(6.5)
      .fillColor(FAINT)
      .text(
        (isContents ? "Contents" : (section?.title ?? "")).toUpperCase(),
        MARGIN,
        HEADER_Y,
        { characterSpacing: 1, width: CONTENT_WIDTH / 2, lineBreak: false }
      )
    doc.text(`${EVENT_TITLE} · ${EVENT_DATES}`.toUpperCase(), MARGIN + CONTENT_WIDTH / 2, HEADER_Y, {
      characterSpacing: 1,
      width: CONTENT_WIDTH / 2,
      align: "right",
      lineBreak: false,
    })
    doc
      .moveTo(MARGIN, HEADER_Y + 11)
      .lineTo(MARGIN + CONTENT_WIDTH, HEADER_Y + 11)
      .lineWidth(0.4)
      .strokeColor(RULE)
      .stroke()

    doc
      .font(SANS)
      .fontSize(7.5)
      .fillColor(FAINT)
      .text(`${EVENT_HOST} — hackathon results`, MARGIN, FOOTER_Y, {
        width: CONTENT_WIDTH / 2,
        lineBreak: false,
      })
    doc.text(`Page ${printed} of ${range.count}`, MARGIN + CONTENT_WIDTH / 2, FOOTER_Y, {
      width: CONTENT_WIDTH / 2,
      align: "right",
      lineBreak: false,
    })
    doc.page.margins.bottom = 60
    doc.page.margins.top = MARGIN
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Build the complete PDF and resolve with a Node buffer to stream. Analyses
 * are optional by construction: a missing entry means that team's analysis
 * section is simply absent (see export-analysis's fail-soft rule).
 */
export function buildResultsPdf(
  data: ResultsExport,
  analyses: ReadonlyMap<string, TeamAnalysis> = new Map()
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: 60, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: `${EVENT_TITLE} — Results`,
        Author: EVENT_HOST,
        Subject: `Hackathon results, ${EVENT_DATES}, ${EVENT_LOCATION}`,
      },
    })
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const state: RenderState = { toc: [], tocPageIndex: 1 }

    renderCover(doc, data)
    reserveContentsPage(doc, state)
    renderMethodology(doc, data, state)
    renderEventInNumbers(doc, data, state)
    renderWinners(doc, data, state)
    renderRanking(doc, data, state)

    const profiled = data.teams.filter((t) => t.submission !== null)
    if (profiled.length > 0) {
      // The profiles section mark points at the first profile page.
      const first = profiled[0]
      renderTeamProfile(doc, first, analyses.get(first.teamId), state)
      state.toc.splice(state.toc.length - 1, 0, {
        title: "Team profiles",
        page: state.toc[state.toc.length - 1].page,
        level: 0,
      })
      for (const team of profiled.slice(1)) {
        renderTeamProfile(doc, team, analyses.get(team.teamId), state)
      }
    }
    renderAppendix(doc, data, state)

    renderContents(doc, state)
    renderFurniture(doc, state)

    doc.end()
  })
}
