// Proves the per-call analytics switch: off when a caller asks, on by default
// so every existing caller keeps its behaviour. The Upstash classes are faked
// so the options passed to the Ratelimit constructor can be read.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const constructed = vi.hoisted(() => ({ options: [] as { analytics?: boolean }[] }))

vi.mock("@upstash/redis", () => ({ Redis: class {} }))
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn(() => "window")
    constructor(options: { analytics?: boolean }) {
      constructed.options.push(options)
    }
    async limit() {
      return { success: true, remaining: 1, limit: 2, reset: Date.now() + 1000 }
    }
  },
}))

const request = new NextRequest("http://localhost/x", { method: "POST" })

beforeEach(() => {
  constructed.options.length = 0
  vi.resetModules()
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example")
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token")
})
afterEach(() => vi.unstubAllEnvs())

describe("rateLimit analytics option", () => {
  it("keeps analytics on for a caller that does not say (existing callers unchanged)", async () => {
    const { rateLimit } = await import("../rate-limit")
    await rateLimit(request, { maxRequests: 5, windowInSeconds: 60 })
    expect(constructed.options[0].analytics).toBe(true)
  })

  it("turns analytics off when the caller passes analytics: false", async () => {
    const { rateLimit } = await import("../rate-limit")
    await rateLimit(request, { maxRequests: 5, windowInSeconds: 60, analytics: false })
    expect(constructed.options[0].analytics).toBe(false)
  })
})
