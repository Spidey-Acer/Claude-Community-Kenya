import { describe, expect, it } from "vitest"

import {
  EXCERPT_MAX_CHARS,
  collapseAll,
  expandAll,
  reviewExcerpt,
  toggleOpen,
} from "../reviewCollapse"

describe("toggleOpen", () => {
  it("opens a closed card and closes an open one", () => {
    const opened = toggleOpen(new Set(), "a")
    expect(opened.has("a")).toBe(true)
    const closed = toggleOpen(opened, "a")
    expect(closed.has("a")).toBe(false)
  })

  it("never mutates the set it was given", () => {
    const before = new Set(["a"])
    toggleOpen(before, "b")
    toggleOpen(before, "a")
    expect([...before]).toEqual(["a"])
  })

  it("leaves other cards alone", () => {
    const next = toggleOpen(new Set(["a", "b"]), "b")
    expect([...next]).toEqual(["a"])
  })
})

describe("expandAll / collapseAll", () => {
  it("expandAll opens every id it is given", () => {
    expect([...expandAll(["a", "b", "c"])].sort()).toEqual(["a", "b", "c"])
  })

  it("collapseAll closes everything when nothing is being edited", () => {
    expect(collapseAll([]).size).toBe(0)
  })

  it("collapseAll keeps cards with unsaved edits open", () => {
    const next = collapseAll(["dirty-1", "dirty-2"])
    expect(next.has("dirty-1")).toBe(true)
    expect(next.has("dirty-2")).toBe(true)
    expect(next.has("clean")).toBe(false)
  })
})

describe("reviewExcerpt", () => {
  it("returns an empty string for an empty or whitespace-only review", () => {
    expect(reviewExcerpt("")).toBe("")
    expect(reviewExcerpt("  \n\t ")).toBe("")
  })

  it("collapses newlines and runs of spaces into single spaces", () => {
    expect(reviewExcerpt("Your team\n\nbuilt   something\treal.")).toBe(
      "Your team built something real."
    )
  })

  it("returns short text untouched, with no ellipsis", () => {
    expect(reviewExcerpt("Short and sweet.")).toBe("Short and sweet.")
  })

  it("cuts at a word boundary under the limit and appends an ellipsis", () => {
    const words = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ")
    const out = reviewExcerpt(words, 40)
    expect(out.endsWith("…")).toBe(true)
    expect(out.length).toBeLessThanOrEqual(41)
    // Never ends mid-word: the bit before the ellipsis is a whole token.
    const body = out.slice(0, -1)
    expect(words.startsWith(body)).toBe(true)
    expect(words[body.length]).toBe(" ")
  })

  it("trims dangling punctuation before the ellipsis", () => {
    const out = reviewExcerpt("A strong demo, a clear pitch, and a working repo, delivered", 30)
    expect(out).toBe("A strong demo, a clear pitch…")
  })

  it("hard-cuts a single unbroken token rather than exceeding the limit", () => {
    const out = reviewExcerpt("x".repeat(500), 20)
    expect(out).toBe(`${"x".repeat(20)}…`)
  })

  it("defaults to the shared header limit", () => {
    const long = "lorem ipsum ".repeat(50)
    expect(reviewExcerpt(long).length).toBeLessThanOrEqual(EXCERPT_MAX_CHARS + 1)
  })
})
