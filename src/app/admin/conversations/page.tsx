import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { AttachPageButton } from "@/components/admin/conversations/AttachPageButton"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { MessageSquare, Calendar, ArrowRight } from "lucide-react"

export const dynamic = "force-dynamic"

const TYPE_LABELS: Record<string, string> = {
  MEETUP: "Meetup",
  WORKSHOP: "Workshop",
  CAREER_TALK: "Career Talk",
  HACKATHON: "Hackathon",
  CONFERENCE: "Conference",
  CONVERSATIONS: "Conversations",
}

/**
 * Admin list of every event, with Conversations-page attach state and Q&A
 * session count. Any event can take a Q&A session (the Impact Lab event
 * uses one without ever attaching a Conversations page); only Conversations-
 * type events are expected to attach a page, but the flow doesn't enforce it.
 */
export default async function ConversationsAdminPage() {
  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
    select: {
      id: true,
      title: true,
      date: true,
      type: true,
      conversationsPage: { select: { id: true, result: true } },
      _count: { select: { questionSessions: true } },
    },
  })

  const sorted = [...events].sort((a, b) => {
    if (a.type === "CONVERSATIONS" && b.type !== "CONVERSATIONS") return -1
    if (a.type !== "CONVERSATIONS" && b.type === "CONVERSATIONS") return 1
    return 0
  })

  return (
    <div>
      <AdminHeader title="Conversations Live" />
      <div className="p-6 space-y-4">
        <p className="text-xs font-mono text-[#555]">
          Attach a Conversations page to run open participation for an event, or open a Q&amp;A
          session for any event without one.
        </p>

        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-x-auto">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="w-8 h-8 text-[#333] mb-3" />
              <p className="text-sm font-mono text-[#555]">No events yet</p>
            </div>
          ) : (
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Event</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Conversations Page</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Q&amp;A Sessions</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {sorted.map((event) => (
                  <tr key={event.id} className="hover:bg-[#111] transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono text-[#e0e0e0]">{event.title}</div>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-[#444] mt-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(event.date.toISOString())}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#222] text-[#888]">
                        {TYPE_LABELS[event.type] ?? event.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {event.conversationsPage ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41]">
                          {event.conversationsPage.result ? "Decided" : "Attached"}
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#333]/10 border border-[#333]/30 text-[#666]">
                          Not attached
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#666]">{event._count.questionSessions}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Manage always links through — the detail page tolerates a
                          missing ConversationsPage so Q&A-only events (e.g. Impact
                          Lab) can still open/close a session from here. */}
                      <div className="flex items-center justify-end gap-3">
                        {!event.conversationsPage && <AttachPageButton eventId={event.id} />}
                        <Link
                          href={`/admin/conversations/${event.id}`}
                          className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#00d4ff] hover:underline"
                        >
                          Manage
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
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
