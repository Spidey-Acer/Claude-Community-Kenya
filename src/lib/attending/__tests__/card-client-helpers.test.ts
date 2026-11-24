import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { DISPLAY_FONT_CLASS } from "../display-font"
import { isShareCancelled } from "../share-outcome"

const ROOT = process.cwd()
const read = (path: string) => readFileSync(join(ROOT, path), "utf8")

describe("display font probe", () => {
  it("the page heading and the font probe use the same DISPLAY_FONT_CLASS constant", () => {
    const page = read("src/app/events/[slug]/attending/page.tsx")
    const flow = read("src/components/karibu/attending/AttendingFlow.tsx")
    for (const source of [page, flow]) {
      expect(source).toMatch(/from "@\/lib\/attending\/display-font"/)
      expect(source).toContain("DISPLAY_FONT_CLASS")
    }
    expect(page).not.toMatch(/className="font-newsreader/)
    expect(flow).not.toContain("font-serif")
    expect(DISPLAY_FONT_CLASS).toBe("font-newsreader")
  })
})

describe("isShareCancelled", () => {
  it("is true only for an AbortError", () => {
    expect(isShareCancelled(new DOMException("closed", "AbortError"))).toBe(true)
    expect(isShareCancelled({ name: "AbortError" })).toBe(true)
  })

  it("is false for other errors and non-errors", () => {
    expect(isShareCancelled(new DOMException("denied", "NotAllowedError"))).toBe(false)
    expect(isShareCancelled(new Error("boom"))).toBe(false)
    expect(isShareCancelled(null)).toBe(false)
    expect(isShareCancelled("AbortError")).toBe(false)
  })
})
