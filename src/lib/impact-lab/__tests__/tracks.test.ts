import { describe, it, expect } from "vitest"
import { parseTracks, resolveTrack, trackSchema } from "../tracks"

/** Legacy shape: what tracks stored before the participant guide existed
 * look like — no `rules`, none of the guide fields. */
const TRACKS = [
  { key: "jobs", label: "Work & Jobs", aliases: ["work-and-jobs", "employment"] },
  { key: "health", label: "Health", aliases: ["healthcare"] },
]

/** The same tracks as `parseTracks` returns them, with `rules` defaulted. */
const PARSED_TRACKS = TRACKS.map((t) => ({ ...t, rules: [] }))

/** A track carrying every participant-guide field. */
const RICH_TRACK = {
  key: "elimu",
  label: "Elimu",
  description: "Education",
  aliases: ["education"],
  englishName: "Education: the Grade 10 teacher",
  beneficiary: "A Grade 10 teacher marking 60 scripts a night",
  problem: "Marking eats the evening that lesson planning needs.",
  rules: ["Must work offline", "No learner data leaves the device"],
  build: "A phone camera that reads a script and drafts the marks.",
  judgesAsk: "Would a teacher use this on Monday?",
}

describe("parseTracks", () => {
  it("parses a well-formed array", () => {
    expect(parseTracks(TRACKS)).toEqual(PARSED_TRACKS)
  })

  it("parses a legacy track with no rules, defaulting rules to []", () => {
    expect(parseTracks([{ key: "jobs", label: "Kazi", aliases: [] }])).toEqual([
      { key: "jobs", label: "Kazi", aliases: [], rules: [] },
    ])
  })

  it("round-trips a track carrying every guide field", () => {
    expect(parseTracks([RICH_TRACK])).toEqual([RICH_TRACK])
  })

  it("degrades the whole parse to [] when one track exceeds the 8-rule cap", () => {
    const nineRules = { ...RICH_TRACK, rules: Array.from({ length: 9 }, (_, i) => `Rule ${i}`) }
    expect(parseTracks([nineRules])).toEqual([])
    // …including when a valid track sits alongside it: the parse is all-or-nothing.
    expect(parseTracks([TRACKS[0], nineRules])).toEqual([])
  })

  it("degrades tolerantly on garbage input", () => {
    expect(parseTracks(null)).toEqual([])
    expect(parseTracks(undefined)).toEqual([])
    expect(parseTracks("not an array")).toEqual([])
    expect(parseTracks({ not: "an array" })).toEqual([])
    expect(parseTracks([{ key: "BAD KEY", label: "x", aliases: [] }])).toEqual([])
  })

  it("rejects a track with an invalid key via trackSchema", () => {
    expect(trackSchema.safeParse({ key: "Not Valid", label: "x", aliases: [] }).success).toBe(false)
    expect(trackSchema.safeParse({ key: "valid-key", label: "x", aliases: [] }).success).toBe(true)
  })
})

describe("resolveTrack", () => {
  it("resolves by exact key", () => {
    expect(resolveTrack(PARSED_TRACKS, ["jobs"])).toBe("jobs")
  })

  it("resolves by alias, case-insensitively and slugified", () => {
    expect(resolveTrack(PARSED_TRACKS, ["Work-And-Jobs"])).toBe("jobs")
    expect(resolveTrack(PARSED_TRACKS, ["Employment"])).toBe("jobs")
  })

  it("resolves 'any' and empty interests to no track", () => {
    expect(resolveTrack(PARSED_TRACKS, ["any"])).toBeNull()
    expect(resolveTrack(PARSED_TRACKS, [""])).toBeNull()
    expect(resolveTrack(PARSED_TRACKS, [])).toBeNull()
  })

  it("returns null for an unmatched interest", () => {
    expect(resolveTrack(PARSED_TRACKS, ["wherever the strongest problem is"])).toBeNull()
  })

  it("returns null when the event has no tracks at all", () => {
    expect(resolveTrack([], ["jobs"])).toBeNull()
  })

  it("checks later interests when the first doesn't resolve", () => {
    expect(resolveTrack(PARSED_TRACKS, ["unrelated", "health"])).toBe("health")
  })
})
