import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { zodSanitizeString, zodSanitizeUrl, zodSanitizeMultilineText } from "@/lib/input-sanitization"

const updateSchema = z.object({
  name: z.string().min(2).max(100).transform(zodSanitizeString).optional(),
  role: z.string().min(2).max(100).transform(zodSanitizeString).optional(),
  bio: z.string().min(10).max(1000).transform(zodSanitizeMultilineText(1000)).optional(),
  linkedIn: z.string().url().optional().nullable().transform(v => v ? zodSanitizeUrl(v) : null),
  github: z.string().url().optional().nullable().transform(v => v ? zodSanitizeUrl(v) : null),
  twitter: z.string().url().optional().nullable().transform(v => v ? zodSanitizeUrl(v) : null),
  website: z.string().url().optional().nullable().transform(v => v ? zodSanitizeUrl(v) : null),
  avatar: z.string().url().optional().nullable().transform(v => v ? zodSanitizeUrl(v) : null),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("team", "view")
  if (!check.authorized) return check.response

  const { id } = await params
  const member = await prisma.teamMember.findUnique({ where: { id } })
  if (!member) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: member })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("team", "edit")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: parsed.error.issues }, { status: 400 })
  }

  const member = await prisma.teamMember.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ success: true, data: member })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("team", "delete")
  if (!check.authorized) return check.response

  const { id } = await params
  await prisma.teamMember.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
