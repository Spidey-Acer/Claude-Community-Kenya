import { describe, it, expect } from "vitest"
import { resolveCommentStatus } from "@/lib/showcase/comment-status"

describe("resolveCommentStatus", () => {
  it("publishes a verified member's comment immediately", () => {
    expect(resolveCommentStatus({ userId: "u1", emailVerified: true })).toBe("APPROVED")
  })

  it("queues an unverified member's comment", () => {
    expect(resolveCommentStatus({ userId: "u1", emailVerified: false })).toBe("PENDING")
  })

  it("queues an anonymous comment", () => {
    expect(resolveCommentStatus({ userId: null, emailVerified: false })).toBe("PENDING")
  })

  it("queues an anonymous comment even if emailVerified is somehow true", () => {
    expect(resolveCommentStatus({ userId: null, emailVerified: true })).toBe("PENDING")
  })
})
