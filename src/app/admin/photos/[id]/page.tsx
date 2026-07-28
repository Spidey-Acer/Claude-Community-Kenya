import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { resolvePhotoUrls } from "@/lib/data"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { PhotoEditForm } from "./PhotoEditForm"

/**
 * Admin edit page for a single meetup photo.
 */
export default async function EditPhotoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [photo, events] = await Promise.all([
    prisma.meetupPhoto.findUnique({ where: { id } }),
    prisma.event.findMany({ orderBy: { date: "desc" }, select: { id: true, title: true } }),
  ])
  if (!photo) notFound()

  // Photo rows read straight off Prisma leave R2-backed url/thumbnailUrl
  // empty — presign creates the row before upload and finalize only sets
  // storageKey — so this resolves them the same way the public gallery does,
  // otherwise an admin can never see, verify, or confirm a photo before
  // editing or deleting it.
  const resolved = resolvePhotoUrls(photo)
  const displayPhoto = { ...photo, url: resolved.url, thumbnailUrl: resolved.thumbnailUrl }

  return (
    <div>
      <AdminHeader title="Edit Photo" />
      <div className="p-6 max-w-2xl">
        <div className="mb-4">
          <Link
            href="/admin/photos"
            className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors"
          >
            ← Back to Photos
          </Link>
        </div>
        <PhotoEditForm photo={displayPhoto} events={events} />
      </div>
    </div>
  )
}
