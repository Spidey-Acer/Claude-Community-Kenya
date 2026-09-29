// Covers the per-cohort submission requirements table and the schema it
// builds: the default profile (slides-only) must keep working for every
// existing cohort, and the 2 Sep 2026 cohort's seven required fields must be
// enforced with field-level errors, not a blanket rejection.

import { describe, it, expect } from "vitest"
import {
  submissionRequirementsForCohort,
  toRequirementsView,
} from "../submission-requirements"
import { buildSubmissionSchema, submissionInputSchema } from "../submission-schema"

const FULL_02_SUBMISSION = {
  projectName: "Sauti",
  pitch: "Helps farmers report crop disease over WhatsApp voice notes.",
  description: "A voice-first crop diagnosis assistant.",
  worksVsMocked: "Voice upload and diagnosis are live; SMS follow-up is mocked.",
  claudeUsage: "Claude Sonnet classifies the disease from a transcript; never gives dosage advice.",
  track: "agriculture",
  problemTackled: "This helps smallholder farmers, who today struggle with delayed diagnosis.",
  repoUrl: "github.com/example/sauti",
  demoUrl: "",
  videoUrl: "",
  slidesUrl: "",
  screenshotUrl: "",
}

describe("submissionRequirementsForCohort", () => {
  it("falls back to the default (slides-only) profile for an unknown cohort", () => {
    const req = submissionRequirementsForCohort("some-other-cohort")
    expect([...req.required]).toEqual(["slidesUrl"])
    expect(req.trackSelect).toBe(false)
    expect(req.labels).toEqual({})
    expect(req.hints).toEqual({})
  })

  it("leaves hints empty on the other named cohorts", () => {
    expect(submissionRequirementsForCohort("impact-lab-2026-09").hints).toEqual({})
    expect(submissionRequirementsForCohort("build-day-2026-09").hints).toEqual({})
  })

  it("returns the Payaza profile: required set, labels, hints, track select", () => {
    const req = submissionRequirementsForCohort("payaza-hackhouse-2026")
    expect([...req.required].sort()).toEqual(
      ["projectName", "pitch", "track", "problemTackled", "claudeUsage", "slidesUrl"].sort()
    )
    expect(req.trackSelect).toBe(true)
    expect(req.labels.track).toBe("Problem area")
    expect(req.labels.slidesUrl).toMatch(/Pitch deck link/)
    expect(req.labels.claudeUsage).toMatch(/uses Payaza/)
    expect(Object.keys(req.hints).sort()).toEqual(
      ["claudeUsage", "problemTackled", "worksVsMocked"].sort()
    )
    expect(req.hints.claudeUsage).toMatch(/Payaza products/)
  })

  it("Payaza requires a deck but not a repo or worksVsMocked", () => {
    const schema = buildSubmissionSchema(submissionRequirementsForCohort("payaza-hackhouse-2026"))
    const ok = schema.safeParse({ ...FULL_02_SUBMISSION, repoUrl: "", worksVsMocked: "", slidesUrl: "gamma.app/deck" })
    expect(ok.success).toBe(true)
    const noDeck = schema.safeParse({ ...FULL_02_SUBMISSION, slidesUrl: "" })
    expect(noDeck.success).toBe(false)
  })

  it("returns the 2026-09 profile's required fields and track select", () => {
    const req = submissionRequirementsForCohort("impact-lab-2026-09")
    expect([...req.required].sort()).toEqual(
      [
        "projectName",
        "pitch",
        "track",
        "problemTackled",
        "worksVsMocked",
        "claudeUsage",
        "repoUrl",
      ].sort()
    )
    expect(req.trackSelect).toBe(true)
    expect(req.labels.slidesUrl).toMatch(/only if you used any/)
  })

  it("returns the Build Day profile's required fields and track select", () => {
    const req = submissionRequirementsForCohort("build-day-2026-09")
    expect([...req.required].sort()).toEqual(
      ["projectName", "pitch", "track", "worksVsMocked", "claudeUsage", "repoUrl"].sort()
    )
    expect(req.trackSelect).toBe(true)
    expect(req.labels.slidesUrl).toMatch(/only if you used any/)
  })

  it("toRequirementsView produces a JSON-safe array, not a Set", () => {
    const view = toRequirementsView(submissionRequirementsForCohort("impact-lab-2026-09"))
    expect(Array.isArray(view.required)).toBe(true)
    expect(view.required).toContain("repoUrl")
    expect(view.hints).toEqual({})
  })
})

describe("buildSubmissionSchema — default profile", () => {
  it("still accepts a slides-only submission", () => {
    const result = submissionInputSchema.safeParse({
      projectName: "",
      pitch: "",
      description: "",
      worksVsMocked: "",
      claudeUsage: "",
      track: "",
      problemTackled: "",
      repoUrl: "",
      demoUrl: "",
      videoUrl: "",
      slidesUrl: "drive.google.com/deck",
      screenshotUrl: "",
    })
    expect(result.success).toBe(true)
  })

  it("still rejects a submission with no slides link", () => {
    const result = submissionInputSchema.safeParse({
      ...FULL_02_SUBMISSION,
      slidesUrl: "",
    })
    expect(result.success).toBe(false)
  })
})

describe("buildSubmissionSchema — 2026-09 profile", () => {
  const schema = buildSubmissionSchema(submissionRequirementsForCohort("impact-lab-2026-09"))

  it("accepts a full 02 submission with slides left blank", () => {
    const result = schema.safeParse(FULL_02_SUBMISSION)
    expect(result.success).toBe(true)
  })

  it("rejects a submission missing repoUrl, naming the field", () => {
    const result = schema.safeParse({ ...FULL_02_SUBMISSION, repoUrl: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path[0]).toBe("repoUrl")
    }
  })

  it("rejects a submission missing claudeUsage", () => {
    const result = schema.safeParse({ ...FULL_02_SUBMISSION, claudeUsage: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path[0]).toBe("claudeUsage")
    }
  })

  it("does not require the optional demoUrl/videoUrl/screenshotUrl fields", () => {
    const result = schema.safeParse(FULL_02_SUBMISSION)
    expect(result.success).toBe(true)
  })
})
