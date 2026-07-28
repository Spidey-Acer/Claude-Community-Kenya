/**
 * Impact Lab results export — the PDF.
 *
 * Renders a `ResultsExport` (see ./export-data) into a print-ready A4
 * document: cover, winners, full ranking, then one section per team with its
 * complete submission and every judge's scores and feedback. Server-only
 * (pdfkit, streamed to a buffer — nothing touches disk).
 *
 * The same two honesty rules as the workbook: announced placings are labelled
 * as the panel's decision (score order is shown separately as what it is),
 * and writeup-scored teams carry that basis wherever their scores appear —
 * as a note on how the score was produced, never a mark against the team.
 */

import PDFDocument from "pdfkit"
import { JUDGING_CRITERIA } from "./judging"
import {
  EVENT_DATES,
  EVENT_HOST,
  EVENT_TITLE,
  type ExportTeam,
  type ResultsExport,
} from "./export-data"

// ─── Layout constants ────────────────────────────────────────────────────────

const MARGIN = 56 // ~2 cm on A4
const PAGE_WIDTH = 595.28
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const FOOTER_Y = 841.89 - 40

const INK = "#1a1a1a"
const DIM = "#666666"
const FAINT = "#999999"
const GREEN = "#007a31"
const AMBER = "#8a5b00"
const AMBER_BG = "#fdf3d7"
const RULE = "#d9d9d9"

const SERIF = "Times-Roman"
const SANS = "Helvetica"
const SANS_BOLD = "Helvetica-Bold"
const SANS_ITALIC = "Helvetica-Oblique"

const WRITEUP_NOTE =
  "Scored from the written submission — no judge reached this table during live demos. " +
  "The team submitted on time; this is a note on how the score was produced, not on the team."

type Doc = PDFKit.PDFDocument

// ─── Small helpers ───────────────────────────────────────────────────────────

/** Start a new page when fewer than `needed` points remain above the footer. */
function ensureSpace(doc: Doc, needed: number): void {
  if (doc.y + needed > FOOTER_Y - 16) doc.addPage()
}

function sectionLabel(doc: Doc, text: string): void {
  doc
    .font(SANS_BOLD)
    .fontSize(7.5)
    .fillColor(GREEN)
    .text(text.toUpperCase(), MARGIN, doc.y, { characterSpacing: 1.2, width: CONTENT_WIDTH })
  doc.moveDown(0.35)
}

function paragraph(doc: Doc, label: string, text: string): void {
  const body = text.trim() || "—"
  ensureSpace(
    doc,
    22 + doc.font(SANS).fontSize(9).heightOfString(body, { width: CONTENT_WIDTH, lineGap: 2 })
  )
  sectionLabel(doc, label)
  doc
    .font(SANS)
    .fontSize(9)
    .fillColor(INK)
    .text(body, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 2 })
  doc.moveDown(0.8)
}

function rule(doc: Doc, color = RULE): void {
  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(MARGIN + CONTENT_WIDTH, doc.y)
    .lineWidth(0.6)
    .strokeColor(color)
    .stroke()
  doc.moveDown(0.5)
}

function placingLine(team: ExportTeam): string {
  if (team.finalRank !== null) {
    const basis =
      team.finalRankBasis === "announced"
        ? "announced by the judging panel"
        : team.finalRankBasis === "submission"
          ? "score order, writeup-scored"
          : "score order"
    return `Final placing #${team.finalRank} (${basis})`
  }
  return team.average !== null ? `Score rank #${team.scoreRank} (unpublished)` : "Not scored"
}

// ─── Cover ───────────────────────────────────────────────────────────────────

