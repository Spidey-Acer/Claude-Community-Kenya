import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { hmacEmail, MissingHmacKeyError } from "../hmac-email"

describe("hmacEmail", () => {
  const original = process.env.ATTENDING_HMAC_KEY
  beforeEach(() => {
    process.env.ATTENDING_HMAC_KEY = "test-key-one-0123456789-0123456789-ab"
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
    process.env.ATTENDING_HMAC_KEY = "test-key-two-0123456789-0123456789-ab"
    expect(hmacEmail("ada@example.com")).not.toBe(before)
  })

  it("fails closed when the key is 31 characters, and accepts exactly 32", () => {
    process.env.ATTENDING_HMAC_KEY = "k".repeat(31)
    expect(() => hmacEmail("ada@example.com")).toThrow(MissingHmacKeyError)
    process.env.ATTENDING_HMAC_KEY = "k".repeat(32)
    expect(hmacEmail("ada@example.com")).toMatch(/^[0-9a-f]{64}$/)
  })

  it("counts the trimmed key, so padding cannot make a short key pass", () => {
    process.env.ATTENDING_HMAC_KEY = `  ${"k".repeat(31)}  `
    expect(() => hmacEmail("ada@example.com")).toThrow(MissingHmacKeyError)
  })

  it("a key with a trailing newline hashes the same as the trimmed key", () => {
    const key = "test-key-0123456789-0123456789-abcd"
    process.env.ATTENDING_HMAC_KEY = key
    const clean = hmacEmail("ada@example.com")
    process.env.ATTENDING_HMAC_KEY = `${key}
`
    expect(hmacEmail("ada@example.com")).toBe(clean)
  })

  it("fails closed when the key is missing or blank", () => {
    delete process.env.ATTENDING_HMAC_KEY
    expect(() => hmacEmail("ada@example.com")).toThrow(MissingHmacKeyError)
    process.env.ATTENDING_HMAC_KEY = "   "
    expect(() => hmacEmail("ada@example.com")).toThrow(MissingHmacKeyError)
  })
})
