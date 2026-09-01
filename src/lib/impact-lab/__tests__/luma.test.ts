// Consent defaults for a Luma guest-list import — an approved guest is
// matchable (they registered for a team-formation event) but must not have
// contact sharing turned on for them; that is an opt-in the participant sets
// from their own profile.

import { describe, it, expect } from "vitest"
import { mapLumaRows } from "../luma"

const HEADERS = ["guest_id", "approval_status", "name", "email", "phone_number"]

function approvedRow(email: string): string[] {
  return ["guest-1", "approved", "Test Guest", email, ""]
}

describe("mapLumaRows — consent defaults", () => {
  it("sets consentToMatch true and consentToShareContact false for an approved guest", () => {
    const result = mapLumaRows(HEADERS, [approvedRow("guest@example.com")])

    expect(result.drafts).toHaveLength(1)
    expect(result.drafts[0]).toMatchObject({
      consentToMatch: true,
      consentToShareContact: false,
    })
  })
})
