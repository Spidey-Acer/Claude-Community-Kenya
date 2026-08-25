import { describe, it, expect } from "vitest"
import { sanitizeString, sanitizeMultilineText } from "@/lib/input-sanitization"

/**
 * Locks the behaviour the showcase depends on: emoji are stored as Unicode in
 * db.Text columns and must survive sanitisation untouched. If someone later
 * adds an ASCII-only filter to sanitizeString, emoji would vanish from every
 * comment with no error anywhere. This test is the alarm.
 */
describe("sanitisation preserves emoji", () => {
  it("keeps emoji in single-line strings", () => {
    expect(sanitizeString("shipped it 🚀")).toBe("shipped it 🚀")
  })

  it("keeps the full reaction set", () => {
    expect(sanitizeString("🔥 🙌 🧠 😂 🚀")).toBe("🔥 🙌 🧠 😂 🚀")
  })

  it("keeps emoji in multiline text", () => {
    const input = "line one 🇰🇪\n\nline two 👩🏾‍💻"
    expect(sanitizeMultilineText(input, 1000)).toBe(input)
  })

  it("still strips HTML while keeping emoji", () => {
    expect(sanitizeString("<script>bad()</script>ok 🔥")).toBe("ok 🔥")
  })
})
