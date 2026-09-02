import { describe, it, expect } from "vitest"
import {
  framingStatSchema,
  tableQuestionSchema,
  seedProblemSchema,
  resultInputSchema,
  pageConfigUpdateSchema,
  attachPageSchema,
  moderationPatchSchema,
  sessionCreateSchema,
  sessionPatchSchema,
} from "@/lib/conversations/schemas"
import { DEFAULT_TABLE_QUESTIONS, MAX_RESULT_RUNNERS_UP } from "@/lib/conversations/constants"

describe("framingStatSchema", () => {
  it("accepts a valid stat", () => {
    const result = framingStatSchema.safeParse({ line: "42% of Kenyans used ChatGPT last month.", source: "DataReportal 2025" })
    expect(result.success).toBe(true)
  })

  it("rejects an empty line", () => {
    expect(framingStatSchema.safeParse({ line: "", source: "x" }).success).toBe(false)
  })

  it("rejects a missing source", () => {
    expect(framingStatSchema.safeParse({ line: "x" }).success).toBe(false)
  })
})

describe("tableQuestionSchema", () => {
  it("accepts the kit defaults", () => {
    for (const q of DEFAULT_TABLE_QUESTIONS) {
      expect(tableQuestionSchema.safeParse(q).success).toBe(true)
    }
  })

  it("rejects a key over 40 chars", () => {
    const result = tableQuestionSchema.safeParse({ key: "x".repeat(41), label: "L", description: "D" })
    expect(result.success).toBe(false)
  })
})

describe("seedProblemSchema", () => {
  it("accepts a seed with no buildWedge", () => {
    const result = seedProblemSchema.safeParse({
      title: "Deni Ya Kichwani",
      statement: "I keep my whole business in my head.",
      questionKey: "jobs",
    })
    expect(result.success).toBe(true)
  })

  it("rejects a statement over 600 chars", () => {
    const result = seedProblemSchema.safeParse({
      title: "T",
      statement: "x".repeat(601),
      questionKey: "jobs",
    })
    expect(result.success).toBe(false)
  })
})

describe("resultInputSchema", () => {
  it("accepts a winner with no runners-up", () => {
    const result = resultInputSchema.safeParse({ winner: { title: "T", statement: "S" } })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.runnersUp).toEqual([])
  })

  it(`rejects more than ${MAX_RESULT_RUNNERS_UP} runners-up`, () => {
    const runnersUp = Array.from({ length: MAX_RESULT_RUNNERS_UP + 1 }, (_, i) => ({
      title: `T${i}`,
      statement: `S${i}`,
    }))
    const result = resultInputSchema.safeParse({ winner: { title: "T", statement: "S" }, runnersUp })
    expect(result.success).toBe(false)
  })

  it("never accepts a client-supplied publishedAt — the field isn't in the schema", () => {
    const result = resultInputSchema.safeParse({
      winner: { title: "T", statement: "S" },
      publishedAt: "2020-01-01T00:00:00.000Z",
    })
    expect(result.success).toBe(true)
    if (result.success) expect("publishedAt" in result.data).toBe(false)
  })
})

describe("pageConfigUpdateSchema", () => {
  it("accepts a partial update", () => {
    expect(pageConfigUpdateSchema.safeParse({ contributionsOpen: false }).success).toBe(true)
  })

  it("rejects an empty tableQuestions array", () => {
    expect(pageConfigUpdateSchema.safeParse({ tableQuestions: [] }).success).toBe(false)
  })

  it("accepts an empty object (no-op update)", () => {
    expect(pageConfigUpdateSchema.safeParse({}).success).toBe(true)
  })

  it("accepts a null reportSummary and reportUrl (clears both fields)", () => {
    const result = pageConfigUpdateSchema.safeParse({ reportSummary: null, reportUrl: null })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reportSummary).toBeNull()
      expect(result.data.reportUrl).toBeNull()
    }
  })

  it("preserves blank-line paragraph breaks in reportSummary", () => {
    const result = pageConfigUpdateSchema.safeParse({
      reportSummary: "First paragraph.\n\nSecond paragraph.",
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.reportSummary).toBe("First paragraph.\n\nSecond paragraph.")
  })

  it("rejects a reportSummary over 1200 chars", () => {
    expect(pageConfigUpdateSchema.safeParse({ reportSummary: "x".repeat(1201) }).success).toBe(false)
  })

  it("accepts an https reportUrl", () => {
    const result = pageConfigUpdateSchema.safeParse({ reportUrl: "https://example.com/report.pdf" })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.reportUrl).toBe("https://example.com/report.pdf")
  })

  it("rejects an http reportUrl", () => {
    expect(pageConfigUpdateSchema.safeParse({ reportUrl: "http://example.com/report.pdf" }).success).toBe(false)
  })

  it("rejects a javascript: reportUrl", () => {
    expect(pageConfigUpdateSchema.safeParse({ reportUrl: "javascript:alert(1)" }).success).toBe(false)
  })

  it("rejects a reportUrl over 500 chars", () => {
    const url = "https://example.com/" + "x".repeat(490)
    expect(pageConfigUpdateSchema.safeParse({ reportUrl: url }).success).toBe(false)
  })
})

describe("attachPageSchema", () => {
  it("requires eventId", () => {
    expect(attachPageSchema.safeParse({}).success).toBe(false)
  })

  it("accepts eventId alone with all overrides defaulted upstream", () => {
    expect(attachPageSchema.safeParse({ eventId: "evt_1" }).success).toBe(true)
  })
})

describe("moderationPatchSchema", () => {
  it("accepts a question approval", () => {
    expect(moderationPatchSchema.safeParse({ kind: "question", id: "q_1", status: "APPROVED" }).success).toBe(true)
  })

  it("rejects PENDING as a target status", () => {
    expect(moderationPatchSchema.safeParse({ kind: "contribution", id: "c_1", status: "PENDING" }).success).toBe(false)
  })

  it("rejects an unknown kind", () => {
    expect(moderationPatchSchema.safeParse({ kind: "comment", id: "x", status: "APPROVED" }).success).toBe(false)
  })
})

describe("sessionCreateSchema", () => {
  it("defaults isOpen to false", () => {
    const result = sessionCreateSchema.safeParse({ eventId: "evt_1", title: "Ask Anthropic's team", prompt: "Type your question." })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.isOpen).toBe(false)
  })
})

describe("sessionPatchSchema", () => {
  it("requires id but allows every other field to be omitted", () => {
    expect(sessionPatchSchema.safeParse({ id: "s_1" }).success).toBe(true)
    expect(sessionPatchSchema.safeParse({ isOpen: true }).success).toBe(false)
  })
})
