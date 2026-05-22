import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { PhotoUploadForm } from "./PhotoUploadForm"

/**
 * Admin page for uploading one or more meetup photos.
 * Events list is fetched server-side and passed to the form.
 */
export default async function NewPhotoPage() {
  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
    select: { id: true, title: true },
  })

  return (
    <div>
      <AdminHeader title="Upload Photos" />
      <div className="p-6 max-w-2xl">
        <div className="mb-4">
          <Link href="/admin/photos" className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
            ← Back to Photos
          </Link>
        </div>
        <PhotoUploadForm events={events} />
      </div>
    </div>
  )
}
