import { describe, it, expect } from "vitest"
import { preflightProblems } from "../copy-preflight"

describe("preflightProblems", () => {
  it("passes when both the enum value and the column exist", () => {
    expect(preflightProblems({ projectEnumRows: [{ one: 1 }], featuredColumnRows: [{ one: 1 }] })).toEqual([])
  })
  it("reports a missing PROJECT enum value", () => {
    const problems = preflightProblems({ projectEnumRows: [], featuredColumnRows: [{ one: 1 }] })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("PROJECT")
  })
  it("reports a missing featured column", () => {
    const problems = preflightProblems({ projectEnumRows: [{ one: 1 }], featuredColumnRows: [] })
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain("featured")
  })
  it("reports both when both are missing", () => {
    expect(preflightProblems({ projectEnumRows: [], featuredColumnRows: [] })).toHaveLength(2)
  })
})
