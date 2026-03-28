import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { ReviewForm } from "@/components/admin/ReviewForm"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Mail, ExternalLink, Github } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DemoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const demo = await prisma.demoRequest.findUnique({ where: { id } })
  if (!demo) notFound()

  const event = await prisma.event.findUnique({
    where: { id: demo.eventId },
    select: { title: true, slug: true },
  })

  return (
    <div>
      <AdminHeader title="Demo Request" />
      <div className="p-6 max-w-4xl space-y-4">
        {/* Back + Status */}
        <div className="flex items-center justify-between">
          <Link href="/admin/demos" className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to demo requests
          </Link>
          <StatusBadge status={demo.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Demo Details */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Demo Details</h2>
              <h1 className="text-base font-mono font-bold text-[#e0e0e0] mb-2">{demo.projectTitle}</h1>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#222] text-[#888]">
                  {demo.estimatedTime} min
                </span>
                {event && (
                  <Link
                    href={`/events/${event.slug}`}
                    className="text-[11px] font-mono text-[#00d4ff] hover:underline"
                  >
                    {event.title}
                  </Link>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Description</div>
                <p className="text-sm font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap">{demo.description}</p>
              </div>
            </div>

            {/* Links */}
            {(demo.demoUrl || demo.repoUrl) && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
                <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Links</h2>
                <div className="space-y-2">
                  {demo.demoUrl && (
                    <a href={demo.demoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#00d4ff] hover:underline">
                      <ExternalLink className="w-3 h-3" />
                      Live Demo
                    </a>
                  )}
                  {demo.repoUrl && (
                    <a href={demo.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#00d4ff] hover:underline">
                      <Github className="w-3 h-3" />
                      Repository
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Review Notes */}
            {demo.reviewNotes && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
                <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Review Notes</h2>
                <p className="text-sm font-mono text-[#888] leading-relaxed whitespace-pre-wrap">{demo.reviewNotes}</p>
                {demo.reviewedAt && (
                  <p className="text-[10px] font-mono text-[#444] mt-2">Reviewed on {formatDate(demo.reviewedAt.toISOString())}</p>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Contact */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Applicant</h2>
              <div className="space-y-2">
                <div className="text-sm font-mono font-semibold text-[#e0e0e0]">{demo.name}</div>
                <a href={`mailto:${demo.email}`} className="flex items-center gap-2 text-[11px] font-mono text-[#00d4ff] hover:underline">
                  <Mail className="w-3 h-3" />
                  {demo.email}
                </a>
              </div>
            </div>

            {/* Meta */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Metadata</h2>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-[#555]">Submitted</span>
                  <span className="text-[#888]">{formatDate(demo.createdAt.toISOString())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Status</span>
                  <StatusBadge status={demo.status} />
                </div>
                {demo.displayOrder !== null && (
                  <div className="flex justify-between">
                    <span className="text-[#555]">Display Order</span>
                    <span className="text-[#888]">{demo.displayOrder}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#555]">ID</span>
                  <span className="text-[#333] text-[10px]">{demo.id.slice(0, 12)}...</span>
                </div>
              </div>
            </div>

            {/* Review Actions */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Review</h2>
              <ReviewForm id={demo.id} currentStatus={demo.status} apiPath="/api/admin/demos" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
