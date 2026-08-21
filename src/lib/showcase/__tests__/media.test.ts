import { describe, it, expect } from "vitest"
import { sniffMediaKind, validateMediaSize } from "@/lib/showcase/media"

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values)
}

/** RIFF????WEBP — the four size bytes between the tags are irrelevant. */
function webpHeader(): Uint8Array {
  const head = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]
  return new Uint8Array(head)
}

/** ????ftypisom — the box-size prefix precedes the ftyp marker at offset 4. */
function mp4Header(): Uint8Array {
  const head = [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]
  return new Uint8Array(head)
}

describe("sniffMediaKind", () => {
  it("detects JPEG", () => {
    expect(sniffMediaKind(bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0))).toBe("image")
  })

  it("detects PNG", () => {
    expect(sniffMediaKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0))).toBe("image")
  })

  it("detects WEBP", () => {
    expect(sniffMediaKind(webpHeader())).toBe("image")
  })

  it("detects GIF as its own kind, not a generic image", () => {
    const gif = new TextEncoder().encode("GIF89a______")
    expect(sniffMediaKind(gif)).toBe("gif")
  })

  it("detects MP4 via the ftyp box", () => {
    expect(sniffMediaKind(mp4Header())).toBe("mp4")
  })

  it("returns null for an unrecognised header", () => {
    expect(sniffMediaKind(bytes(0x00, 0x01, 0x02, 0x03, 0, 0, 0, 0, 0, 0, 0, 0))).toBeNull()
  })

  it("returns null for a buffer too short to identify", () => {
    expect(sniffMediaKind(bytes(0xff, 0xd8))).toBeNull()
  })
})

describe("validateMediaSize", () => {
  it("accepts an image under 5MB", () => {
    expect(validateMediaSize("image", 4 * 1024 * 1024)).toEqual({ ok: true })
  })

  it("rejects an image over 5MB", () => {
    const result = validateMediaSize("image", 6 * 1024 * 1024)
    expect(result.ok).toBe(false)
  })

  it("accepts a gif at exactly 15MB", () => {
    expect(validateMediaSize("gif", 15 * 1024 * 1024)).toEqual({ ok: true })
  })

  it("rejects an mp4 over 15MB", () => {
    expect(validateMediaSize("mp4", 16 * 1024 * 1024).ok).toBe(false)
  })

  it("rejects zero bytes", () => {
    expect(validateMediaSize("image", 0).ok).toBe(false)
  })
})
