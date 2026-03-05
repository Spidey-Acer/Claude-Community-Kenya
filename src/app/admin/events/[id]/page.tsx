import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Edit, ExternalLink, Calendar, MapPin, Clock, Users } from "lucide-react"
import { DeleteEventButton } from "@/components/admin/DeleteEventButton"

export const dynamic = "force-dynamic"

const TYPE_LABELS: Record<string, string> = {
  MEETUP: "Meetup",
  WORKSHOP: "Workshop",
  CAREER_TALK: "Career Talk",
  HACKATHON: "Hackathon",
  CONFERENCE: "Conference",
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) notFound()

  const highlights = (event.highlights as string[] | null) ?? []
  const agenda = (event.agenda as string[] | null) ?? []
  const prizes = (event.prizes as string[] | null) ?? []
  const rules = (event.rules as string[] | null) ?? []

  return (
    <div>
      <AdminHeader title="Event Details" />
      <div className="p-6 max-w-4xl space-y-4">
        {/* Back + Status */}
        <div className="flex items-center justify-between">
          <Link href="/admin/events" className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to events
          </Link>
          <div className="flex items-center gap-2">
            <StatusBadge status={event.status} />
            {event.featured && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41]">
                Featured
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Event Info */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Event Info</h2>
              <h1 className="text-base font-mono font-bold text-[#e0e0e0] mb-2">{event.title}</h1>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#222] text-[#888]">
                  {TYPE_LABELS[event.type] ?? event.type}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-[#555]">
                  <MapPin className="w-3 h-3" />
                  {event.venue}, {event.city}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-[#555]">
                  <Calendar className="w-3 h-3" />
                  {formatDate(event.date.toISOString())}
                </span>
                <span className="flex items-center gap-1 text-[11px] font-mono text-[#555]">
                  <Clock className="w-3 h-3" />
                  {event.time}
                </span>
                {event.attendeeCount !== null && (
                  <span className="flex items-center gap-1 text-[11px] font-mono text-[#555]">
                    <Users className="w-3 h-3" />
                    {event.attendeeCount} attendees
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Description</div>
                <p className="text-sm font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
              {event.fullDescription && (
                <div className="space-y-1.5 mt-4">
                  <div className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Full Description</div>
                  <p className="text-sm font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap">{event.fullDescription}</p>
                </div>
              )}
            </div>

            {/* Agenda */}
            {agenda.length > 0 && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
                <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Agenda</h2>
                <ol className="space-y-2 list-decimal list-inside">
                  {agenda.map((item, i) => (
                    <li key={i} className="text-sm font-mono text-[#aaa] leading-relaxed">{item}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Highlights */}
            {highlights.length > 0 && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
                <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Highlights</h2>
                <div className="flex flex-wrap gap-2">
                  {highlights.map((item, i) => (
                    <span key={i} className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#1a1a1a] border border-[#222] text-[#888]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Prizes */}
            {prizes.length > 0 && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
                <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Prizes</h2>
                <ul className="space-y-1.5">
                  {prizes.map((item, i) => (
                    <li key={i} className="text-sm font-mono text-[#aaa] leading-relaxed flex items-start gap-2">
                      <span className="text-[#00ff41] mt-0.5">&#x2022;</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Rules */}
            {rules.length > 0 && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
                <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Rules</h2>
                <ol className="space-y-1.5 list-decimal list-inside">
                  {rules.map((item, i) => (
                    <li key={i} className="text-sm font-mono text-[#aaa] leading-relaxed">{item}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Actions */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Actions</h2>
              <div className="space-y-2">
                <Link
                  href={`/admin/events/${event.id}/edit`}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/30 rounded text-[11px] font-mono font-semibold text-[#00d4ff] transition-all"
                >
                  <Edit className="w-3 h-3" />
                  Edit Event
                </Link>
                <DeleteEventButton id={event.id} title={event.title} />
              </div>
            </div>

            {/* Links */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Links</h2>
              <div className="space-y-2">
                {event.registrationUrl && (
                  <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#00d4ff] hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    Registration
                  </a>
                )}
                {event.lumaUrl && (
                  <a href={event.lumaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#00d4ff] hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    Luma Page
                  </a>
                )}
                {event.photosUrl && (
                  <a href={event.photosUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#00d4ff] hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    Photos
                  </a>
                )}
                <Link href={`/events/${event.slug}`} className="flex items-center gap-2 text-[11px] font-mono text-[#666] hover:text-[#00d4ff] transition-colors">
                  <ExternalLink className="w-3 h-3" />
                  Public page
                </Link>
              </div>
            </div>

            {/* Meta */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Metadata</h2>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-[#555]">Status</span>
                  <StatusBadge status={event.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Type</span>
                  <span className="text-[#888]">{TYPE_LABELS[event.type] ?? event.type}</span>
                </div>
                {event.host && (
                  <div className="flex justify-between">
                    <span className="text-[#555]">Host</span>
                    <span className="text-[#888]">{event.host}</span>
                  </div>
                )}
                {event.partnerOrg && (
                  <div className="flex justify-between">
                    <span className="text-[#555]">Partner</span>
                    <span className="text-[#888]">{event.partnerOrg}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#555]">Slug</span>
                  <span className="text-[#333] text-[10px]">{event.slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Created</span>
                  <span className="text-[#888]">{formatDate(event.createdAt.toISOString())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Updated</span>
                  <span className="text-[#888]">{formatDate(event.updatedAt.toISOString())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">ID</span>
                  <span className="text-[#333] text-[10px]">{event.id.slice(0, 12)}...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
