// Default team-size settings for the Impact Lab matching engine. Desired
// team size moved from 4 to 5 (min 3 / max 5 unchanged) — see
// docs/impact-lab-matching-spec.md.

import { describe, it, expect } from "vitest"
import { DEFAULT_SETTINGS, DEFAULT_DESIRED_TEAM_SIZE, DEFAULT_MIN_TEAM_SIZE, DEFAULT_MAX_TEAM_SIZE } from "../constants"

describe("matching default team size", () => {
  it("defaults desiredTeamSize to 5, with min 3 and max 5", () => {
    expect(DEFAULT_DESIRED_TEAM_SIZE).toBe(5)
    expect(DEFAULT_MIN_TEAM_SIZE).toBe(3)
    expect(DEFAULT_MAX_TEAM_SIZE).toBe(5)
    expect(DEFAULT_SETTINGS.desiredTeamSize).toBe(5)
  })
})
