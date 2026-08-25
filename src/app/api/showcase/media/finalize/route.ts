import { NextRequest, NextResponse } from "next/server"
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { z } from "zod"
import sharp from "sharp"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { getSessionUserId } from "@/lib/auth-helpers"
import { publicUrl, r2Bucket, r2Client } from "@/lib/gallery/r2"
import { sniffMediaKind, validateMediaSize, type MediaDescriptor } from "@/lib/showcase/media"

/**
 * POST /api/showcase/media/finalize — decide what an uploaded object actually is.
 *
 * The browser told us a content type at presign time and we signed against it,
 * but that claim is attacker-controlled. Here the first bytes of the stored
 * object decide the kind, the size is re-checked against the real object, and
 * only then does a media descriptor come back that the post can reference.
 *
 * Images are re-encoded through sharp, which both strips EXIF (location data
 * in a phone screenshot is a real leak) and gives us true dimensions.
 */

/** Enough to cover every signature we check, and cheap to pull. */
const SNIFF_BYTES = 64

/** Content type to store a re-encoded image under, keyed by sharp's format name. */
const CONTENT_TYPE_BY_FORMAT: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
}

const bodySchema = z.object({
  key: z.string().min(1).max(300),
  alt: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.FORM)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many uploads. Please try again shortly." },
      { status: 429, headers: rateLimitResult.headers },
    )
  }

  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ success: false, error: "Sign in to upload media." }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, active: true },
  })
  if (!user?.active || !user.emailVerified) {
    return NextResponse.json(
      { success: false, error: "Verify your email address to upload media." },
      { status: 403 },
    )
  }

  let parsed: z.infer<typeof bodySchema>
  try {
    parsed = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }

  // A member may only finalize keys under their own pending prefix. Without
  // this, a signed-in user could point finalize at anyone else's object.
  if (!parsed.key.startsWith(`showcase/pending/${userId}/`)) {
    return NextResponse.json({ success: false, error: "Unknown upload" }, { status: 403 })
  }

  try {
    const client = r2Client()
    const Bucket = r2Bucket()

    const head = await client.send(
      new GetObjectCommand({ Bucket, Key: parsed.key, Range: `bytes=0-${SNIFF_BYTES - 1}` }),
    )
    const headBytes = new Uint8Array(await head.Body!.transformToByteArray())

    const kind = sniffMediaKind(headBytes)
    if (!kind) {
      return NextResponse.json(
        { success: false, error: "Unsupported file type. Use JPG, PNG, WEBP, GIF or MP4." },
        { status: 400 },
      )
    }

    // ContentLength on the ranged GET is the range, not the object, so read
    // the real size off the same response's content-range total.
    const total = Number(head.ContentRange?.split("/")[1] ?? 0)
    const sizeCheck = validateMediaSize(kind, total)
    if (!sizeCheck.ok) {
      return NextResponse.json({ success: false, error: sizeCheck.error }, { status: 400 })
    }

    let width = 0
    let height = 0

    if (kind === "image") {
      const full = await client.send(new GetObjectCommand({ Bucket, Key: parsed.key }))
      const buffer = Buffer.from(await full.Body!.transformToByteArray())

      // Re-encode and write back over the original. sharp drops all metadata
      // unless asked to keep it, so this is what actually strips EXIF — reading
      // `.metadata()` alone would leave the GPS coordinates in a phone photo
      // sitting on a public URL. `.rotate()` first bakes the EXIF orientation
      // into the pixels, otherwise portrait shots come back sideways once the
      // orientation tag is gone.
      const { data, info } = await sharp(buffer)
        .rotate()
        .toBuffer({ resolveWithObject: true })

      const contentType = CONTENT_TYPE_BY_FORMAT[info.format]
      if (!contentType) {
        return NextResponse.json(
          { success: false, error: "Unsupported file type. Use JPG, PNG, WEBP, GIF or MP4." },
          { status: 400 },
        )
      }

      await client.send(
        new PutObjectCommand({ Bucket, Key: parsed.key, Body: data, ContentType: contentType }),
      )

      // Dimensions come from the re-encoded output, not the original: a 90°
      // orientation tag swaps them.
      width = info.width
      height = info.height
    }

    const media: MediaDescriptor = {
      key: parsed.key,
      url: publicUrl(parsed.key),
      width,
      height,
      kind,
      alt: parsed.alt,
    }

    return NextResponse.json({ success: true, data: { media } }, { status: 200 })
  } catch (error) {
    console.error("[SHOWCASE] Failed to finalize media:", error)
    return NextResponse.json(
      { success: false, error: "Could not process that upload. Please try again." },
      { status: 500 },
    )
  }
}
