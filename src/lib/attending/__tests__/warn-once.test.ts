import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const redisState = vi.hoisted(() => ({ client: null as null | { set: ReturnType<typeof vi.fn> } }))
vi.mock("@/lib/rate-limit", () => ({ getRedisClient: () => redisState.client }))

import { warnBudgetExhaustedOnce } from "../warn-once"

let warn: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  redisState.client = null
  warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
  vi.spyOn(console, "error").mockImplementation(() => undefined)
})
afterEach(() => vi.restoreAllMocks())

describe("warnBudgetExhaustedOnce", () => {
  it("with Redis, warns only when the set-if-absent key was created, and sets a one hour expiry", async () => {
    const set = vi.fn().mockResolvedValueOnce("OK").mockResolvedValue(null)
    redisState.client = { set }
    await warnBudgetExhaustedOnce("evt-a")
    await warnBudgetExhaustedOnce("evt-a")
    expect(warn).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledWith("cck:attending:warned:evt-a", "1", { nx: true, ex: 3600 })
    expect(String(warn.mock.calls[0][0])).toContain("evt-a")
  })

  it("without Redis, falls back to a per-slug in-memory window", async () => {
    await warnBudgetExhaustedOnce("evt-b")
    await warnBudgetExhaustedOnce("evt-b")
    await warnBudgetExhaustedOnce("evt-c")
    expect(warn).toHaveBeenCalledTimes(2)
  })

  it("falls back to memory when Redis throws", async () => {
    redisState.client = { set: vi.fn().mockRejectedValue(new Error("down")) }
    await warnBudgetExhaustedOnce("evt-d")
    await warnBudgetExhaustedOnce("evt-d")
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it("warns again after the window passes", async () => {
    vi.useFakeTimers()
    await warnBudgetExhaustedOnce("evt-e")
    vi.advanceTimersByTime(3601 * 1000)
    await warnBudgetExhaustedOnce("evt-e")
    vi.useRealTimers()
    expect(warn).toHaveBeenCalledTimes(2)
  })
})
