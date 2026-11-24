import { describe, expect, it } from "vitest"
import { detectColumns, extractGuests, parseCsv } from "../parse-guest-csv"

const LUMA_CSV = [
  'api_id,name,email,phone_number,approval_status,"What do you build?"',
  'g1,"Doe, Jane",Jane@Example.com,+254700000001,approved,"Line one',
  'line two"',
  "g2,Sam,sam@example.com,+254700000002,declined,x",
  "g3,NoMail,,+254700000003,approved,y",
].join("\r\n")

describe("parseCsv", () => {
  it("handles quoted commas and quoted line breaks", () => {
    const rows = parseCsv(LUMA_CSV)
    expect(rows).toHaveLength(4)
    expect(rows[1][1]).toBe("Doe, Jane")
    expect(rows[1][5]).toBe("Line one\r\nline two")
  })

  it("handles doubled quotes and a BOM", () => {
    const rows = parseCsv('﻿email,status\n"a""b@x.com",approved')
    expect(rows[0][0]).toBe("email")
    expect(rows[1][0]).toBe('a"b@x.com')
  })
})

describe("detectColumns", () => {
  it("finds columns case-insensitively", () => {
    const result = detectColumns(["Name", "EMAIL", "Approval_Status"])
    expect(result).toEqual({ ok: true, emailIndex: 1, statusIndex: 2 })
  })

  it("accepts `status` as the status header", () => {
    expect(detectColumns(["email", "status"]).ok).toBe(true)
  })

  it("asks for the picker when a column is missing", () => {
    const result = detectColumns(["Mail", "state"])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.headers).toEqual(["Mail", "state"])
  })
})

describe("extractGuests", () => {
  const [header, ...data] = parseCsv(LUMA_CSV)

  it("keeps only email and status; name, phone and answers are gone", () => {
    const detected = detectColumns(header)
    if (!detected.ok) throw new Error("expected detection")
    const { guests, skippedNoEmail } = extractGuests(data, detected.emailIndex, detected.statusIndex)
    expect(guests).toEqual([
      { email: "Jane@Example.com", status: "approved" },
      { email: "sam@example.com", status: "declined" },
    ])
    expect(skippedNoEmail).toBe(1)
    const serialised = JSON.stringify(guests)
    expect(serialised).not.toContain("Doe")
    expect(serialised).not.toContain("+254")
    expect(serialised).not.toContain("Line one")
  })

  it("works through the picker path with chosen indexes and a custom approved value", () => {
    const rows = parseCsv("Mail,state\nA@x.com,Going\nB@x.com,Waitlist")
    const { guests } = extractGuests(rows.slice(1), 0, 1, "going")
    expect(guests).toEqual([
      { email: "A@x.com", status: "approved" },
      { email: "B@x.com", status: "Waitlist" },
    ])
  })
})
