import { describe, it, expect } from "vitest"
import { validateUpload, hasPdfMagicBytes, MAX_IMAGE_BYTES, MAX_PDF_BYTES } from "@/lib/upload-validation"

describe("validateUpload", () => {
  it("allows a PDF in the guides folder", () => {
    const result = validateUpload({ folder: "guides", contentType: "application/pdf", size: 2_000_000 })
    expect(result.ok).toBe(true)
  })

  it("rejects a PDF in the blog folder", () => {
    const result = validateUpload({ folder: "blog", contentType: "application/pdf", size: 1_000_000 })
    expect(result).toEqual({ ok: false, error: "PDF uploads are only allowed in the guides folder" })
  })

  it("allows an image at exactly 5MB in the guides folder", () => {
    const result = validateUpload({ folder: "guides", contentType: "image/png", size: MAX_IMAGE_BYTES })
    expect(result.ok).toBe(true)
  })

  it("rejects an image over 5MB even in the guides folder", () => {
    const result = validateUpload({ folder: "guides", contentType: "image/png", size: MAX_IMAGE_BYTES + 1 })
    expect(result.ok).toBe(false)
  })

  it("rejects a PDF over the MAX_PDF_BYTES cap in the guides folder", () => {
    const result = validateUpload({ folder: "guides", contentType: "application/pdf", size: MAX_PDF_BYTES + 1 })
    expect(result.ok).toBe(false)
  })

  it("allows a PDF at exactly MAX_PDF_BYTES", () => {
    const result = validateUpload({ folder: "guides", contentType: "application/pdf", size: MAX_PDF_BYTES })
    expect(result.ok).toBe(true)
  })

  it("rejects an unsupported content type", () => {
    const result = validateUpload({ folder: "events", contentType: "video/mp4", size: 1000 })
    expect(result.ok).toBe(false)
  })

  it("allows a standard image in a non-guides folder under 5MB", () => {
    const result = validateUpload({ folder: "events", contentType: "image/jpeg", size: 1_000_000 })
    expect(result.ok).toBe(true)
  })
})

describe("hasPdfMagicBytes", () => {
  it("accepts a buffer starting with the PDF magic bytes", () => {
    expect(hasPdfMagicBytes(Buffer.from("%PDF-1.7\n..."))).toBe(true)
  })

  it("rejects a buffer with a spoofed content-type but no PDF header", () => {
    expect(hasPdfMagicBytes(Buffer.from("<html><body>not a pdf</body></html>"))).toBe(false)
  })

  it("rejects an empty buffer", () => {
    expect(hasPdfMagicBytes(Buffer.alloc(0))).toBe(false)
  })

  it("rejects a buffer shorter than the magic bytes", () => {
    expect(hasPdfMagicBytes(Buffer.from("%PD"))).toBe(false)
  })
})
