// Covers the submission-deadline countdown arithmetic: the clock string
// (MM:SS under an hour, unpadded hours above it) and the colour state at the
// 30-minute and 10-minute boundaries. On submission day 140 builders read
// these digits to decide whether they still have time, so the boundaries are
// pinned on both sides rather than sampled.

import { describe, it, expect } from "vitest"
import { countdownTone, formatRemaining } from "../countdown-format"

const MINUTE = 60_000
const HOUR = 3_600_000

describe("formatRemaining", () => {
  it("shows a zeroed clock at and past the deadline", () => {
    expect(formatRemaining(0)).toBe("00:00")
    expect(formatRemaining(-1)).toBe("00:00")
    expect(formatRemaining(-5 * MINUTE)).toBe("00:00")
  })

  it("pads seconds under a minute", () => {
    expect(formatRemaining(9_000)).toBe("00:09")
  })

  it("shows MM:SS under an hour", () => {
    expect(formatRemaining(41 * MINUTE + 9_000)).toBe("41:09")
  })

  it("shows unpadded hours above an hour", () => {
    expect(formatRemaining(2 * HOUR + 41 * MINUTE + 9_000)).toBe("2:41:09")
  })

  it("keeps two-digit hours in double figures", () => {
    expect(formatRemaining(10 * HOUR)).toBe("10:00:00")
  })

  it("rounds up so the final second reads 00:01", () => {
    expect(formatRemaining(1)).toBe("00:01")
    expect(formatRemaining(59 * MINUTE + 59_500)).toBe("1:00:00")
  })
})

describe("countdownTone", () => {
  it("is calm with more than 30 minutes left", () => {
    expect(countdownTone(2 * HOUR)).toBe("calm")
    expect(countdownTone(30 * MINUTE + 1)).toBe("calm")
  })

  it("warns from 30 minutes down to 10", () => {
    expect(countdownTone(30 * MINUTE)).toBe("warn")
    expect(countdownTone(10 * MINUTE + 1)).toBe("warn")
  })

  it("is urgent from 10 minutes down to the deadline", () => {
    expect(countdownTone(10 * MINUTE)).toBe("urgent")
    expect(countdownTone(1)).toBe("urgent")
  })

  it("is closed at and past the deadline", () => {
    expect(countdownTone(0)).toBe("closed")
    expect(countdownTone(-1)).toBe("closed")
  })
})
