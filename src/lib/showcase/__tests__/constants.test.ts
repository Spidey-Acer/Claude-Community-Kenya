import { describe, it, expect } from "vitest"
import {
  NEEDS_OPTIONS,
  NEED_LABELS,
  REACTION_EMOJI,
  isNeedKey,
  MAX_MEDIA_PER_POST,
  UPLOAD_CONTENT_TYPES,
  isUploadContentType,
} from "@/lib/showcase/constants"

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
