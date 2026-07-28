import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3"

/**
 * Cloudflare R2 client and key layout for gallery media.
 *
 * R2 is S3-compatible, so the AWS SDK talks to it directly — the only
 * differences that matter here are the endpoint and that R2 ignores regions
 * (hence the "auto" placeholder, which is what Cloudflare's own docs use).
 *
 * Chosen over Supabase Storage for photos specifically because egress is free:
 * a gallery is the one part of this site where a single visitor may pull tens
 * of megabytes, and this audience is on mobile data.
 */

/**
 * Read a required env var or throw naming it.
 *
 * Deliberately loud. A silent fallback here would mean uploads quietly landing
 * in the wrong bucket, or every gallery image resolving against a hostname
 * that does not exist — both of which surface as "the gallery is broken" long
 * after the deploy that caused them.
 */
function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(
      `${name} is not set. Gallery storage needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_BASE_URL.`,
    )
  }
  return value
}

export function r2Bucket(): string {
  return requireEnv("R2_BUCKET")
}

/**
 * Public base for reads, e.g. https://media.claudekenya.org — the bucket's
 * custom domain. Trailing slash trimmed so callers can always join with "/".
 */
export function r2PublicBase(): string {
  return requireEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "")
}

let cached: S3Client | null = null

/** Lazily constructed so importing this module never throws at build time. */
export function r2Client(): S3Client {
  if (cached) return cached
  cached = new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  })
  return cached
}

// ─── Key layout ──────────────────────────────────────────────────────────────
//
//   events/<event-slug>/original/<id>.<ext>   archival, never served
//   events/<event-slug>/full/<id>.webp        lightbox source, 2400px
//   events/<event-slug>/thumb/<id>.webp       grid source, 800px
//   events/<event-slug>/bundle/<name>.zip     pre-generated download-all
//   community/<variant>/<id>.webp             photos with no event
//
// Folder comes off Event.slug, which is already unique and already the public
// URL segment — so a key is readable in the Cloudflare dashboard and maps to
// something a human recognises without a database lookup.

export type PhotoVariant = "original" | "full" | "thumb"

/** Slug segment for an album. Null eventId is the "community life" bucket. */
export function albumPrefix(eventSlug: string | null): string {
  return eventSlug ? `events/${eventSlug}` : "community"
}

/**
 * Build the object key for one variant of one photo.
 *
 * `storageKey` on the row stores the *base* — prefix + id — and the variant
 * plus extension are composed here, so one row addresses all three renditions
 * without storing three columns that could drift apart.
 */
export function variantKey(storageKey: string, variant: PhotoVariant, ext = "webp"): string {
  const slash = storageKey.lastIndexOf("/")
  const prefix = storageKey.slice(0, slash)
  const id = storageKey.slice(slash + 1)
  return `${prefix}/${variant}/${id}.${ext}`
}

/** The stored base key for a new photo in an album. */
export function buildStorageKey(eventSlug: string | null, photoId: string): string {
  return `${albumPrefix(eventSlug)}/${photoId}`
}

/** Key for an album's download-all zip. */
export function bundleKeyFor(eventSlug: string): string {
  return `${albumPrefix(eventSlug)}/bundle/cck-${eventSlug}-photos.zip`
}

/** Absolute public URL for an object key, resolved at read time from env. */
export function publicUrl(key: string): string {
  return `${r2PublicBase()}/${key}`
}

// ─── Deletion ────────────────────────────────────────────────────────────────

/**
 * Delete a single object by key. Deleting a key that does not exist is not an
 * error under S3/R2 semantics, so callers never need to check existence first.
 */
export async function deleteObject(key: string): Promise<void> {
  await r2Client().send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: key }))
}

/**
 * Delete every object that belongs to one photo: original, full and thumb.
 *
 * `originalExt` addresses the original directly rather than discovering it,
 * because finding it any other way means listing the bucket by prefix — an
 * `s3:ListBucket`-shaped operation the R2 token may not be scoped for (it is
 * granted object-level read/write, not bucket-level list) — and an extra
 * round trip regardless. `full`/`thumb` need no such lookup: derivatives are
 * always webp.
 *
 * A null `originalExt` means finalize never completed for this row (it is
 * the one field set alongside storageKey), so there is no original to target
 * — full/thumb are still deleted.
 */
export async function deletePhotoObjects(storageKey: string, originalExt: string | null): Promise<void> {
  const client = r2Client()
  const Bucket = r2Bucket()
  const keys = [
    ...(originalExt ? [variantKey(storageKey, "original", originalExt)] : []),
    variantKey(storageKey, "full"),
    variantKey(storageKey, "thumb"),
  ]
  await Promise.all(keys.map(Key => client.send(new DeleteObjectCommand({ Bucket, Key }))))
}