function renderCover(doc: Doc, data: ResultsExport): void {
  doc.rect(0, 0, PAGE_WIDTH, 6).fillColor(GREEN).fill()

  doc.y = 170
  doc
    .font(SANS_BOLD)
    .fontSize(9)
    .fillColor(GREEN)
    .text(EVENT_HOST.toUpperCase(), MARGIN, doc.y, { characterSpacing: 2, width: CONTENT_WIDTH })
  doc.moveDown(1)
  doc.font(SERIF).fontSize(34).fillColor(INK).text(EVENT_TITLE, { width: CONTENT_WIDTH })
  doc.moveDown(0.3)
  doc
    .font(SANS)
    .fontSize(12)
    .fillColor(DIM)
    .text(`Hackathon results — the complete record · ${EVENT_DATES}`, { width: CONTENT_WIDTH })

  doc.moveDown(2.5)
  rule(doc)

  const s = data.summary
  const facts: [string, string][] = [
    ["Builders", String(s.participantsRegistered)],
    ["Teams formed", String(s.teamsFormed)],
    ["Projects submitted", String(s.teamsSubmitted)],
    ["Judges", String(s.judges)],
    ["Scorecards", String(s.scorecards)],
    ["Tracks", String(s.tracks)],
  ]
  const cellWidth = CONTENT_WIDTH / 3
  const gridTop = doc.y + 10
  facts.forEach(([label, value], i) => {
    const x = MARGIN + (i % 3) * cellWidth
    const y = gridTop + Math.floor(i / 3) * 56
    doc.font(SERIF).fontSize(26).fillColor(INK).text(value, x, y, { width: cellWidth - 12 })
    doc
      .font(SANS)
      .fontSize(8)
      .fillColor(DIM)
      .text(label.toUpperCase(), x, y + 30, { characterSpacing: 1, width: cellWidth - 12 })
  })
  doc.y = gridTop + 2 * 56 + 14
  rule(doc)

  doc.moveDown(1)
  sectionLabel(doc, "How to read this document")
  doc
    .font(SANS)
    .fontSize(9)
    .fillColor(DIM)
    .text(
      "The podium was decided by the judging panel after deliberation; the raw score averages " +
        "do not reproduce it and are shown separately as score order. Every placing in this " +
        "document names its basis. Teams no judge reached during live demos were scored from " +
        "their written submissions — those scores are marked wherever they appear.",
      { width: CONTENT_WIDTH, lineGap: 2.5 }
    )

  doc
    .font(SANS)
    .fontSize(8)
    .fillColor(FAINT)
    .text(
      `Generated ${data.generatedAt.toISOString().slice(0, 10)} · Cohort ${data.cohort}` +
        (data.published && data.publishedAt
          ? ` · Results published ${data.publishedAt.slice(0, 10)}`
          : " · Results not yet published"),
      MARGIN,
      FOOTER_Y - 20,
      { width: CONTENT_WIDTH }
    )
}

// ─── Winners ─────────────────────────────────────────────────────────────────

function renderWinners(doc: Doc, data: ResultsExport): void {
  doc.addPage()
  sectionLabel(doc, "The winners")
  doc.font(SERIF).fontSize(22).fillColor(INK).text("As announced by the judging panel", {
    width: CONTENT_WIDTH,
  })
  doc.moveDown(0.6)

  if (data.announced.length === 0) {
    doc
      .font(SANS)
      .fontSize(9)
      .fillColor(DIM)
      .text(
        "Results have not been published yet — winners below are ordered by score alone.",
        { width: CONTENT_WIDTH }
      )
    doc.moveDown(0.5)
  }

  const medals = ["Champion", "First runner-up", "Second runner-up"]
  for (const winner of data.announced) {
    ensureSpace(doc, 54)
    const top = doc.y
    doc.rect(MARGIN, top, 3, 42).fillColor(winner.rank === 1 ? GREEN : RULE).fill()
    doc
      .font(SANS_BOLD)
      .fontSize(8)
      .fillColor(winner.rank === 1 ? GREEN : DIM)
      .text(
        (medals[winner.rank - 1] ?? `#${winner.rank}`).toUpperCase(),
        MARGIN + 14,
        top + 2,
        { characterSpacing: 1.2 }
      )
    doc
      .font(SERIF)
      .fontSize(16)
      .fillColor(INK)
      .text(winner.projectName, MARGIN + 14, top + 13, { width: CONTENT_WIDTH - 14 })
    doc
      .font(SANS)
      .fontSize(9)
      .fillColor(DIM)
      .text(winner.teamName, MARGIN + 14, top + 32, { width: CONTENT_WIDTH - 14 })
    doc.y = top + 52
  }

  doc.moveDown(1)
  sectionLabel(doc, "Track winners")
  for (const w of data.trackWinners) {
    ensureSpace(doc, 18)
    const top = doc.y
    doc.font(SANS_BOLD).fontSize(9).fillColor(INK).text(w.track, MARGIN, top, { width: 170 })
    doc
      .font(SANS)
      .fontSize(9)
      .fillColor(INK)
      .text(`${w.projectName} — ${w.teamName}`, MARGIN + 180, top, {
        width: CONTENT_WIDTH - 240,
      })
    doc
      .font(SANS_ITALIC)
      .fontSize(8)
      .fillColor(FAINT)
      .text(w.basis === "announced" ? "announced" : "by score", MARGIN + CONTENT_WIDTH - 55, top, {
        width: 55,
        align: "right",
      })
    doc.y = Math.max(doc.y, top + 14) + 2
  }
}

