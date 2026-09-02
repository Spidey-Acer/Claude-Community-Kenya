// participantUpdateSchema regression test: a partial PATCH body that doesn't
// mention consentToMatch/consentToShareContact must not gain those keys.
// z.object(...).partial() alone keeps a field's .default(false), so an
// unrelated edit (e.g. changing a track) silently parsed to
// { consentToMatch: false, consentToShareContact: false, ... } and the route
// wrote that straight into the update, revoking both consents.

import { describe, it, expect } from "vitest"
import { participantUpdateSchema } from "../participant-schema"

describe("participantUpdateSchema", () => {
  it("does not introduce consent keys on a PATCH that omits them", () => {
    const result = participantUpdateSchema.safeParse({
      interests: ["agriculture"],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty("consentToMatch")
      expect(result.data).not.toHaveProperty("consentToShareContact")
    }
  })

  it("still validates and passes through an explicit consent change", () => {
    const result = participantUpdateSchema.safeParse({
      consentToMatch: true,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.consentToMatch).toBe(true)
      expect(result.data).not.toHaveProperty("consentToShareContact")
    }
  })

  it("accepts an empty PATCH body without introducing consent keys", () => {
    // Array fields (interests, technicalSkills, ...) already default to []
    // under .partial() pre-existing behaviour — out of scope here. This test
    // only asserts the consent fix: no consent key appears unasked.
    const result = participantUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty("consentToMatch")
      expect(result.data).not.toHaveProperty("consentToShareContact")
    }
  })
})
