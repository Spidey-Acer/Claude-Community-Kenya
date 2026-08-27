import { describe, it, expect } from "vitest"
import {
  NEEDS_OPTIONS,
  NEED_LABELS,
  REACTION_EMOJI,
  isNeedKey,
  MAX_MEDIA_PER_POST,
  UPLOAD_CONTENT_TYPES,
  isUploadContentType,
  REPORT_REASONS,
  isGiphyUrl,
} from "@/lib/showcase/constants"
import { ReportReason } from "@/generated/prisma/client"

describe("showcase constants", () => {
  it("exposes the ten agreed need keys", () => {
    expect(NEEDS_OPTIONS).toEqual([
      "testers", "co-founder", "frontend-dev", "backend-dev", "mobile-dev",
      "designer", "data", "intro", "funding", "feedback",
    ])
  })

  it("labels every need key", () => {
    for (const key of NEEDS_OPTIONS) {
      expect(NEED_LABELS[key]).toBeTruthy()
    }
  })

  it("exposes exactly five reaction emoji", () => {
    expect(REACTION_EMOJI).toHaveLength(5)
  })

  it("narrows valid need keys and rejects others", () => {
    expect(isNeedKey("testers")).toBe(true)
    expect(isNeedKey("pizza")).toBe(false)
  })

  it("caps media at five per post", () => {
    expect(MAX_MEDIA_PER_POST).toBe(5)
  })
})

describe("isUploadContentType", () => {
  it("accepts the media types the showcase serves", () => {
    for (const type of UPLOAD_CONTENT_TYPES) {
      expect(isUploadContentType(type)).toBe(true)
    }
  })

  it("rejects types that would become a page on the public asset domain", () => {
    expect(isUploadContentType("text/html")).toBe(false)
    expect(isUploadContentType("image/svg+xml")).toBe(false)
    expect(isUploadContentType("application/javascript")).toBe(false)
  })
})

describe("REPORT_REASONS", () => {
  // REPORT_REASONS deliberately does NOT import the Prisma enum — doing that in
  // a client component pulls the Prisma runtime into the browser bundle and the
  // build fails. This test is the seam that keeps the copy honest.
  it("matches the ReportReason enum in the schema", () => {
    expect(REPORT_REASONS.map(r => r.value).sort()).toEqual(
      Object.values(ReportReason).sort(),
    )
  })

  it("gives every reason a human label", () => {
    for (const r of REPORT_REASONS) {
      expect(r.label.length).toBeGreaterThan(0)
      expect(r.label).not.toBe(r.value)
    }
  })
})

describe("isGiphyUrl", () => {
  it("accepts GIPHY media hosts over https", () => {
    expect(isGiphyUrl("https://media.giphy.com/media/abc/giphy.gif")).toBe(true)
    expect(isGiphyUrl("https://media2.giphy.com/media/abc/200.gif")).toBe(true)
    expect(isGiphyUrl("https://i.giphy.com/abc.gif")).toBe(true)
  })

  // The reason this parses the URL instead of using startsWith: both of these
  // pass a naive prefix or substring check and neither is GIPHY.
  it("rejects lookalike hosts", () => {
    expect(isGiphyUrl("https://media.giphy.com.evil.test/x.gif")).toBe(false)
    expect(isGiphyUrl("https://notgiphy.com/x.gif")).toBe(false)
    expect(isGiphyUrl("https://evil.test/?u=https://media.giphy.com/x.gif")).toBe(false)
  })

  it("rejects non-https and unparseable values", () => {
    expect(isGiphyUrl("http://media.giphy.com/x.gif")).toBe(false)
    expect(isGiphyUrl("javascript:alert(1)")).toBe(false)
    expect(isGiphyUrl("not a url")).toBe(false)
  })
})
