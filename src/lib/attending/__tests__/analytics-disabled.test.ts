import { describe, expect, it } from "vitest"
import { isAnalyticsDisabled } from "../attending-path"

describe("isAnalyticsDisabled", () => {
  it("is true on the attending page", () => {
    expect(isAnalyticsDisabled("/events/nairobi-meetup/attending")).toBe(true)
  })

  it("is true with a trailing slash", () => {
    expect(isAnalyticsDisabled("/events/nairobi-meetup/attending/")).toBe(true)
  })

  it("is false on the event page itself", () => {
    expect(isAnalyticsDisabled("/events/nairobi-meetup")).toBe(false)
  })

  it("is false on an unrelated path and on a null path", () => {
    expect(isAnalyticsDisabled("/about")).toBe(false)
    expect(isAnalyticsDisabled(null)).toBe(false)
  })
})
