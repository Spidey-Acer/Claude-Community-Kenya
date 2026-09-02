import { describe, expect, it } from "vitest"

import { trackTone } from "../track-tone"

describe("trackTone", () => {
  it("gives tonight's three tracks three distinct colours", () => {
    const pills = [trackTone("elimu").pill, trackTone("kilimo").pill, trackTone("kazi").pill]
    expect(new Set(pills).size).toBe(3)
    expect(trackTone("elimu").dot).toBe("bg-green-primary")
    expect(trackTone("kilimo").dot).toBe("bg-amber")
    expect(trackTone("kazi").dot).toBe("bg-cyan")
  })

  it("falls back to the neutral tone for no track and for an unknown key", () => {
    const neutral = trackTone(null)
    expect(neutral.dot).toBe("bg-text-dim")
    expect(trackTone(undefined)).toEqual(neutral)
    expect(trackTone("")).toEqual(neutral)
    expect(trackTone("afya")).toEqual(neutral)
  })

  it("matches a key case-insensitively", () => {
    expect(trackTone("ELIMU")).toEqual(trackTone("elimu"))
  })
})
