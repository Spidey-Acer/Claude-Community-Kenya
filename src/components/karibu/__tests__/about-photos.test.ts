import { describe, it, expect } from "vitest"
import { communityLifePhotos } from "../photos"

const photo = (id: string, featured: boolean, hasEvent: boolean) =>
  ({ id, featured, event: hasEvent ? { slug: "e", title: "E", date: new Date(), city: "Nairobi" } : null }) as never

describe("communityLifePhotos", () => {
  it("keeps only event-less photos, featured first, capped", () => {
    const out = communityLifePhotos([photo("a", true, true), photo("b", false, false), photo("c", true, false)], 8)
    expect(out.map((p) => p.id)).toEqual(["c", "b"])
  })

  it("caps at max and defaults to 8", () => {
    const many = Array.from({ length: 12 }, (_, i) => photo(String(i), false, false))
    expect(communityLifePhotos(many)).toHaveLength(8)
    expect(communityLifePhotos(many, 3)).toHaveLength(3)
  })
})