// ─── Ranking table ───────────────────────────────────────────────────────────

const RANK_COLS = [
  { label: "#", width: 24 },
  { label: "Project", width: 130 },
  { label: "Team", width: 120 },
  { label: "Track", width: 90 },
  { label: "Avg /100", width: 44 },
  { label: "Judges", width: 40 },
  { label: "Basis", width: 35 },
] as const

function rankingHeader(doc: Doc): void {
  let x = MARGIN
  doc.font(SANS_BOLD).fontSize(7.5).fillColor(DIM)
  for (const col of RANK_COLS) {
    doc.text(col.label.toUpperCase(), x, doc.y, { width: col.width - 6, characterSpacing: 0.5 })
    x += col.width
  }
  doc.moveDown(0.4)
  rule(doc, INK)
}

/**
 * The full ranking, one row per team, announced placings tinted. Longer than
 * 50 lines because a multi-page table needs its row layout, page breaks and
 * header re-draws in one place to stay readable.
 */
function renderRanking(doc: Doc, data: ResultsExport): void {
  doc.addPage()
  sectionLabel(doc, "Full ranking")
  doc
    .font(SERIF)
    .fontSize(22)
    .fillColor(INK)
    .text("Every team, and how its placing was decided", { width: CONTENT_WIDTH })
  doc.moveDown(0.7)
  rankingHeader(doc)

  const ranked = data.teams.filter((t) => t.average !== null)
  for (const team of ranked) {
    const cells = [
      team.finalRank !== null ? String(team.finalRank) : `(${team.scoreRank})`,
      team.submission?.projectName ?? "—",
      team.teamName,
      team.track,
      team.average !== null ? team.average.toFixed(1) : "—",
      String(team.judgeCount),
      team.finalRankBasis === "announced" ? "panel" : team.scoredFromWriteup ? "score †" : "score",
    ]
    doc.font(SANS).fontSize(8.5)
    const rowHeight =
      Math.max(
        ...cells.map((text, i) => doc.heightOfString(text, { width: RANK_COLS[i].width - 6 }))
      ) + 6
    if (doc.y + rowHeight > FOOTER_Y - 16) {
      doc.addPage()
      rankingHeader(doc)
    }
    const top = doc.y
    if (team.finalRankBasis === "announced") {
      doc.rect(MARGIN - 4, top - 3, CONTENT_WIDTH + 8, rowHeight).fillColor(AMBER_BG).fill()
    }
    let x = MARGIN
    cells.forEach((text, i) => {
      doc
        .font(i === 1 ? SANS_BOLD : SANS)
        .fontSize(8.5)
        .fillColor(i === 3 || i === 6 ? DIM : INK)
        .text(text, x, top, { width: RANK_COLS[i].width - 6 })
      x += RANK_COLS[i].width
    })
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
    .fontSize(8)
    .fillColor(AMBER)
    .text(
      "† " + WRITEUP_NOTE,
      MARGIN,
      doc.y,
      { width: CONTENT_WIDTH, lineGap: 2 }
    )
  doc.moveDown(0.4)
  doc
    .font(SANS)
    .fontSize(8)
    .fillColor(DIM)
    .text(
      "“panel” placings 1–3 were announced by the judging panel after deliberation; every other " +
        "team is ordered by its raw weighted average. Averages are shown here for the archival " +
        "record — they order the list but did not decide the podium.",
      { width: CONTENT_WIDTH, lineGap: 2 }
    )

  const unscored = data.teams.filter((t) => t.average === null)
  if (unscored.length > 0) {
    doc.moveDown(1.2)
    sectionLabel(doc, "Teams without a score")
    doc
      .font(SANS)
      .fontSize(8.5)
      .fillColor(DIM)
      .text(
        unscored
          .map((t) => `${t.teamName}${t.submission ? ` — ${t.submission.projectName}` : ""}`)
          .join("  ·  "),
        { width: CONTENT_WIDTH, lineGap: 2.5 }
      )
  }
}

// ─── Per-team pages ──────────────────────────────────────────────────────────

function renderJudgeTable(doc: Doc, team: ExportTeam): void {
  const nameWidth = 108
  const basisWidth = 66
  const critWidth = 40
  const totalWidth = CONTENT_WIDTH - nameWidth - basisWidth - critWidth * JUDGING_CRITERIA.length

  ensureSpace(doc, 40 + team.judgeScores.length * 16)
  sectionLabel(doc, "Scores")

  const shortLabels = ["Impact", "Demo", "Claude", "Clarity", "Present."]
  let x = MARGIN
  doc.font(SANS_BOLD).fontSize(7).fillColor(DIM)
  doc.text("JUDGE", x, doc.y, { width: nameWidth - 6 })
  x += nameWidth
  doc.text("BASIS", x, doc.y, { width: basisWidth - 6 })
  x += basisWidth
  shortLabels.forEach((label) => {
    doc.text(label.toUpperCase(), x, doc.y, { width: critWidth - 4 })
    x += critWidth
  })
  doc.text("TOTAL /100", x, doc.y, { width: totalWidth })
  doc.moveDown(0.4)
  rule(doc, INK)

  for (const score of team.judgeScores) {
    const top = doc.y
    let cx = MARGIN
    doc.font(SANS).fontSize(8.5).fillColor(INK).text(score.judgeName, cx, top, {
      width: nameWidth - 6,
    })
    cx += nameWidth
    doc
      .font(SANS)
      .fontSize(8)
      .fillColor(score.writeupOnly ? AMBER : DIM)
      .text(score.writeupOnly ? "Writeup" : "Live demo", cx, top, { width: basisWidth - 6 })
    cx += basisWidth
    for (const criterion of JUDGING_CRITERIA) {
      const value = score.criteria[criterion.key]
      doc
        .font(SANS)
        .fontSize(8.5)
        .fillColor(INK)
        .text(value === null ? "—" : String(value), cx, top, { width: critWidth - 4 })
      cx += critWidth
    }
    doc
      .font(SANS_BOLD)
      .fontSize(8.5)
      .fillColor(INK)
      .text(score.weightedTotal.toFixed(1), cx, top, { width: totalWidth })
    doc.y = top + 15
  }
  rule(doc)
}

function renderFeedback(doc: Doc, team: ExportTeam): void {
  const withFeedback = team.judgeScores.filter((s) => s.feedback !== null)
  if (withFeedback.length === 0) return
  sectionLabel(doc, "Judge feedback")
  for (const score of withFeedback) {
    const body = score.feedback ?? ""
    doc.font(SANS).fontSize(9)
    ensureSpace(doc, 16 + doc.heightOfString(body, { width: CONTENT_WIDTH - 12, lineGap: 2 }))
    doc
      .font(SANS_BOLD)
      .fontSize(8.5)
      .fillColor(INK)
      .text(
        score.judgeName + (score.writeupOnly ? "  ·  from the written submission" : ""),
        MARGIN,
        doc.y
      )
    doc
      .font(SANS)
      .fontSize(9)
      .fillColor(DIM)
      .text(body, MARGIN + 12, doc.y + 2, { width: CONTENT_WIDTH - 12, lineGap: 2 })
    doc.x = MARGIN
    doc.moveDown(0.7)
  }
}

/**
 * One section per team, each starting on a fresh page: identity, members,
 * the full submission, then scores and feedback.
 */
function renderTeamPage(doc: Doc, team: ExportTeam): void {
  doc.addPage()

  doc.font(SANS_BOLD).fontSize(8).fillColor(GREEN)
  doc.text(placingLine(team).toUpperCase(), MARGIN, doc.y, { characterSpacing: 1 })
  doc.moveDown(0.3)
  doc
    .font(SERIF)
    .fontSize(20)
    .fillColor(INK)
    .text(team.submission?.projectName ?? team.teamName, { width: CONTENT_WIDTH })
  doc
    .font(SANS)
    .fontSize(9.5)
    .fillColor(DIM)
    // The team name already carries table and track ("Table 12 — Kilimo…"),
    // so repeating them here would just say everything twice.
    .text(team.teamName, { width: CONTENT_WIDTH })
  if (team.average !== null) {
    doc
      .font(SANS)
      .fontSize(9)
      .fillColor(DIM)
      .text(
        `Panel average ${team.average.toFixed(1)}/100 across ${team.judgeCount} ` +
          `scorecard${team.judgeCount === 1 ? "" : "s"} · score rank #${team.scoreRank}`,
        { width: CONTENT_WIDTH }
      )
  }
  doc.moveDown(0.5)
  rule(doc)

  if (team.scoredFromWriteup) {
    const noteHeight =
      doc.font(SANS).fontSize(8.5).heightOfString(WRITEUP_NOTE, {
        width: CONTENT_WIDTH - 24,
        lineGap: 2,
      }) + 14
    const top = doc.y
    doc.rect(MARGIN, top, CONTENT_WIDTH, noteHeight).fillColor(AMBER_BG).fill()
    doc
      .font(SANS)
      .fontSize(8.5)
      .fillColor(AMBER)
      .text(WRITEUP_NOTE, MARGIN + 12, top + 7, { width: CONTENT_WIDTH - 24, lineGap: 2 })
    doc.x = MARGIN
    doc.y = top + noteHeight + 10
  }

  sectionLabel(doc, "Team")
  doc
    .font(SANS)
    .fontSize(9)
    .fillColor(INK)
    .text(
      team.members
        .map((m) => `${m.fullName}${m.isLeader ? " (lead)" : ""} <${m.email}>`)
        .join("   ·   ") || "—",
      { width: CONTENT_WIDTH, lineGap: 2.5 }
    )
  doc.moveDown(0.8)

  if (team.submission) {
    const s = team.submission
    paragraph(doc, "Pitch", s.pitch)
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
      ensureSpace(doc, 20 + links.length * 12)
      sectionLabel(doc, "Links")
      for (const [label, url] of links) {
        doc.font(SANS_BOLD).fontSize(8.5).fillColor(INK).text(`${label}  `, {
          continued: true,
        })
        doc.font(SANS).fillColor(GREEN).text(url, { link: url, underline: false })
      }
      doc.moveDown(0.8)
    }
  } else {
    paragraph(doc, "Submission", "This team did not submit a project.")
  }

  if (team.judgeScores.length > 0) {
    renderJudgeTable(doc, team)
    renderFeedback(doc, team)
  }
}

