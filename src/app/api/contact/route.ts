import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import { zodSanitizeString, zodSanitizeEmail, zodSanitizeMultilineText } from "@/lib/input-sanitization"
import { sendEmail } from "@/lib/email"

const contactSchema = z.object({
  name: z.string().min(2).max(100).transform(zodSanitizeString),
  email: z.string().email().transform(zodSanitizeEmail),
  subject: z.string().min(3).max(200).transform(zodSanitizeString),
  message: z.string().min(10).max(3000).transform(zodSanitizeMultilineText(3000)),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.CONTACT)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many messages. Please try again later." },
      { status: 429, headers: rateLimitResult.headers }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = contactSchema.safeParse(body)
  if (!validation.success) {
    const details: Record<string, string> = {}
    for (const issue of validation.error.issues) {
      const key = issue.path[0]
      if (key && !details[String(key)]) details[String(key)] = issue.message
    }
    return NextResponse.json(
      { success: false, error: "Validation failed", details },
      { status: 400 }
    )
  }

  const data = validation.data

  function esc(str: string): string {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  }

  try {
    await prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
      },
    })

    await sendEmail({
      to: process.env.EMAIL_TO_ADMIN || "claudecommunitykenya@gmail.com",
      subject: `Contact: ${data.subject.slice(0, 100)} — ${data.name}`,
      html: `
        <div style="font-family:monospace;padding:16px;">
          <p><strong>From:</strong> ${esc(data.name)} &lt;${esc(data.email)}&gt;</p>
          <p><strong>Subject:</strong> ${esc(data.subject)}</p>
          <hr/>
          <p>${esc(data.message).replace(/\n/g, "<br/>")}</p>
        </div>
      `,
    }).catch(console.error)

    return NextResponse.json({
      success: true,
      message: "Message sent! We'll get back to you within 2 business days.",
    })
  } catch (error) {
    console.error("[CONTACT] Failed to save message:", error)
    return NextResponse.json(
      { success: false, error: "Failed to send message. Please try again." },
      { status: 500 }
    )
  }
}
