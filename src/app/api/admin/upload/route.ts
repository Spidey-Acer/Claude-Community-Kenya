import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { uploadImage } from "@/lib/supabase"
import { withCsrfProtection } from "@/lib/csrf"
import { validateUpload } from "@/lib/upload-validation"

const ALLOWED_FOLDERS = new Set(["events", "blog", "team", "community", "guides"])

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const rawFolder = formData.get("folder") as string | null
  const folder = rawFolder && ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : "events"

  // Guides uploads (the PDF itself, or its cover image) are gated on the
  // "guides" resource; every other folder keeps the original "events" gate.
  const check = await checkApiPermission(folder === "guides" ? "guides" : "events", "create")
  if (!check.authorized) return check.response

  if (!file) {
    return NextResponse.json(
      { success: false, error: "No file provided" },
      { status: 400 }
    )
  }

  const validation = validateUpload({ folder, contentType: file.type, size: file.size })
  if (!validation.ok) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    // Sanitize filename: remove special chars, keep extension
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .toLowerCase()

    const publicUrl = await uploadImage(buffer, safeName, file.type, folder)

    return NextResponse.json({ success: true, url: publicUrl, size: file.size })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
