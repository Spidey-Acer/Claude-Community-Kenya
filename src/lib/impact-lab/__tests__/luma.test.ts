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

// 02 form (2 Sep event) — invented headers + rows only, never a real export.
const HEADERS_02 = [
  "guest_id",
  "approval_status",
  "name",
  "email",
  "phone_number",
  "WhatsApp number with country code",
  "Build tracks are announced Sat 30 Aug. Which territory pulls you?",
  "Team status",
  "If you have a team, name them (max 5 including you)",
  "I'm in for the full day, 8:30 AM-6:30 PM. Demos need whole teams.",
  "Who exactly are you building for? (A person, not a demographic.)",
  "Smallest slice: what's the smallest version that will WORK by 5:00 PM demo time?",
  "Build evidence: something you've built or shipped. Link or describe it.",
  "Do you have a console.anthropic.com account with an Organization set up? Do this before the day.",
]

/** Builds one 02-form row from a partial field map, defaulting the rest. */
function row02(fields: Partial<Record<string, string>>): string[] {
  const defaults: Record<string, string> = {
    guest_id: "g-1",
    approval_status: "approved",
    name: "Default Name",
    email: "default@example.com",
    phone_number: "",
    whatsapp: "",
    territory: "Wherever the strongest problem is",
    teamStatus: "Solo and open to a team",
    teamNames: "",
    fullDay: "Yes",
    buildingFor: "",
    smallestSlice: "",
    buildEvidence: "",
    consoleOrg: "Not yet",
  }
  const values = { ...defaults, ...fields } as Record<string, string>
  return [
    values.guest_id,
    values.approval_status,
    values.name,
    values.email,
    values.phone_number,
    values.whatsapp,
    values.territory,
    values.teamStatus,
    values.teamNames,
    values.fullDay,
    values.buildingFor,
    values.smallestSlice,
    values.buildEvidence,
    values.consoleOrg,
  ]
}

describe("mapLumaRows — 02 form (2 Sep event)", () => {
  it("falls back to the WhatsApp column when phone_number is empty", () => {
    const result = mapLumaRows(HEADERS_02, [
      row02({ email: "a@example.com", whatsapp: "+254700111222" }),
    ])
    expect(result.drafts[0]).toMatchObject({ phone: "+254700111222" })
  })

  it("maps each named territory to its slug", () => {
    const result = mapLumaRows(HEADERS_02, [
      row02({ email: "a@example.com", territory: "Work and jobs" }),
      row02({ email: "b@example.com", territory: "Family, kids, community" }),
      row02({ email: "c@example.com", territory: "Rules and trust" }),
    ])
    expect(result.drafts[0]).toMatchObject({ interests: ["work-and-jobs"] })
    expect(result.drafts[1]).toMatchObject({ interests: ["family-kids-community"] })
    expect(result.drafts[2]).toMatchObject({ interests: ["rules-and-trust"] })
  })

  it("maps 'Wherever the strongest problem is' to no interest, not a false slug", () => {
    const result = mapLumaRows(HEADERS_02, [
      row02({ email: "a@example.com", territory: "Wherever the strongest problem is" }),
    ])
    expect(result.drafts[0]).toMatchObject({ interests: [] })
  })

  it("resolves teammate names against approved rows, reporting unmatched fragments", () => {
    const rows = [
      row02({ name: "Aisha Bett", email: "aisha@example.com" }),
      row02({ name: "Caleb Otieno", email: "caleb@example.com" }),
      row02({ name: "Faith Njoroge", email: "faith@example.com" }),
      row02({
        name: "Grace Wanjiru",
        email: "grace@example.com",
        teamStatus: "I have a team",
        teamNames: "Aisha Bett, Caleb Otieno and Someone Else",
      }),
    ]
    const result = mapLumaRows(HEADERS_02, rows)
    const grace = result.drafts.find((d) => d.email === "grace@example.com")

    expect(grace).toMatchObject({
      preferredTeammates: expect.arrayContaining(["aisha@example.com", "caleb@example.com"]),
    })
    expect((grace?.preferredTeammates as string[]).length).toBe(2)
    expect(result.teammates.rowsWithTeam).toBe(1)
    expect(result.teammates.resolved).toBe(2)
    expect(result.teammates.unresolved).toHaveLength(1)
    expect(result.teammates.unresolved[0]).toMatchObject({
      email: "grace@example.com",
      fragment: "Someone Else",
    })
  })

  it("ignores the team-names text entirely when Team status is solo", () => {
    const rows = [
      row02({ name: "Dennis Kip", email: "dennis@example.com" }),
      row02({
        name: "Irene Achieng",
        email: "irene@example.com",
        teamStatus: "Solo and open to a team",
        teamNames: "Dennis Kip",
      }),
    ]
    const result = mapLumaRows(HEADERS_02, rows)
    const irene = result.drafts.find((d) => d.email === "irene@example.com")

    expect(irene).toMatchObject({ preferredTeammates: [] })
    expect(result.teammates.rowsWithTeam).toBe(0)
  })

  it("resolves nothing from junk team-names text and reports it unmatched", () => {
    const result = mapLumaRows(HEADERS_02, [
      row02({
        name: "Junk Reporter",
        email: "junk@example.com",
        teamStatus: "I have a team",
        teamNames: "N/A, I lack a team, Thanks for the opportunity",
      }),
    ])
    const junk = result.drafts.find((d) => d.email === "junk@example.com")

    expect(junk).toMatchObject({ preferredTeammates: [] })
    expect(result.teammates.resolved).toBe(0)
    expect(result.teammates.unresolved.length).toBeGreaterThan(0)
  })

  it("marks experience INTERMEDIATE when build evidence contains a link", () => {
    const result = mapLumaRows(HEADERS_02, [
      row02({ email: "a@example.com", buildEvidence: "https://github.com/example/repo" }),
    ])
    expect(result.drafts[0]).toMatchObject({ experienceLevel: "INTERMEDIATE" })
  })

  it("defaults experience to BEGINNER when build evidence has no link", () => {
    const result = mapLumaRows(HEADERS_02, [
      row02({ email: "a@example.com", buildEvidence: "A todo app for my church group" }),
    ])
    expect(result.drafts[0]).toMatchObject({ experienceLevel: "BEGINNER" })
  })

  it("composes projectIdeas from the who-for and smallest-slice answers", () => {
    const result = mapLumaRows(HEADERS_02, [
      row02({
        email: "a@example.com",
        buildingFor: "My grandmother in Kitale",
        smallestSlice: "A form that sends her an SMS reminder",
      }),
    ])
    expect(result.drafts[0]).toMatchObject({
      projectIdeas: "For: My grandmother in Kitale. Slice: A form that sends her an SMS reminder.",
    })
  })

  it("counts console-org self-reports for the check-in desk", () => {
    const result = mapLumaRows(HEADERS_02, [
      row02({ email: "a@example.com", consoleOrg: "Yes, with an Organization" }),
      row02({ email: "b@example.com", consoleOrg: "Yes, personal account only" }),
      row02({ email: "c@example.com", consoleOrg: "Not yet" }),
    ])
    expect(result.consoleOrg).toEqual({ withOrg: 1, personalOnly: 1, notYet: 1 })
  })
})
