// isRateLimitExhausted reads a counter without spending it (in-memory path;
// no Redis is configured under test).

import { describe, it, expect } from "vitest"
import { NextRequest } from "next/server"
import { isRateLimitExhausted, rateLimit } from "@/lib/rate-limit"

const CONFIG = { maxRequests: 3, windowInSeconds: 60 }
const request = new NextRequest("http://localhost/x", { method: "POST" })

describe("isRateLimitExhausted", () => {
  it("is false for an unused identifier and never spends", async () => {
    for (let i = 0; i < 10; i++) expect(await isRateLimitExhausted("peek:unused", CONFIG)).toBe(false)
    // Ten reads left the full allowance: three spends still succeed, the fourth fails.
    const spend = () => rateLimit(request, { ...CONFIG, identifier: () => "peek:unused" })
    expect((await spend()).success).toBe(true)
    expect((await spend()).success).toBe(true)
    expect((await spend()).success).toBe(true)
    expect((await spend()).success).toBe(false)
  })

  it("turns true exactly when the allowance is used up, on the same key", async () => {
    const spend = () => rateLimit(request, { ...CONFIG, identifier: () => "peek:used" })
    await spend()
    await spend()
    expect(await isRateLimitExhausted("peek:used", CONFIG)).toBe(false)
    await spend()
    expect(await isRateLimitExhausted("peek:used", CONFIG)).toBe(true)
  })

  it("does not mix presets: a different limit on the same identifier is its own counter", async () => {
    const other = { maxRequests: 5, windowInSeconds: 60 }
    await rateLimit(request, { ...CONFIG, identifier: () => "peek:preset" })
    expect(await isRateLimitExhausted("peek:preset", other)).toBe(false)
  })
})
