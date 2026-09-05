/**
 * `createProgressReporter` — the honesty rules a progress bar lives or dies
 * by, isolated from any pipeline or renderer:
 *
 * 1. Percent never decreases, even when a caller reports a lower number than
 *    it already has (a renderer computing its own local fraction can do this
 *    across a stage boundary by mistake).
 * 2. `report` never reaches 100 — only `done` can, and only once.
 */

import { describe, expect, it, vi } from "vitest"
import { createProgressReporter } from "../export-progress"

describe("createProgressReporter", () => {
  it("is a no-op with no listener — callers pay nothing for progress nobody asked for", () => {
    const reporter = createProgressReporter()
    expect(() => reporter.report("loading", "Loading", 50)).not.toThrow()
    expect(() => reporter.done("Ready")).not.toThrow()
  })

  it("forwards each report to the listener with the stage, label and percent given", () => {
    const listener = vi.fn()
    const reporter = createProgressReporter(listener)
    reporter.report("loading", "Loading event data", 8)
    expect(listener).toHaveBeenCalledWith({ stage: "loading", label: "Loading event data", percent: 8 })
  })

  it("clamps a percent lower than the last one reported, never stepping the bar backwards", () => {
    const listener = vi.fn()
    const reporter = createProgressReporter(listener)
    reporter.report("analysing", "Analysing (5/10)", 40)
    reporter.report("analysing", "Analysing (4/10)", 32) // a caller's own bookkeeping slip
    expect(listener).toHaveBeenLastCalledWith({
      stage: "analysing",
      label: "Analysing (4/10)",
      percent: 40, // held at the last real value, not the lower one just given
    })
  })

  it("caps report() at 99 — 100 is reserved for done()", () => {
    const listener = vi.fn()
    const reporter = createProgressReporter(listener)
    reporter.report("finalising", "Preparing your download", 100)
    expect(listener).toHaveBeenLastCalledWith({
      stage: "finalising",
      label: "Preparing your download",
      percent: 99,
    })
  })

  it("done() emits exactly percent 100, stage 'done'", () => {
    const listener = vi.fn()
    const reporter = createProgressReporter(listener)
    reporter.report("loading", "Loading", 5)
    reporter.done("Ready to download")
    expect(listener).toHaveBeenLastCalledWith({ stage: "done", label: "Ready to download", percent: 100 })
  })

  it("ignores every call after done() — the terminal event fires at most once", () => {
    const listener = vi.fn()
    const reporter = createProgressReporter(listener)
    reporter.done("Ready")
    reporter.report("loading", "Loading again?", 10)
    reporter.done("Ready again?")
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({ stage: "done", label: "Ready", percent: 100 })
  })
})
