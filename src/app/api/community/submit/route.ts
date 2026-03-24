import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { rateLimit, RateLimits } from "@/lib/rate-limit"
import {
  zodSanitizeString,
  zodSanitizeMultilineText,
  zodSanitizeUrl,
  containsPromptInjection,
} from "@/lib/input-sanitization"
import { toSlug } from "@/lib/utils"
import { CommunityResourceType } from "@/generated/prisma/client"

const communitySubmitSchema = z.object({
  type: z.nativeEnum(CommunityResourceType),
  title: z.string().min(5).max(150).transform(zodSanitizeString),
  shortDescription: z.string().min(20).max(300).transform(zodSanitizeString),
  fullDescription: z.string().min(50).max(5000).transform(zodSanitizeMultilineText(5000)),
  url: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  repoUrl: z.string().url().optional().transform(v => v ? zodSanitizeUrl(v) : undefined),
  installInstructions: z.string().max(3000).optional().transform(v => v ? zodSanitizeMultilineText(3000)(v) : undefined),
  tags: z.array(z.string().max(30).transform(zodSanitizeString)).max(10).default([]),
  submitterName: z.string().max(100).optional().transform(v => v ? zodSanitizeString(v) : undefined),
  submitterContact: z.string().max(200).optional().transform(v => v ? zodSanitizeString(v) : undefined),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const rateLimitResult = await rateLimit(request, RateLimits.COMMUNITY_SUBMIT)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: "Too many submissions. Please try again later." },
      { status: 429, headers: rateLimitResult.headers }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const validation = communitySubmitSchema.safeParse(body)
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
  const slug = toSlug(data.title) + "-" + Date.now().toString(36)

  const textToCheck = [data.title, data.shortDescription, data.fullDescription].join(" ")
  if (containsPromptInjection(textToCheck)) {
    console.warn("[COMMUNITY] Potential prompt injection detected in submission:", slug)
  }

  try {
    await prisma.communitySubmission.create({
      data: {
        type: data.type,
        title: data.title,
        slug,
        shortDescription: data.shortDescription,
        fullDescription: data.fullDescription,
        url: data.url,
        repoUrl: data.repoUrl,
        installInstructions: data.installInstructions,
        tags: data.tags,
        submitterName: data.submitterName,
        submitterContact: data.submitterContact,
        status: "PENDING",
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: "Your submission is pending review. Thank you!",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[COMMUNITY] Failed to create submission:", error)
    return NextResponse.json(
      { success: false, error: "Failed to submit. Please try again." },
      { status: 500 }
    )
  }
}
