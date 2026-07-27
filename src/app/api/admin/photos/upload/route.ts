import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { buildStorageKey } from "@/lib/gallery/r2"
import { extensionOf, generateAndUploadDerivatives } from "@/lib/gallery/derivatives"

const MAX_FILES = 10
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

/**
 * POST /api/admin/photos/upload — Multipart upload for one or more photos.
 *
 * Accepts: files (File[]), alt (string[]), caption (string[]) — the three
 * appended in lockstep so index N of each describes the same photo — plus
 * eventId?, photographer?, featured?.
 *
 * Photos land in R2: the original is archived unserved and thumb/full webp
 * derivatives are generated for the grid and the lightbox. Previously the row
 * recorded thumbnailUrl = url, so every grid tile pulled a full-resolution
 * image and leaned on the Vercel optimizer to shrink it on the fly.
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

  // Parallel arrays from the form. Missing entries degrade to empty rather
  // than throwing: an absent alt is a valid, meaningful answer.
  const alts = formData.getAll("alt").map(String)
  const captions = formData.getAll("caption").map(String)

  const eventId = (formData.get("eventId") as string | null) || null
  const photographer = (formData.get("photographer") as string | null) || null
  const featured = formData.get("featured") === "true"

  // The album folder is keyed on the event slug, so resolve it once up front.
  // A supplied-but-unknown eventId is a client bug, not a reason to silently
  // dump the batch into the community folder.
  let eventSlug: string | null = null
  if (eventId) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { slug: true },
    })
    if (!event) {
      return NextResponse.json({ success: false, error: "Unknown eventId" }, { status: 400 })
    }
    eventSlug = event.slug
  }

  const created = []
  const failures: string[] = []

  for (const [i, file] of files.entries()) {
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

      // The row id doubles as the object id, so the key is derivable from the
      // record and vice versa. Created first, with a placeholder url, then
      // updated — an upload that dies midway leaves a row pointing at nothing
      // rather than an orphaned object nobody can find or bill for.
      const photo = await prisma.meetupPhoto.create({
        data: {
          url: "",
          thumbnailUrl: null,
          alt: alts[i] ?? null,
          caption: captions[i] || null,
          photographer,
          eventId,
          featured,
        },
      })

      const storageKey = buildStorageKey(eventSlug, photo.id)
      await generateAndUploadDerivatives(
        buffer,
        storageKey,
        extensionOf(file.name),
        file.type,
      )

      const saved = await prisma.meetupPhoto.update({
        where: { id: photo.id },
        data: { storageKey },
      })
      created.push(saved)
    } catch (err) {
      failures.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return NextResponse.json({ success: true, data: { created, failures } }, { status: 201 })
}
