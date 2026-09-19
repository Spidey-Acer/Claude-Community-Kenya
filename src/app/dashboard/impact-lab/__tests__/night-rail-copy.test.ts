// Covers how organiser-typed ground rules become the list on the dashboard
// rail. The field has no format hint, so it arrives as lines from one
// organiser and as a paragraph from the next; both must read as a list, and
// abbreviations inside a sentence must not be cut into rules of their own.

import { describe, it, expect } from "vitest"
import { splitLines, splitRules } from "../night-rail-copy"

describe("splitLines", () => {
  it("returns nothing for empty or missing text", () => {
    expect(splitLines(null)).toEqual([])
    expect(splitLines(undefined)).toEqual([])
    expect(splitLines("   \n  ")).toEqual([])
  })

  it("keeps one line per newline and drops blanks", () => {
    expect(splitLines("Be kind.\n\nShip something.\r\nDemo it live.")).toEqual([
      "Be kind.",
      "Ship something.",
      "Demo it live.",
    ])
  })

  it("strips list markers an organiser typed by hand", () => {
    expect(splitLines("- Be kind.\n* Ship something.\n• Demo it.\n1. Present.\n2) Leave.")).toEqual([
      "Be kind.",
      "Ship something.",
      "Demo it.",
      "Present.",
      "Leave.",
    ])
  })
})

describe("splitRules", () => {
  it("uses the organiser's own lines when there are several", () => {
    expect(splitRules("One rule. Two clauses.\nAnother rule.")).toEqual([
      "One rule. Two clauses.",
      "Another rule.",
    ])
  })

  it("splits a single paragraph into sentences", () => {
    expect(
      splitRules("Teams of up to three. Working software only! Do you have a demo? Bring it.")
    ).toEqual([
      "Teams of up to three.",
      "Working software only!",
      "Do you have a demo?",
      "Bring it.",
    ])
  })

  it("does not cut inside abbreviations or before lowercase", () => {
    expect(splitRules("Submissions close at 4 p.m. sharp, e.g. no extensions. Judges score after.")).toEqual([
      "Submissions close at 4 p.m. sharp, e.g. no extensions.",
      "Judges score after.",
    ])
  })

  it("breaks after a closing quote", () => {
    expect(splitRules('Say "hi." Then build.')).toEqual(['Say "hi."', "Then build."])
  })
})
