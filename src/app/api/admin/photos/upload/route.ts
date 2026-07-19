import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { uploadImage } from "@/lib/supabase"
import { withCsrfProtection } from "@/lib/csrf"

const MAX_FILES = 10
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

/**
 * POST /api/admin/photos/upload — Multipart file upload for one or more meetup photos.
 * Accepts fields: files (File[]), eventId?, photographer?, caption?, alt?, featured?.
 * Returns { success: true, data: { created: MeetupPhoto[], failures: string[] } }.
 */
export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("photos", "create")
  if (!check.authorized) return check.response

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid multipart body" }, { status: 400 })
  }

  const files = formData.getAll("files") as File[]
  if (!files.length) {
    return NextResponse.json({ success: false, error: "No files provided" }, { status: 400 })
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ success: false, error: `Maximum ${MAX_FILES} files per request` }, { status: 400 })
  }

  const eventId = (formData.get("eventId") as string | null) || null
  const photographer = (formData.get("photographer") as string | null) || null
  const caption = (formData.get("caption") as string | null) || null
  const alt = (formData.get("alt") as string | null) || null
  const featured = formData.get("featured") === "true"

  const created = []
  const failures: string[] = []

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      failures.push(`${file.name}: not an image (got ${file.type})`)
      continue
    }
    if (file.size > MAX_FILE_SIZE) {
      failures.push(`${file.name}: exceeds 5 MB limit`)
      continue
    }

    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const publicUrl = await uploadImage(buffer, file.name, file.type, "meetup-photos")
      const photo = await prisma.meetupPhoto.create({
        data: {
          url: publicUrl,
          thumbnailUrl: publicUrl, // thumbnail generation deferred to follow-up
          alt: alt ?? null,
          caption: caption ?? null,
          photographer: photographer ?? null,
          eventId: eventId ?? null,
          featured,
        },
      })
      created.push(photo)
    } catch (err) {
      failures.push(`${file.name}: ${String(err)}`)
    }
  }

  return NextResponse.json({ success: true, data: { created, failures } }, { status: 201 })
}
