import { ZipArchive } from "archiver"
import { PassThrough } from "node:stream"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { Upload } from "@aws-sdk/lib-storage"
import { prisma } from "@/lib/prisma"
import { bundleKeyFor, r2Bucket, r2Client, variantKey } from "./r2"

/**
 * Build an album's "download all" zip and store it in R2.
 *
 * Zips the *full* derivatives, not the originals. Three hundred originals at
 * 5 MB is a 1.5 GB job that will fight every limit in the platform; three
 * hundred 2400px webp is roughly a tenth of that, generates in seconds, and is
 * what somebody actually wants to look at or repost. Originals stay in the
 * bucket for anyone who asks.
 *
 * Streamed end to end: archiver's output is piped into a multipart upload, so
 * memory stays flat regardless of album size rather than buffering the whole
 * archive to produce a Content-Length.
 */
export interface BundleResult {
  key: string
  bytes: number
  photoCount: number
}

export async function buildEventBundle(eventSlug: string): Promise<BundleResult> {
  const event = await prisma.event.findUnique({
    where: { slug: eventSlug },
    select: { id: true, slug: true },
  })
  if (!event) throw new Error(`Unknown event slug: ${eventSlug}`)

  const photos = await prisma.meetupPhoto.findMany({
    // Only R2-backed rows: a legacy Supabase photo has no storageKey and so no
    // derivative to pull. Skipped rather than failing the whole bundle.
    where: { eventId: event.id, storageKey: { not: null } },
    select: { id: true, storageKey: true, caption: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  })
  if (photos.length === 0) {
    throw new Error(`No R2-backed photos for ${eventSlug} — nothing to bundle`)
  }

  const client = r2Client()
  const Bucket = r2Bucket()
  const key = bundleKeyFor(event.slug)

  // store: true — photos are already compressed webp, so asking zip to
  // squeeze them again burns CPU for roughly nothing and keeps this I/O-bound.
  // Note archiver exports classes here, not a callable factory.
  const archive = new ZipArchive({ store: true })
  const passthrough = new PassThrough()
  archive.pipe(passthrough)

  let bytes = 0
  passthrough.on("data", (chunk: Buffer) => {
    bytes += chunk.length
  })

  const upload = new Upload({
    client,
    params: {
      Bucket,
      Key: key,
      Body: passthrough,
      ContentType: "application/zip",
      // Short cache: unlike photos, this key is reused when an album gains
      // new photos, so it must not be pinned at a CDN edge for a year.
      CacheControl: "public, max-age=300",
    },
  })
  const uploadPromise = upload.done()

  try {
    for (const [i, photo] of photos.entries()) {
      const object = await client.send(
        new GetObjectCommand({
          Bucket,
          Key: variantKey(photo.storageKey!, "full"),
        }),
      )
      if (!object.Body) continue

      // Numbered so the zip opens in album order rather than whatever order
      // the filesystem feels like.
      const index = String(i + 1).padStart(3, "0")
      archive.append(Buffer.from(await object.Body.transformToByteArray()), {
        name: `${event.slug}-${index}.webp`,
      })
    }
    await archive.finalize()
    await uploadPromise
  } catch (err) {
    archive.abort()
    throw err
  }

  await prisma.event.update({
    where: { id: event.id },
    data: { bundleKey: key, bundleBytes: bytes, bundleGeneratedAt: new Date() },
  })

  return { key, bytes, photoCount: photos.length }
}

/**
 * True when an album's zip is missing or older than its newest photo.
 *
 * Compared against the photo's createdAt rather than a dirty flag, so a bundle
 * cannot be silently stale after someone adds photos without touching this
 * code path.
 */
export async function isBundleStale(eventId: string): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { bundleGeneratedAt: true },
  })
  if (!event) return false
  if (!event.bundleGeneratedAt) return true

  const newest = await prisma.meetupPhoto.findFirst({
    where: { eventId, storageKey: { not: null } },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  })
  if (!newest) return false
  return newest.createdAt > event.bundleGeneratedAt
}
