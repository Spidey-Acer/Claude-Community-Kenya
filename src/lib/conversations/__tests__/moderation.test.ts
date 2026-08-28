import { describe, it, expect } from "vitest"
import { isValidModerationTransition, isModerationStatus } from "@/lib/conversations/moderation"

describe("isValidModerationTransition", () => {
  it("accepts APPROVED, FEATURED, REJECTED", () => {
    expect(isValidModerationTransition("APPROVED")).toBe(true)
    expect(isValidModerationTransition("FEATURED")).toBe(true)
    expect(isValidModerationTransition("REJECTED")).toBe(true)
  })

  it("rejects PENDING — no un-approve action", () => {
    expect(isValidModerationTransition("PENDING")).toBe(false)
  })

  it("rejects garbage input", () => {
    expect(isValidModerationTransition("approved")).toBe(false)
    expect(isValidModerationTransition("")).toBe(false)
    expect(isValidModerationTransition("DELETED")).toBe(false)
  })

  it("allows moving between the three targets, not just from PENDING", () => {
    // A row already APPROVED can still be re-tapped to FEATURED or REJECTED.
    expect(isValidModerationTransition("FEATURED")).toBe(true)
  })
})

describe("isModerationStatus", () => {
  it("accepts PENDING plus the three moderation targets", () => {
    expect(isModerationStatus("PENDING")).toBe(true)
    expect(isModerationStatus("APPROVED")).toBe(true)
    expect(isModerationStatus("FEATURED")).toBe(true)
    expect(isModerationStatus("REJECTED")).toBe(true)
  })

  it("rejects anything else", () => {
    expect(isModerationStatus("DRAFT")).toBe(false)
  })
})
