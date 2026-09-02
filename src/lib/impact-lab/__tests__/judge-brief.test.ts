import { describe, it, expect } from "vitest"
import {
  criterionDescription,
  isJudgeTab,
  resolveJudgeTab,
} from "../judge-brief"

describe("resolveJudgeTab", () => {
  it("opens the brief for a judge who has not scored anything yet", () => {
    expect(resolveJudgeTab(null, false)).toBe("brief")
  })

  it("opens the scorecard for a judge already part-way through", () => {
    expect(resolveJudgeTab(null, true)).toBe("score")
  })

  it("honours a remembered choice over the default", () => {
    expect(resolveJudgeTab("score", false)).toBe("score")
    expect(resolveJudgeTab("brief", true)).toBe("brief")
  })

  it("falls back to the default when storage holds junk", () => {
    expect(resolveJudgeTab("", false)).toBe("brief")
    expect(resolveJudgeTab("Score", true)).toBe("score")
    expect(resolveJudgeTab("rubric", true)).toBe("score")
  })
})

describe("isJudgeTab", () => {
  it("accepts only the two panel names", () => {
    expect(isJudgeTab("brief")).toBe(true)
    expect(isJudgeTab("score")).toBe(true)
    expect(isJudgeTab("scores")).toBe(false)
    expect(isJudgeTab(null)).toBe(false)
    expect(isJudgeTab(2)).toBe(false)
  })
})

describe("criterionDescription", () => {
  it("prefers the live rubric's own guidance", () => {
    expect(criterionDescription("impact", "The panel's wording.")).toBe(
      "The panel's wording."
    )
  })

  it("falls back per key when the stored rubric left guidance blank", () => {
    expect(criterionDescription("demo", "   ")).toContain("Software, not slides")
    expect(criterionDescription("claude", undefined)).toContain("real work")
  })

  it("invents nothing for a criterion it does not know", () => {
    expect(criterionDescription("feasibility", "")).toBe("")
  })
})
