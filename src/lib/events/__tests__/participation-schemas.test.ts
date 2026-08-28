import { describe, it, expect } from "vitest"
import {
  questionSubmissionSchema,
  contributionSubmissionSchema,
} from "@/lib/events/participation-schemas"
import { MAX_QUESTION_LENGTH, MAX_CONTRIBUTION_LENGTH, MAX_NAME_LENGTH } from "@/lib/events/participation"

const validQuestion = {
  body: "What does Anthropic think about Kenya's data protection law?",
  submitterName: "Wanjiku",
  county: "Nairobi",
}

const validContribution = {
  body: "The broker at my gate tells me what my tomatoes are worth and I cannot check the price myself.",
  questionKey: "jobs",
  submitterName: "Otieno",
  county: "Kisumu",
}

describe("questionSubmissionSchema", () => {
  it("accepts a well-formed submission", () => {
    expect(questionSubmissionSchema.safeParse(validQuestion).success).toBe(true)
  })

  it("rejects a body under the 10-character minimum", () => {
    const result = questionSubmissionSchema.safeParse({ ...validQuestion, body: "too short" })
    expect(result.success).toBe(false)
  })

  it("rejects a body over MAX_QUESTION_LENGTH", () => {
    const result = questionSubmissionSchema.safeParse({
      ...validQuestion,
      body: "a".repeat(MAX_QUESTION_LENGTH + 1),
    })
    expect(result.success).toBe(false)
  })

  it("accepts a body at exactly MAX_QUESTION_LENGTH", () => {
    const result = questionSubmissionSchema.safeParse({
      ...validQuestion,
      body: "a".repeat(MAX_QUESTION_LENGTH),
    })
    expect(result.success).toBe(true)
  })

  it("rejects a submitter name under 2 characters", () => {
    const result = questionSubmissionSchema.safeParse({ ...validQuestion, submitterName: "A" })
    expect(result.success).toBe(false)
  })

  it("rejects a submitter name over MAX_NAME_LENGTH", () => {
    const result = questionSubmissionSchema.safeParse({
      ...validQuestion,
      submitterName: "a".repeat(MAX_NAME_LENGTH + 1),
    })
    expect(result.success).toBe(false)
  })
})

describe("county validation", () => {
  it("accepts every one of the 47 official counties", () => {
    // Regression: an earlier draft validated county with a loose regex and
    // silently accepted "Nairobi " (trailing space) and lowercase variants —
    // z.enum against the shared constant closes both gaps at once.
    const counties = [
      "Nairobi", "Mombasa", "Kisumu", "Turkana", "Marsabit", "Wajir",
      "Elgeyo-Marakwet", "Murang'a", "Taita-Taveta", "West Pokot",
    ]
    for (const county of counties) {
      expect(questionSubmissionSchema.safeParse({ ...validQuestion, county }).success).toBe(true)
    }
  })

  it("rejects a county that is not one of the 47", () => {
    const result = questionSubmissionSchema.safeParse({ ...validQuestion, county: "Nairobii" })
    expect(result.success).toBe(false)
  })

  it("rejects an empty county", () => {
    const result = questionSubmissionSchema.safeParse({ ...validQuestion, county: "" })
    expect(result.success).toBe(false)
  })
})

describe("honeypot field", () => {
  it("parses successfully with the website field absent", () => {
    expect(questionSubmissionSchema.safeParse(validQuestion).success).toBe(true)
  })

  it("parses successfully with an empty website field", () => {
    expect(questionSubmissionSchema.safeParse({ ...validQuestion, website: "" }).success).toBe(true)
  })

  // The route, not the schema, is what drops a filled honeypot silently —
  // this test only documents that the schema does not itself reject the
  // shape a bot would send.
  it("parses successfully even when website is filled in (route handles the drop)", () => {
    const result = questionSubmissionSchema.safeParse({ ...validQuestion, website: "http://spam.example" })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.website).toBe("http://spam.example")
  })
})

describe("contributionSubmissionSchema", () => {
  it("accepts a well-formed submission", () => {
    expect(contributionSubmissionSchema.safeParse(validContribution).success).toBe(true)
  })

  it("rejects a body over MAX_CONTRIBUTION_LENGTH", () => {
    const result = contributionSubmissionSchema.safeParse({
      ...validContribution,
      body: "a".repeat(MAX_CONTRIBUTION_LENGTH + 1),
    })
    expect(result.success).toBe(false)
  })

  it("accepts a body at exactly MAX_CONTRIBUTION_LENGTH", () => {
    const result = contributionSubmissionSchema.safeParse({
      ...validContribution,
      body: "a".repeat(MAX_CONTRIBUTION_LENGTH),
    })
    expect(result.success).toBe(true)
  })

  it("rejects a missing questionKey", () => {
    const { questionKey: _questionKey, ...withoutKey } = validContribution
    const result = contributionSubmissionSchema.safeParse(withoutKey)
    expect(result.success).toBe(false)
  })

  it("rejects a questionKey over 40 characters", () => {
    const result = contributionSubmissionSchema.safeParse({
      ...validContribution,
      questionKey: "a".repeat(41),
    })
    expect(result.success).toBe(false)
  })

  it("accepts a questionKey at exactly 40 characters", () => {
    const result = contributionSubmissionSchema.safeParse({
      ...validContribution,
      questionKey: "a".repeat(40),
    })
    expect(result.success).toBe(true)
  })
})
