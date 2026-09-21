/**
 * `cleanProse` and the markdown stripper — coverage for the export fix that
 * removed the "%Z"-shaped Windows-line-break artefact and raw markdown
 * syntax from the PDF and Excel exports (see `export-data.ts`'s "Prose
 * hygiene" section).
 *
 * Also holds the organiser's zero-em-dash rule for the exporters' own copy
 * shut directly: a source-level grep over every `export-*.ts` file, the same
 * check the export route's fix was verified against.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { cleanProse, markdownToPlainText, parseProseLines } from "../export-data"

describe("cleanProse", () => {
  it("normalises Windows line endings to a bare \\n", () => {
    expect(cleanProse("line one\r\nline two")).toBe("line one\nline two")
  })

  it("normalises a lone \\r to \\n", () => {
    expect(cleanProse("line one\rline two")).toBe("line one\nline two")
  })

  it("normalises U+2028 and U+2029 to \\n", () => {
    const lineSeparator = String.fromCharCode(0x2028)
    const paragraphSeparator = String.fromCharCode(0x2029)
    expect(cleanProse(`one${lineSeparator}two${paragraphSeparator}three`)).toBe("one\ntwo\nthree")
  })

  it("strips zero-width characters", () => {
    const zeroWidthSpace = String.fromCharCode(0x200b)
    const bom = String.fromCharCode(0xfeff)
    expect(cleanProse(`hi${zeroWidthSpace}there${bom}`)).toBe("hithere")
  })

  it("strips control characters other than \\n and \\t", () => {
    const bell = String.fromCharCode(0x07)
    const del = String.fromCharCode(0x7f)
    expect(cleanProse(`a${bell}b${del}c`)).toBe("abc")
  })

  it("keeps a tab", () => {
    expect(cleanProse("a\tb")).toBe("a\tb")
  })

  it("collapses three or more consecutive newlines to two", () => {
    expect(cleanProse("one\n\n\n\n\ntwo")).toBe("one\n\ntwo")
  })

  it("trims leading and trailing whitespace", () => {
    expect(cleanProse("  \n hello \n  ")).toBe("hello")
  })

  it("is a no-op on already-clean prose", () => {
    expect(cleanProse("A clean sentence.\n\nA second paragraph.")).toBe(
      "A clean sentence.\n\nA second paragraph."
    )
  })
})

describe("parseProseLines / markdownToPlainText", () => {
  it("strips bold markers, keeping the words", () => {
    expect(markdownToPlainText("This is **bold** text.")).toBe("This is bold text.")
    expect(markdownToPlainText("This is __also bold__ text.")).toBe("This is also bold text.")
  })

  it("strips italic markers, keeping the words", () => {
    expect(markdownToPlainText("This is *italic* text.")).toBe("This is italic text.")
    expect(markdownToPlainText("This is _also italic_ text.")).toBe("This is also italic text.")
  })

  it("does not mangle a snake_case identifier", () => {
    expect(markdownToPlainText("Built with claude_usage_tracker enabled.")).toBe(
      "Built with claude_usage_tracker enabled."
    )
  })

  it("strips inline code backticks, keeping the words", () => {
    expect(markdownToPlainText("Run `npm install` first.")).toBe("Run npm install first.")
  })

  it("strips ATX heading markers, keeping the words as a plain line", () => {
    expect(markdownToPlainText("# Heading\nBody text.")).toBe("Heading\nBody text.")
  })

  it("converts a markdown link to 'text (url)'", () => {
    expect(markdownToPlainText("See [our docs](https://example.com/docs) for more.")).toBe(
      "See our docs (https://example.com/docs) for more."
    )
  })

  it("turns *, -, and + bullet lines into '• ' lines", () => {
    const input = "Intro line.\n* first\n- second\n+ third"
    expect(markdownToPlainText(input)).toBe(
      "Intro line.\n• first\n• second\n• third"
    )
  })

  it("turns a numbered list into '• ' lines", () => {
    expect(markdownToPlainText("1. one\n2. two")).toBe("• one\n• two")
  })

  it("strips emphasis inside a bullet item too", () => {
    expect(markdownToPlainText("* **Bold** bullet")).toBe("• Bold bullet")
  })

  it("parseProseLines tags bullet vs paragraph lines", () => {
    const lines = parseProseLines("A paragraph.\n* A bullet.\nAnother paragraph line.")
    expect(lines.map((l) => l.type)).toEqual(["paragraph", "bullet", "paragraph"])
    expect(lines.map((l) => l.text)).toEqual([
      "A paragraph.",
      "A bullet.",
      "Another paragraph line.",
    ])
  })

  it("handles a Windows-line-broken submission with mixed markdown end to end", () => {
    const raw =
      "**The pitch.**\r\n\r\nWhat it does:\r\n* Tracks attendance\r\n* Sends a `receipt`\r\n\r\nSee [the repo](https://github.com/example/repo)."
    const result = markdownToPlainText(raw)
    expect(result).not.toContain("\r")
    expect(result).not.toContain("**")
    expect(result).not.toContain("`")
    expect(result).toContain("• Tracks attendance")
    expect(result).toContain("• Sends a receipt")
    expect(result).toContain("the repo (https://github.com/example/repo)")
  })

  it("returns an empty array for blank input", () => {
    expect(parseProseLines("")).toEqual([])
    expect(parseProseLines("   ")).toEqual([])
  })
})

describe("exporter source files carry no em dash (U+2014)", () => {
  // The organiser's rule: zero U+2014 anywhere the exporters' own copy is
  // written, verified the same way the fix itself was: grepping every
  // `export-*.ts` file in this directory. Built from a char code, not a
  // literal character, so this assertion can never accidentally satisfy
  // itself under a later broader grep.
  const EM_DASH = String.fromCharCode(0x2014)
  const dir = join(__dirname, "..")
  const files = [
    "export-analysis.ts",
    "export-data.ts",
    "export-excel.ts",
    "export-pdf-charts.ts",
    "export-pdf.ts",
    "export-theme.ts",
  ]

  for (const file of files) {
    it(`${file} contains no em dash`, () => {
      const content = readFileSync(join(dir, file), "utf-8")
      expect(content.includes(EM_DASH)).toBe(false)
    })
  }
})
