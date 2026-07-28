import sharp from "sharp"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { r2Bucket, r2Client, variantKey } from "./r2"

/**
 * Derivative generation for gallery photos.
 *
 * Two renditions, sized for the two places a photo is actually shown:
 *
 *   thumb —  800px long edge, q70. The grid. At three columns on desktop and
 *            one on mobile, 800px covers a 2x display without ever shipping a
 *            multi-megabyte original into a thumbnail slot.
 *   full  — 2400px long edge, q80. The lightbox, opened one photo at a time
 *           and only on deliberate action.
 *
 * The original is stored untouched and never served. It is the archive copy —
 * the thing you regenerate from when these numbers turn out to be wrong.
 *
 * webp rather than avif: avif encodes far slower (a concern when a batch is
 * a few hundred photos) for a margin that does not matter once the image is
 * already correctly sized. Both are universally supported by the browsers
 * this audience uses.
 */

export const THUMB_MAX_EDGE = 800
export const THUMB_QUALITY = 70
export const FULL_MAX_EDGE = 2400
export const FULL_QUALITY = 80

export interface DerivativeResult {
  thumbBytes: number
  fullBytes: number
  originalBytes: number
  width: number | null
  height: number | null
}

/**
 * Generate both derivatives and upload all three objects to R2.
 *
 * `withoutEnlargement` matters: a phone photo already smaller than the target
 * must not be upscaled into a bigger, blurrier file than the one we received.
 */
export async function generateAndUploadDerivatives(
  original: Buffer,
  storageKey: string,
  originalExt: string,
  originalContentType: string,
): Promise<DerivativeResult> {
  const image = sharp(original, { failOn: "none" })
  const meta = await image.metadata()

  const [thumb, full] = await Promise.all([
    sharp(original, { failOn: "none" })
      .rotate() // honour EXIF orientation before resizing, or portraits land sideways
      .resize({ width: THUMB_MAX_EDGE, height: THUMB_MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: THUMB_QUALITY })
      .toBuffer(),
    sharp(original, { failOn: "none" })
      .rotate()
      .resize({ width: FULL_MAX_EDGE, height: FULL_MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: FULL_QUALITY })
      .toBuffer(),
  ])

  const client = r2Client()
  const Bucket = r2Bucket()

  // Long-lived immutable caching is safe because keys are content-addressed by
  // photo id: replacing a photo means a new id, never a mutated object.
  const CACHE = "public, max-age=31536000, immutable"

  await Promise.all([
    client.send(
      new PutObjectCommand({
        Bucket,
        Key: variantKey(storageKey, "original", originalExt),
        Body: original,
        ContentType: originalContentType,
        CacheControl: CACHE,
      }),
    ),
    client.send(
      new PutObjectCommand({
        Bucket,
        Key: variantKey(storageKey, "full"),
        Body: full,
        ContentType: "image/webp",
        CacheControl: CACHE,
      }),
    ),
    client.send(
      new PutObjectCommand({
        Bucket,
        Key: variantKey(storageKey, "thumb"),
        Body: thumb,
        ContentType: "image/webp",
        CacheControl: CACHE,
      }),
    ),
  ])

  return {
    thumbBytes: thumb.length,
    fullBytes: full.length,
    originalBytes: original.length,
    width: meta.width ?? null,
    height: meta.height ?? null,
  }
}

/** File extension from a filename, lowercased, without the dot. */
export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".")
  if (dot === -1) return "jpg"
  return fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"
}
