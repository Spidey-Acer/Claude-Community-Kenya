import { MAX_DEMO_BYTES, MAX_IMAGE_BYTES } from "@/lib/showcase/constants"

/**
 * Media identification for showcase uploads.
 *
 * Everything here works off the file's own bytes. The browser-declared MIME
 * type and the filename extension are both attacker-controlled: a file
 * labelled image/png that is really an MP4 would be stored with a content type
 * that does not match its contents, and served as something it is not.
 */

export type MediaKind = "image" | "gif" | "mp4"

export interface MediaDescriptor {
  key: string
  url: string
  width: number
  height: number
  kind: MediaKind
  posterUrl?: string
  alt?: string
}

/** Shortest header we can decide on is the 12-byte RIFF/WEBP form. */
const MIN_SNIFF_BYTES = 12

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false
  return signature.every((byte, i) => bytes[offset + i] === byte)
}

/**
 * Identify a file from its magic bytes, or null if it is not a format we accept.
 *
 * GIF is deliberately its own kind rather than folding into "image": it has a
 * different size ceiling and a different render path, and the spec's revisit
 * trigger counts GIF uploads specifically.
 */
export function sniffMediaKind(bytes: Uint8Array): MediaKind | null {
  if (bytes.length < MIN_SNIFF_BYTES) return null

  // GIF87a / GIF89a
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "gif"

  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image"

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image"

  // WEBP: "RIFF" ???? "WEBP" — the four bytes between are the file size.
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return "image"
  }

  // MP4 and friends: a box-size prefix then "ftyp" at offset 4.
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) return "mp4"

  return null
}

export function validateMediaSize(
  kind: MediaKind,
  bytes: number,
): { ok: true } | { ok: false; error: string } {
  if (bytes <= 0) {
    return { ok: false, error: "File is empty." }
  }
  const limit = kind === "image" ? MAX_IMAGE_BYTES : MAX_DEMO_BYTES
  if (bytes > limit) {
    const mb = Math.round(limit / (1024 * 1024))
    return { ok: false, error: `File is too large. Limit is ${mb}MB.` }
  }
  return { ok: true }
}