// ─── Footer pass ─────────────────────────────────────────────────────────────

/** Page numbers on every page but the cover, via buffered pages. */
function renderFooters(doc: Doc): void {
  const range = doc.bufferedPageRange()
  for (let i = range.start + 1; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    // Writing inside the bottom margin would otherwise trigger an automatic
    // page add — a classic pdfkit footer gotcha.
    doc.page.margins.bottom = 0
    doc
      .font(SANS)
      .fontSize(7.5)
      .fillColor(FAINT)
      .text(`${EVENT_TITLE} — Results`, MARGIN, FOOTER_Y, {
        width: CONTENT_WIDTH / 2,
        lineBreak: false,
      })
    doc.text(`Page ${i + 1} of ${range.count}`, MARGIN + CONTENT_WIDTH / 2, FOOTER_Y, {
      width: CONTENT_WIDTH / 2,
      align: "right",
      lineBreak: false,
    })
    doc.page.margins.bottom = 60
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/** Build the complete PDF and resolve with a Node buffer to stream. */
export function buildResultsPdf(data: ResultsExport): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: MARGIN, bottom: 60, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: {
        Title: `${EVENT_TITLE} — Results`,
        Author: EVENT_HOST,
        Subject: `Hackathon results, ${EVENT_DATES}`,
      },
    })
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    renderCover(doc, data)
    renderWinners(doc, data)
    renderRanking(doc, data)
    for (const team of data.teams.filter((t) => t.submission !== null)) {
      renderTeamPage(doc, team)
    }
    renderFooters(doc)

    doc.end()
  })
}
