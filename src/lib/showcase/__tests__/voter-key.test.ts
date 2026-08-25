import { describe, it, expect } from "vitest"
import { voterKeyFor } from "@/lib/showcase/voter-key"

describe("voterKeyFor", () => {
  it("keys on the user when signed in", () => {
    expect(voterKeyFor("user_123", "abc")).toBe("u:user_123")
  })

  it("keys on the ip hash when anonymous", () => {
    expect(voterKeyFor(null, "abc")).toBe("ip:abc")
  })

  it("gives two users behind one ip distinct keys", () => {
    expect(voterKeyFor("user_a", "same")).not.toBe(voterKeyFor("user_b", "same"))
  })

  it("gives one user on two networks the same key", () => {
    expect(voterKeyFor("user_a", "net1")).toBe(voterKeyFor("user_a", "net2"))
  })
})
