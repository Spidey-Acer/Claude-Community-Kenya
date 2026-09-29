// Pure-builder tests for pre-formed team rosters. Fake data only: this is a
// public repo, so no real participant details belong in a test.

import { describe, it, expect } from "vitest"
import {
  buildParticipantRows,
  buildPreformedRun,
  normaliseEmail,
  parsePreformedInput,
} from "../preformed-teams"

function member(name: string, email: string, isLeader = false) {
  return { fullName: name, email, phone: "0700000000", role: "backendDeveloper", isLeader }
}

function validRaw() {
  return {
    cohort: "demo-cohort-2026",
    runName: "Demo run",
    institution: null,
    teams: [
      {
        name: "Team One",
        track: "cross-border-trade",
        summary: "A summary.",
        deckUrl: "https://example.com/deck-1",
        members: [
          member("Alice A", "alice@example.com", true),
          member("Bob B", "Bob@Example.com"),
          member("Cara C", "cara@example.com"),
        ],
      },
      {
        name: "Team Two",
        track: "remittances",
        summary: "Another.",
        deckUrl: "https://example.com/deck-2",
        members: [member("Dan D", "dan@example.com", true), member("Eve E", "eve@example.com")],
      },
    ],
  }
}

function idMap(emails: string[]): Map<string, string> {
  return new Map(emails.map((email, i) => [normaliseEmail(email), `pid-${i}`]))
}

describe("parsePreformedInput", () => {
  it("accepts a valid roster", () => {
    expect(parsePreformedInput(validRaw()).teams).toHaveLength(2)
  })

  it("rejects a bad cohort slug", () => {
    expect(() => parsePreformedInput({ ...validRaw(), cohort: "Bad Slug!" })).toThrow(/cohort/)
  })

  it("rejects an invalid email", () => {
    const raw = validRaw()
    raw.teams[0].members[1].email = "not-an-email"
    expect(() => parsePreformedInput(raw)).toThrow(/email/)
  })

  it("rejects a team with two leaders", () => {
    const raw = validRaw()
    raw.teams[0].members[1].isLeader = true
    expect(() => parsePreformedInput(raw)).toThrow(/exactly one leader, found 2/)
  })

  it("rejects a team with no leader", () => {
    const raw = validRaw()
    raw.teams[1].members[0].isLeader = false
    expect(() => parsePreformedInput(raw)).toThrow(/exactly one leader, found 0/)
  })

  it("rejects a duplicate email across teams, ignoring case", () => {
    const raw = validRaw()
    raw.teams[1].members[1].email = "ALICE@example.com"
    expect(() => parsePreformedInput(raw)).toThrow(/duplicate email/)
  })
})

describe("buildParticipantRows / buildPreformedRun", () => {
  const input = parsePreformedInput(validRaw())
  const rows = buildParticipantRows(input)
  const ids = idMap(rows.map((r) => r.email))
  const run = buildPreformedRun(input, ids)

  it("seeds every member, not just leaders, with consent off", () => {
    expect(rows).toHaveLength(5)
    expect(rows.every((r) => !r.consentToMatch && !r.consentToShareContact)).toBe(true)
    expect(rows[1].email).toBe("bob@example.com")
    expect(rows[0].interests).toEqual(["cross-border-trade"])
    expect(rows[0].projectIdeas).toBe("A summary.")
  })

  it("puts every member id on the team and the leader id on leaderId", () => {
    expect(run.teams[0].memberIds).toEqual(["pid-0", "pid-1", "pid-2"])
    expect(run.teams[0].leaderId).toBe("pid-0")
    expect(run.teams[1].memberIds).toEqual(["pid-3", "pid-4"])
    expect(run.teams[1].leaderId).toBe("pid-3")
    expect(run.teams[0]).toMatchObject({ id: "team-1", locked: true, trackKey: "cross-border-trade" })
    expect(run.participantsSnapshot).toHaveLength(5)
  })

  it("keeps the deck link out of member-visible explanations but in notes", () => {
    expect(JSON.stringify(run.explanations)).not.toContain("example.com/deck")
    expect(run.explanations[0].strengths).toEqual(["Problem area: cross-border-trade"])
    expect(run.notes).toContain("https://example.com/deck-1")
    expect(run.notes).toContain("bob@example.com")
  })

  it("throws when a member has no participant id", () => {
    expect(() => buildPreformedRun(input, new Map())).toThrow(/Missing participant id/)
  })
})
