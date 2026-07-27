import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { r2Bucket, r2Client, variantKey } from "@/lib/gallery/r2"
import { generateAndUploadDerivatives } from "@/lib/gallery/derivatives"

/**
 * POST /api/admin/photos/finalize — turn an uploaded original into a usable
 * photo.
 *
 * Called once per photo after the browser's direct-to-R2 PUT succeeds. Reads
 * the original back out of R2, generates the thumb and full derivatives, and
 * sets storageKey — which is what flips the row from "pending" to visible,
 * since the gallery reader treats a null storageKey as not-on-R2.
 *
 * Deliberately one photo per request. Derivative generation is CPU-bound, and
 * batching a few hundred into one call is how you build something that works
 * for twenty photos and times out for three hundred. The client walks the list
 * with a small amount of concurrency instead.
 */

const bodySchema = z.object({
  photoId: z.string().min(1),
  ext: z.string().min(1).max(10),
  contentType: z.string().regex(/^image\//),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("photos", "create")
  if (!check.authorized) return check.response

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }

  const photo = await prisma.meetupPhoto.findUnique({
    where: { id: parsed.photoId },
    select: { id: true, eventId: true, event: { select: { slug: true } } },
  })
  if (!photo) {
    return NextResponse.json({ success: false, error: "Unknown photo" }, { status: 404 })
  }

  // Recomputed server-side rather than taken from the request: the key decides
  // where bytes are read and written, and a client-supplied path is a way to
  // read or overwrite objects outside this photo's album.
  const storageKey = photo.event?.slug
    ? `events/${photo.event.slug}/${photo.id}`
    : `community/${photo.id}`

  try {
    const client = r2Client()
    const original = await client.send(
      new GetObjectCommand({
        Bucket: r2Bucket(),
        Key: variantKey(storageKey, "original", parsed.ext),
      }),
    )
    if (!original.Body) throw new Error("Uploaded original not found in storage")

    const bytes = Buffer.from(await original.Body.transformToByteArray())
    await generateAndUploadDerivatives(bytes, storageKey, parsed.ext, parsed.contentType)

    await prisma.meetupPhoto.update({
      where: { id: photo.id },
      data: { storageKey },
    })

    return NextResponse.json({ success: true, data: { photoId: photo.id } })
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Could not process the upload",
      },
      { status: 500 },
    )
  }
}
