import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { hmacEmail, MissingHmacKeyError } from "../hmac-email"

describe("hmacEmail", () => {
  const original = process.env.ATTENDING_HMAC_KEY
  beforeEach(() => {
    process.env.ATTENDING_HMAC_KEY = "test-key-one"
  })
  afterEach(() => {
    if (original === undefined) delete process.env.ATTENDING_HMAC_KEY
    else process.env.ATTENDING_HMAC_KEY = original
  })

  it("matches the same email in other case or with spaces", () => {
    expect(hmacEmail("  Ada@Example.COM ")).toBe(hmacEmail("ada@example.com"))
  })

  it("returns a different hash for a different email", () => {
    expect(hmacEmail("ada@example.com")).not.toBe(hmacEmail("ada2@example.com"))
  })

  it("never contains the raw email and is 64 hex chars", () => {
    const hash = hmacEmail("ada@example.com")
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).not.toContain("ada")
  })

  it("changes with the key", () => {
    const before = hmacEmail("ada@example.com")
    process.env.ATTENDING_HMAC_KEY = "test-key-two"
    expect(hmacEmail("ada@example.com")).not.toBe(before)
  })

  it("fails closed when the key is missing or blank", () => {
    delete process.env.ATTENDING_HMAC_KEY
    expect(() => hmacEmail("ada@example.com")).toThrow(MissingHmacKeyError)
    process.env.ATTENDING_HMAC_KEY = "   "
    expect(() => hmacEmail("ada@example.com")).toThrow(MissingHmacKeyError)
  })
})
