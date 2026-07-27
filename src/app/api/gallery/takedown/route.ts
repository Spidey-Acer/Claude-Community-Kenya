import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { zodSanitizeString, zodSanitizeEmail, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { sendEmail } from "@/lib/email"

/**
 * POST /api/gallery/takedown — ask for a photo to be removed.
 *
 * Everyone here consented to being photographed at the event, but consent
 * given in a room is not consent forever: people change jobs, leave the
 * community, or simply decide later they would rather not be on a public page.
 * Honouring that has to be easier than emailing strangers and hoping.
 *
 * Requests land as ContactMessage rows so they queue in the admin inbox and
 * can be seen to have been actioned, rather than living only in whoever's
 * Gmail happened to receive them. The notification email is best-effort: a
 * failed send must not lose the request.
 *
 * No proof of identity is asked for and none should be. The cost of removing a
 * photo somebody did not want up is nearly zero; the cost of refusing a real
 * request while it is verified is not.
 */
const takedownSchema = z.object({
  email: z.string().email().transform(zodSanitizeEmail),
  albumSlug: z.string().min(1).max(200).transform(zodSanitizeString),
  photoRef: z.string().max(300).optional().transform((v) => (v ? zodSanitizeString(v) : "")),
  message: z.string().min(10).max(2000).transform(zodSanitizeMultilineText(2000)),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rl = await rateLimit(request, RateLimits.CONTACT)
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again shortly." },
      { status: 429, headers: rl.headers },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = takedownSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 },
    )
  }

  const { email, albumSlug, photoRef, message } = validation.data

  function esc(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  const subject = `Photo takedown request — ${albumSlug}`

  try {
    await prisma.contactMessage.create({
      data: {
        name: "Photo takedown request",
        email,
        subject,
        message: [
          `Album: /gallery/${albumSlug}`,
          photoRef ? `Photo: ${photoRef}` : null,
          "",
          message,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not record the request. Please email us instead." },
      { status: 500 },
    )
  }

  // Best-effort: the row is already saved, so a mail failure is not a lost
  // request. Takedowns are time-sensitive enough to be worth a push, though.
  try {
    await sendEmail({
      to: process.env.EMAIL_TO_ADMIN || "claudecommunitykenya@gmail.com",
      subject,
      html: `
        <div style="font-family:monospace;padding:16px;">
          <p><strong>Takedown request</strong> from ${esc(email)}</p>
          <p><strong>Album:</strong> /gallery/${esc(albumSlug)}</p>
          ${photoRef ? `<p><strong>Photo:</strong> ${esc(photoRef)}</p>` : ""}
          <hr/>
          <p>${esc(message).replace(/\n/g, "<br/>")}</p>
        </div>
      `,
    })
  } catch {
    // Swallowed on purpose — see above.
  }

  return NextResponse.json({ success: true })
}
