import { describe, it, expect } from "vitest"
import { toSlug } from "@/lib/utils"

describe("toSlug", () => {
  it("slugifies a plain title", () => {
    expect(toSlug("Claude in Production Workshop")).toBe("claude-in-production-workshop")
  })

  // The regression this file exists for: a live post ended up at
  // /blog/rain-couldnx27t-stop-us because the entity was stripped, not decoded.
  it("decodes a hex entity instead of leaving its digits in the slug", () => {
    expect(toSlug("Rain Couldn&#x27;t Stop Us")).toBe("rain-couldnt-stop-us")
  })

  it("decodes decimal entities", () => {
    expect(toSlug("Rain Couldn&#39;t Stop Us")).toBe("rain-couldnt-stop-us")
  })

  it("decodes named entities", () => {
    expect(toSlug("Claude &amp; Kenya")).toBe("claude-kenya")
    expect(toSlug("Tabs&nbsp;and&nbsp;spaces")).toBe("tabs-and-spaces")
  })

  it("leaves an unknown entity's text alone rather than mangling it", () => {
    expect(toSlug("A &unknownentity; B")).toBe("a-unknownentity-b")
  })

  it("strips leading and trailing dashes", () => {
    expect(toSlug("  Hello World  ")).toBe("hello-world")
    expect(toSlug("!!! Launch !!!")).toBe("launch")
  })

  it("collapses runs of separators", () => {
    expect(toSlug("Too    many --- gaps")).toBe("too-many-gaps")
  })

  it("returns an empty string when nothing survives", () => {
    expect(toSlug("!!!")).toBe("")
  })
})
