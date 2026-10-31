// Build Day Mombasa (Oct 2026) profile: three required fields, solo placement
// opted in, and no change to any other cohort's requirements.

import { describe, it, expect } from "vitest"
import { submissionRequirementsForCohort } from "../submission-requirements"
import { buildSubmissionSchema } from "../submission-schema"

describe("build-day-mombasa-2026-10 profile", () => {
  const requirements = submissionRequirementsForCohort("build-day-mombasa-2026-10")
  const schema = buildSubmissionSchema(requirements)
  const MINIMAL = {
    projectName: "Pesa Pal",
    track: "fintech",
    pitch: "Splits fares for matatu riders.",
  }

  it("requires only projectName, track and pitch, and opts into solo placement", () => {
    expect([...requirements.required].sort()).toEqual(["pitch", "projectName", "track"])
    expect(requirements.trackSelect).toBe(true)
    expect(requirements.soloPlacement).toBe(true)
  })

  it("accepts a submission with just those three fields", () => {
    expect(schema.safeParse(MINIMAL).success).toBe(true)
  })

  it("rejects a missing pitch, naming the field", () => {
    const result = schema.safeParse({ ...MINIMAL, pitch: "" })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path[0]).toBe("pitch")
  })

  it("leaves every other cohort on its old requirements, without solo placement", () => {
    for (const cohort of [
      "some-other-cohort",
      "build-day-2026-09",
      "impact-lab-2026-09",
      "payaza-hackhouse-2026",
    ]) {
      expect(submissionRequirementsForCohort(cohort).soloPlacement).toBeUndefined()
    }
    expect([...submissionRequirementsForCohort("build-day-2026-09").required]).toContain("repoUrl")
    expect([...submissionRequirementsForCohort("some-other-cohort").required]).toEqual([
      "slidesUrl",
    ])
  })
})
