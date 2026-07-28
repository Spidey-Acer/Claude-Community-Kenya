import { NextRequest, NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { buildStorageKey, r2Bucket, r2Client, variantKey } from "@/lib/gallery/r2"
import { extensionOf } from "@/lib/gallery/derivatives"

/**
 * POST /api/admin/photos/presign — mint direct-to-R2 upload URLs.
 *
 * The streaming route this replaces pushed every byte through the function:
 * capped at 10 files of 5 MB, and a hackathon shoot is a few hundred photos.
 * Raising those caps only moves the wall — the request body limit and the
 * function timeout are still in the path, and you are paying compute to act as
 * a pipe.
 *
 * Here the browser PUTs each original straight to R2 against a short-lived
 * signed URL, then posts metadata separately. Batch size stops being a
 * function-limit question.
 *
 * The row is created here, before the upload, because the row id *is* the
 * object id — that is what keeps a key derivable from a record and back. A row
 * whose upload never completes is visible and cleanable; an object with no row
 * is invisible and bills forever.
 */

const MAX_FILES = 200
const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB — originals off a real camera
const URL_TTL_SECONDS = 900 // 15 min: enough for a slow connection, short enough to matter

const bodySchema = z.object({
  // Required, not nullable: /gallery is purely an index of event albums, so a
  // photo uploaded with no event would land under the reserved "community/"
  // prefix with no page that ever renders it — an upload that is silently
  // swallowed. Every new R2 upload must belong to an event.
  eventId: z.string().min(1),
  photographer: z.string().max(120).nullable().optional(),
  featured: z.boolean().optional(),
  files: z
    .array(
      z.object({
        fileName: z.string().min(1).max(255),
        contentType: z.string().regex(/^image\//, "Only image uploads are allowed"),
        size: z.number().int().positive().max(MAX_FILE_SIZE),
        alt: z.string().max(500).optional(),
        caption: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(MAX_FILES),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("photos", "create")
  if (!check.authorized) return check.response

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch (err) {
    const message =
      err instanceof z.ZodError ? err.issues[0]?.message ?? "Invalid request" : "Invalid JSON body"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }

  const { eventId, photographer = null, featured = false, files } = parsed

  // Resolve the album folder once. An unknown eventId is a client bug.
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { slug: true },
  })
  if (!event) {
    return NextResponse.json({ success: false, error: "Unknown eventId" }, { status: 400 })
  }
  const eventSlug = event.slug

  const client = r2Client()
  const Bucket = r2Bucket()

  const uploads = await Promise.all(
    files.map(async (f) => {
      const photo = await prisma.meetupPhoto.create({
        data: {
          url: "",
          thumbnailUrl: null,
          alt: f.alt ?? null,
          caption: f.caption || null,
          photographer,
          eventId,
          featured,
        },
      })

      const storageKey = buildStorageKey(eventSlug, photo.id)
      const ext = extensionOf(f.fileName)
      const originalKey = variantKey(storageKey, "original", ext)

      // Signed against the exact content type the browser will send; a
      // mismatch makes R2 reject the PUT rather than store something
      // mislabelled.
      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({ Bucket, Key: originalKey, ContentType: f.contentType }),
        { expiresIn: URL_TTL_SECONDS },
      )

      return {
        photoId: photo.id,
        fileName: f.fileName,
        uploadUrl,
        contentType: f.contentType,
        storageKey,
        ext,
      }
    }),
  )

  return NextResponse.json({ success: true, data: { uploads } }, { status: 201 })
}
