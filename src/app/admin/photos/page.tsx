import { prisma } from "@/lib/prisma"
import { resolvePhotoUrls } from "@/lib/data"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { Camera, Plus, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface SearchParams {
  event?: string
}

/**
 * Admin listing page for meetup photos.
 * Supports filtering by event via ?event=<eventId> query param.
 */
export default async function PhotosAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { event: eventFilter } = await searchParams

  const [photos, events] = await Promise.all([
    prisma.meetupPhoto.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      include: { event: { select: { id: true, title: true } } },
    }),
    prisma.event.findMany({
      orderBy: { date: "desc" },
      select: { id: true, title: true },
    }),
  ])

  const filtered = eventFilter
    ? photos.filter(p => p.eventId === eventFilter)
    : photos

  return (
    <div>
      <AdminHeader title="Meetup Photos" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <p className="text-xs font-mono text-[#555]">{filtered.length} photo{filtered.length !== 1 ? "s" : ""}</p>
            {/* Event filter */}
            <form method="GET" className="flex items-center gap-2">
              {/*
                No onChange here. This is a Server Component, and React refuses
                to serialise an event handler onto a DOM element from one — it
                throws at render and takes the whole page down, which is what it
                was doing. The handler was a no-op anyway; the Filter button
                below submits the form.
              */}
              <select
                name="event"
                defaultValue={eventFilter ?? ""}
                className="bg-[#111] border border-[#1e1e1e] rounded px-2 py-1.5 text-[11px] font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50"
              >
                <option value="">All events</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
              <button
                type="submit"
                className="px-2 py-1.5 text-[11px] font-mono text-[#555] border border-[#1e1e1e] rounded hover:text-[#ccc] transition-colors"
              >
                Filter
              </button>
              {eventFilter && (
                <Link href="/admin/photos" className="text-[11px] font-mono text-[#555] hover:text-[#ccc] transition-colors">
                  Clear
                </Link>
              )}
            </form>
          </div>
          <Link
            href="/admin/photos/new"
            className="flex items-center gap-2 px-3 py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41] hover:bg-[#00ff41]/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Upload Photos
          </Link>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Camera className="w-8 h-8 text-[#333] mb-3" />
              <p className="text-sm font-mono text-[#555]">No photos yet</p>
              <p className="text-xs font-mono text-[#333] mt-1">Upload photos from community meetups.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Photo</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Event</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Caption</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Photographer</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Featured</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {filtered.map((photo) => {
                  const resolved = resolvePhotoUrls(photo)
                  return (
                  <tr key={photo.id} className="hover:bg-[#111] transition-colors">
                    <td className="px-4 py-3">
                      <img
                        src={resolved.thumbnailUrl ?? resolved.url}
                        alt={photo.alt ?? ""}
                        className="h-[60px] w-[60px] object-cover rounded bg-[#1a1a1a]"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#888]">
                      {photo.event ? photo.event.title : <span className="text-[#444]">— general —</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#888] max-w-[200px]">
                      {photo.caption ? (
                        <span className="truncate block" title={photo.caption}>{photo.caption.slice(0, 60)}{photo.caption.length > 60 ? "…" : ""}</span>
                      ) : (
                        <span className="text-[#444]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#888]">
                      {photo.photographer ?? <span className="text-[#444]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {photo.featured && <CheckCircle2 className="w-4 h-4 text-[#00ff41]" />}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#555]">{photo.order}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/photos/${photo.id}`}
                        className="text-[11px] font-mono text-[#00ff41] hover:underline"
                      >
                        Edit →
                      </Link>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
