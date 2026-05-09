import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { zodSanitizeString, zodSanitizeUrl, zodSanitizeMultilineText } from "@/lib/input-sanitization"

const createSchema = z.object({
  name: z.string().min(2).max(100).transform(zodSanitizeString),
  role: z.string().min(2).max(100).transform(zodSanitizeString),
  bio: z.string().min(10).max(1000).transform(zodSanitizeMultilineText(1000)),
  linkedIn: z.string().url().optional().nullable().transform(v => v ? zodSanitizeUrl(v) : null),
  github: z.string().url().optional().nullable().transform(v => v ? zodSanitizeUrl(v) : null),
  twitter: z.string().url().optional().nullable().transform(v => v ? zodSanitizeUrl(v) : null),
  website: z.string().url().optional().nullable().transform(v => v ? zodSanitizeUrl(v) : null),
  avatar: z.string().url().optional().nullable().transform(v => v ? zodSanitizeUrl(v) : null),
  order: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
})

export async function GET() {
  const check = await checkApiPermission("team", "view")
  if (!check.authorized) return check.response

  const members = await prisma.teamMember.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] })
  return NextResponse.json({ success: true, data: members })
}

export async function POST(request: NextRequest) {
  const check = await checkApiPermission("team", "create")
  if (!check.authorized) return check.response

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: parsed.error.issues }, { status: 400 })
  }

  const member = await prisma.teamMember.create({ data: parsed.data })
  return NextResponse.json({ success: true, data: member }, { status: 201 })
}
