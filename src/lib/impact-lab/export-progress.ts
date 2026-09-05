/**
 * Impact Lab results export — progress reporting.
 *
 * Pure and dependency-free: no Prisma, no Next, no pdfkit/exceljs. The export
 * pipeline (`export-pipeline.ts`) and its renderers report through this
 * module rather than emitting raw numbers themselves, so the two honesty
 * rules a progress bar lives or dies by are enforced in exactly one place
 * instead of at every call site:
 *
 * 1. Percent never decreases. A renderer that computes its own local
 *    fraction (team 3 of 9, say) cannot accidentally step backwards over a
 *    stage boundary — `report` clamps against the last value it saw.
 * 2. 100 is not a percentage this module hands out. `report` caps at 99;
 *    only `done` can ever produce 100, and only once — so a client watching
 *    the stream can treat "percent: 100" as a synonym for "the file exists",
 *    never as something a stage happened to compute.
 */

export type ExportStage = "loading" | "analysing" | "rendering" | "finalising" | "done"

export interface ExportProgressEvent {
  stage: ExportStage
  /** Human-readable, e.g. "Generating team analyses (3/9)". */
  label: string
  /** 0–99 while building; exactly 100 only on the terminal `done` event. */
  percent: number
}

export type ExportProgressListener = (event: ExportProgressEvent) => void

export interface ExportProgressReporter {
  /** Report progress within a stage. Percent is clamped to `[lastPercent, 99]`. */
  report(stage: ExportStage, label: string, percent: number): void
  /** The one and only way to reach 100 — call once the artefact is in hand. */
  done(label: string): void
}

/**
 * Builds a reporter around an optional listener. With no listener this is a
 * no-op recorder — the pipeline and renderers call it unconditionally, so
 * the plain (non-streaming) export route pays nothing for progress it never
 * asked for.
 */
export function createProgressReporter(listener?: ExportProgressListener): ExportProgressReporter {
  let lastPercent = 0
  let finished = false

  return {
    report(stage, label, percent) {
      if (finished || !listener) return
      const clamped = Math.min(99, Math.max(lastPercent, Math.round(percent)))
      lastPercent = clamped
      listener({ stage, label, percent: clamped })
    },
    done(label) {
      if (finished || !listener) return
      finished = true
      listener({ stage: "done", label, percent: 100 })
    },
  }
}
