import { describe, expect, it } from "vitest"

import { DEFAULT_TAB, tabFromQuery } from "../tabUrl"

describe("tabFromQuery", () => {
  it("returns the default when the value is missing", () => {
    expect(tabFromQuery(null)).toBe(DEFAULT_TAB)
    expect(tabFromQuery(undefined)).toBe(DEFAULT_TAB)
  })

  it("returns the default for an unknown or stale tab key", () => {
    expect(tabFromQuery("not-a-tab")).toBe(DEFAULT_TAB)
    expect(tabFromQuery("")).toBe(DEFAULT_TAB)
  })

  it("passes through every known tab key unchanged", () => {
    const known = [
      "events",
      "participants",
      "matching",
      "runs",
      "submissions",
      "checkin",
      "rubric",
      "leaderboard",
      "judges",
      "results",
      "cards",
    ] as const
    for (const key of known) {
      expect(tabFromQuery(key)).toBe(key)
    }
  })
})
