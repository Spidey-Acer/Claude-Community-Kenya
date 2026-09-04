import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"

// Minimal by design: the only admin-editable field on a project is
// `featured` — everything else comes in through the public submission
// form (src/app/api/projects/submit/route.ts) and isn't editable here.
const updateSchema = z.object({
  featured: z.boolean(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("projects", "edit")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: parsed.error.issues }, { status: 400 })
  }

  const existing = await prisma.project.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })
  }

  const project = await prisma.project.update({ where: { id }, data: { featured: parsed.data.featured } })
  return NextResponse.json({ success: true, data: project })
}
