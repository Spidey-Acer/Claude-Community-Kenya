import { describe, it, expect } from "vitest"
import {
  uniqueGuideSlug,
  createGuideSchema,
  guideAudienceSchema,
  buildGuideJsonLd,
  formatFileSize,
  guideMetaLine,
} from "@/lib/guides"

describe("uniqueGuideSlug", () => {
  it("slugifies the title when nothing is taken", () => {
    expect(uniqueGuideSlug("Build Day notes: Claude from zero", [])).toBe(
      "build-day-notes-claude-from-zero"
    )
  })

  it("appends -2 when the base slug is already taken", () => {
    expect(uniqueGuideSlug("Build Day Notes", ["build-day-notes"])).toBe("build-day-notes-2")
  })

  it("keeps incrementing past multiple collisions", () => {
    const taken = ["build-day-notes", "build-day-notes-2", "build-day-notes-3"]
    expect(uniqueGuideSlug("Build Day Notes", taken)).toBe("build-day-notes-4")
  })

  it("is unaffected by unrelated slugs", () => {
    expect(uniqueGuideSlug("Build Day Notes", ["some-other-guide"])).toBe("build-day-notes")
  })

  it("falls back to 'guide' when the title has no slug-safe characters", () => {
    expect(uniqueGuideSlug("!!!", [])).toBe("guide")
  })
})

describe("guideAudienceSchema", () => {
  it("accepts the three defined audiences", () => {
    expect(guideAudienceSchema.parse("BEGINNER")).toBe("BEGINNER")
    expect(guideAudienceSchema.parse("INTERMEDIATE")).toBe("INTERMEDIATE")
    expect(guideAudienceSchema.parse("ADVANCED")).toBe("ADVANCED")
  })

  it("rejects an unknown audience", () => {
    expect(guideAudienceSchema.safeParse("EXPERT").success).toBe(false)
  })
})

describe("createGuideSchema", () => {
  const base = {
    title: "Build Day notes: Claude from zero",
    summary: "Notes from a beginner's first afternoon with Claude Code.",
    audience: "BEGINNER" as const,
    fileUrl: "https://example.supabase.co/storage/v1/object/public/cck-bucket/guides/notes.pdf",
    fileSize: 2_100_000,
  }

  it("accepts a valid guide payload", () => {
    const result = createGuideSchema.safeParse(base)
    expect(result.success).toBe(true)
  })

  it("rejects a fileSize over the 25MB cap", () => {
    const result = createGuideSchema.safeParse({ ...base, fileSize: 26 * 1024 * 1024 })
    expect(result.success).toBe(false)
  })

  it("rejects a zero or negative fileSize", () => {
    expect(createGuideSchema.safeParse({ ...base, fileSize: 0 }).success).toBe(false)
  })

  it("rejects an invalid audience", () => {
    const result = createGuideSchema.safeParse({ ...base, audience: "EXPERT" })
    expect(result.success).toBe(false)
  })

  it("treats an empty optional coverUrl as absent", () => {
    const result = createGuideSchema.parse({ ...base, coverUrl: "" })
    expect(result.coverUrl).toBeUndefined()
  })

  it("defaults published to false and sortOrder to 0", () => {
    const result = createGuideSchema.parse(base)
    expect(result.published).toBe(false)
    expect(result.sortOrder).toBe(0)
  })
})

describe("formatFileSize", () => {
  it("formats megabytes to one decimal place", () => {
    expect(formatFileSize(2_100_000)).toBe("2.1 MB")
  })

  it("formats sub-megabyte sizes in KB", () => {
    expect(formatFileSize(480_000)).toBe("480 KB")
  })
})

describe("guideMetaLine", () => {
  it("includes page count when set", () => {
    expect(guideMetaLine(2_100_000, 24)).toBe("PDF · 2.1 MB · 24 pages")
  })

  it("omits page count when not set", () => {
    expect(guideMetaLine(2_100_000, null)).toBe("PDF · 2.1 MB")
    expect(guideMetaLine(2_100_000, undefined)).toBe("PDF · 2.1 MB")
  })
})

describe("buildGuideJsonLd", () => {
  it("builds a DigitalDocument schema with the expected fields", () => {
    const schema = buildGuideJsonLd({
      slug: "build-day-notes-claude-from-zero",
      title: "Build Day notes: Claude from zero",
      summary: "Notes from a beginner's first afternoon with Claude Code.",
      fileUrl: "https://example.supabase.co/storage/v1/object/public/cck-bucket/guides/notes.pdf",
      publishedAt: new Date("2026-09-22T12:00:00.000Z"),
    })

    expect(schema["@type"]).toBe("DigitalDocument")
    expect(schema.name).toBe("Build Day notes: Claude from zero")
    expect(schema.encodingFormat).toBe("application/pdf")
    expect(schema.url).toBe(
      "https://www.claudekenya.org/resources/guides/build-day-notes-claude-from-zero"
    )
    expect(schema.contentUrl).toBe(
      "https://example.supabase.co/storage/v1/object/public/cck-bucket/guides/notes.pdf"
    )
    expect(schema.datePublished).toBe("2026-09-22T12:00:00.000Z")
    expect(schema.publisher).toEqual({
      "@type": "Organization",
      name: "Claude Community Kenya",
      url: "https://www.claudekenya.org",
    })
  })

  it("accepts an already-serialized ISO date string", () => {
    const schema = buildGuideJsonLd({
      slug: "guide",
      title: "Guide",
      summary: "Summary",
      fileUrl: "https://example.com/g.pdf",
      publishedAt: "2026-01-01T00:00:00.000Z",
    })
    expect(schema.datePublished).toBe("2026-01-01T00:00:00.000Z")
  })
})
