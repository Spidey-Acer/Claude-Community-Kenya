import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { deleteImage } from "@/lib/supabase"
import { deleteObject, deletePhotoObjects } from "@/lib/gallery/r2"
import { withCsrfProtection } from "@/lib/csrf"
import { zodSanitizeString, zodSanitizeUrl, zodSanitizeMultilineText } from "@/lib/input-sanitization"

const updateSchema = z.object({
  url: z.string().url().transform(zodSanitizeUrl).optional(),
  thumbnailUrl: z.string().url().optional().nullable().transform(v => v ? zodSanitizeUrl(v) : null),
  alt: z.string().max(500).optional().nullable().transform(v => v ? zodSanitizeMultilineText(500)(v) : null),
  caption: z.string().max(1000).optional().nullable().transform(v => v ? zodSanitizeMultilineText(1000)(v) : null),
  photographer: z.string().max(100).optional().nullable().transform(v => v ? zodSanitizeString(v) : null),
  eventId: z.string().optional().nullable(),
  featured: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  takenAt: z.string().datetime().optional().nullable().transform(v => v ? new Date(v) : null),
})

/**
 * GET /api/admin/photos/[id] — Fetch a single photo with its event relation.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await checkApiPermission("photos", "view")
  if (!check.authorized) return check.response

  const { id } = await params
  const photo = await prisma.meetupPhoto.findUnique({
    where: { id },
    include: { event: { select: { id: true, title: true } } },
  })
  if (!photo) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true, data: photo })
}

/**
 * PATCH /api/admin/photos/[id] — Update photo metadata fields.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("photos", "edit")
  if (!check.authorized) return check.response

  const { id } = await params

  let body: unknown
  try { body = await request.json() }
  catch { return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 }) }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation failed", details: parsed.error.issues }, { status: 400 })
  }

  const photo = await prisma.meetupPhoto.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ success: true, data: photo })
}

/**
 * DELETE /api/admin/photos/[id] — Remove the photo from storage then delete the DB record.
 * Storage cleanup failure is logged and does not block the DB delete.
 *
 * R2-backed rows (storageKey set) store an empty `url` — presign creates the
 * row before upload and finalize never touches `url` — so the legacy
 * Supabase `deleteImage(photo.url)` call is a no-op for them. Those rows
 * delete their three R2 objects (original/full/thumb) directly instead.
 *
 * If the photo belonged to an album with a pre-generated "download all" zip,
 * that zip is deleted and the event's bundle fields cleared. Without this, a
 * photo removed via a takedown request would keep shipping inside the
 * already-built zip until the nightly rebuild sweep next reached this album —
 * which defeats the takedown this feature exists to honour. Clearing
 * `bundleKey` also hides the download button (`KaribuAlbum` only renders it
 * when a bundle URL is present) until a fresh zip is built.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = withCsrfProtection(_req)
  if (csrfError) return csrfError

  const check = await checkApiPermission("photos", "delete")
  if (!check.authorized) return check.response

  const { id } = await params
  const photo = await prisma.meetupPhoto.findUnique({
    where: { id },
    select: { url: true, storageKey: true, eventId: true },
  })
  if (!photo) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 })

  try {
    if (photo.storageKey) {
      await deletePhotoObjects(photo.storageKey)
    } else {
      await deleteImage(photo.url)
    }
  } catch (err) {
    // Non-fatal: log and continue so the DB record is always cleaned up
    process.stderr.write(`[photos/delete] storage cleanup failed for ${id}: ${String(err)}\n`)
  }

  await prisma.meetupPhoto.delete({ where: { id } })

  if (photo.storageKey && photo.eventId) {
    const event = await prisma.event.findUnique({
      where: { id: photo.eventId },
      select: { bundleKey: true },
    })
    if (event?.bundleKey) {
      try {
        await deleteObject(event.bundleKey)
      } catch (err) {
        process.stderr.write(`[photos/delete] bundle cleanup failed for ${event.bundleKey}: ${String(err)}\n`)
      }
      await prisma.event.update({
        where: { id: photo.eventId },
        data: { bundleKey: null, bundleBytes: null, bundleGeneratedAt: null },
      })
    }
  }

  return NextResponse.json({ success: true })
}
