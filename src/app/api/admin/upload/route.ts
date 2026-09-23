import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { uploadImage } from "@/lib/supabase"
import { withCsrfProtection } from "@/lib/csrf"
import { validateUpload, hasPdfMagicBytes, UPLOAD_PDF_TYPE } from "@/lib/upload-validation"

const ALLOWED_FOLDERS = new Set(["events", "blog", "team", "community", "guides"])

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  // Permission is checked BEFORE the multipart body is parsed. `/api/csrf-token`
  // needs no auth, so without this ordering anyone could hit this route and
  // make it buffer an arbitrarily large body before ever being rejected.
  // The folder therefore has to come from the query string — the client
  // already knows it, so it sends it both ways (see GuidesManager.tsx) — and
  // is re-checked against the form field once the body is parsed below.
  const { searchParams } = new URL(request.url)
  const queryFolder = searchParams.get("folder")
  const gateFolder = queryFolder && ALLOWED_FOLDERS.has(queryFolder) ? queryFolder : "events"

  const check = await checkApiPermission(gateFolder === "guides" ? "guides" : "events", "create")
  if (!check.authorized) return check.response

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const rawFolder = formData.get("folder") as string | null
  const folder = rawFolder && ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : "events"

  // The form field must agree with the query string that was actually
  // gated above — otherwise a caller could pass one folder in the query (to
  // satisfy that folder's permission check) and a different one in the body
  // to have the file treated/stored as that other folder.
  if (folder !== gateFolder) {
    return NextResponse.json(
      { success: false, error: "folder mismatch between query string and form data" },
      { status: 400 }
    )
  }

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

    // file.type is client-controlled and validateUpload only checked the
    // claimed content type — confirm the bytes actually are a PDF before
    // storing and linking to them from an <iframe>.
    if (file.type === UPLOAD_PDF_TYPE && !hasPdfMagicBytes(buffer)) {
      return NextResponse.json(
        { success: false, error: "File is not a valid PDF" },
        { status: 400 }
      )
    }

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
