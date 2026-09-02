import { describe, it, expect } from "vitest"
import { parseTracks, resolveTrack, trackSchema } from "../tracks"

const TRACKS = [
  { key: "jobs", label: "Work & Jobs", aliases: ["work-and-jobs", "employment"] },
  { key: "health", label: "Health", aliases: ["healthcare"] },
]

describe("parseTracks", () => {
  it("parses a well-formed array", () => {
    expect(parseTracks(TRACKS)).toEqual(TRACKS)
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
    expect(resolveTrack(TRACKS, ["jobs"])).toBe("jobs")
  })

  it("resolves by alias, case-insensitively and slugified", () => {
    expect(resolveTrack(TRACKS, ["Work-And-Jobs"])).toBe("jobs")
    expect(resolveTrack(TRACKS, ["Employment"])).toBe("jobs")
  })

  it("resolves 'any' and empty interests to no track", () => {
    expect(resolveTrack(TRACKS, ["any"])).toBeNull()
    expect(resolveTrack(TRACKS, [""])).toBeNull()
    expect(resolveTrack(TRACKS, [])).toBeNull()
  })

  it("returns null for an unmatched interest", () => {
    expect(resolveTrack(TRACKS, ["wherever the strongest problem is"])).toBeNull()
  })

  it("returns null when the event has no tracks at all", () => {
    expect(resolveTrack([], ["jobs"])).toBeNull()
  })

  it("checks later interests when the first doesn't resolve", () => {
    expect(resolveTrack(TRACKS, ["unrelated", "health"])).toBe("health")
  })
})
