import { NextRequest, NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { randomUUID } from "crypto"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { getSessionUserId } from "@/lib/auth-helpers"
import { r2Bucket, r2Client } from "@/lib/gallery/r2"
import {
  MAX_DEMO_BYTES,
  MAX_MEDIA_PER_POST,
  UPLOAD_CONTENT_TYPES,
} from "@/lib/showcase/constants"

/**
 * POST /api/showcase/media/presign — mint direct-to-R2 upload URLs for a member.
 *
 * Modelled on /api/admin/photos/presign, with two deliberate differences.
 * Authorisation is "verified member" rather than an admin permission, and no
 * database row is created up front: a showcase post does not exist yet when
 * its cover image is being uploaded, so the key lands under a pending prefix
 * and is only claimed when the post is created.
 *
 * The declared size and content type here only gate the signature. What the
 * file actually IS gets decided from its bytes in finalize. The content type is
 * still allowlisted rather than trusted, because it is baked into the signature
 * and stored on a publicly served object — see UPLOAD_CONTENT_TYPES.
 */

const URL_TTL_SECONDS = 900

const bodySchema = z.object({
  files: z
    .array(
      z.object({
        fileName: z.string().min(1).max(255),
        // Allowlisted, not free text: the signature and the stored object both
        // carry this value, and the bucket is served from a public domain.
        contentType: z.enum(UPLOAD_CONTENT_TYPES),
        size: z.number().int().positive().max(MAX_DEMO_BYTES),
      }),
    )
    .min(1)
    .max(MAX_MEDIA_PER_POST),
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
    return NextResponse.json(
      { success: false, error: "Sign in to upload media." },
      { status: 401 },
    )
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
  } catch (err) {
    const message =
      err instanceof z.ZodError ? err.issues[0]?.message ?? "Invalid request" : "Invalid JSON body"
    return NextResponse.json({ success: false, error: message }, { status: 400 })
  }

  const client = r2Client()
  const Bucket = r2Bucket()

  const uploads = await Promise.all(
    parsed.files.map(async (file) => {
      const uploadId = randomUUID()
      // Pending prefix: an object whose post is never created stays sweepable
      // by age without touching anything a live post references.
      const key = `showcase/pending/${userId}/${uploadId}`

      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({ Bucket, Key: key, ContentType: file.contentType }),
        { expiresIn: URL_TTL_SECONDS },
      )

      return { uploadId, uploadUrl, key }
    }),
  )

  return NextResponse.json({ success: true, data: { uploads } }, { status: 201 })
}
