import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { formatDate } from "@/lib/utils"
import { Calendar, Plus } from "lucide-react"

export const dynamic = "force-dynamic"

const TYPE_LABELS: Record<string, string> = {
  MEETUP: "Meetup",
  WORKSHOP: "Workshop",
  CAREER_TALK: "Career Talk",
  HACKATHON: "Hackathon",
  CONFERENCE: "Conference",
}

export default async function EventsAdminPage() {
  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
  })

  return (
    <div>
      <AdminHeader title="Events" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono text-[#555]">{events.length} events total</p>
          <div className="flex items-center gap-2 px-3 py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41] cursor-not-allowed opacity-60">
            <Plus className="w-3.5 h-3.5" />
            New Event
            <span className="ml-1 text-[9px] text-[#00ff41]/60">(coming soon)</span>
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="w-8 h-8 text-[#333] mb-3" />
              <p className="text-sm font-mono text-[#555]">No events found</p>
              <p className="text-xs font-mono text-[#333] mt-1">Run the seed script to populate events</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Event</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">City</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Featured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-[#111] transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono text-[#e0e0e0]">{event.title}</div>
                      <div className="text-[11px] font-mono text-[#444]">/events/{event.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#666]">{TYPE_LABELS[event.type] ?? event.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#666]">{event.city}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#444]">{formatDate(event.date.toISOString())}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-mono ${event.featured ? "text-[#00ff41]" : "text-[#333]"}`}>
                        {event.featured ? "Yes" : "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
