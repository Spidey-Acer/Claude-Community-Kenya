import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
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
        <PhotoEditForm photo={photo} events={events} />
      </div>
    </div>
  )
}
