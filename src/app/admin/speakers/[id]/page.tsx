import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { ReviewForm } from "@/components/admin/ReviewForm"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Mail, Phone, Linkedin, Github, Globe, ExternalLink } from "lucide-react"

export const dynamic = "force-dynamic"

const CATEGORY_LABELS: Record<string, string> = {
  FINTECH: "Fintech",
  TECHNICAL: "Technical",
  CAREER: "Career / Community",
  LIVE_DEMO: "Live Demo",
  OTHER: "Other",
}

export default async function SpeakerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const app = await prisma.speakerApplication.findUnique({ where: { id } })
  if (!app) notFound()

  return (
    <div>
      <AdminHeader title="Speaker Application" />
      <div className="p-6 max-w-4xl space-y-4">
        {/* Back + Status */}
        <div className="flex items-center justify-between">
          <Link href="/admin/speakers" className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to applications
          </Link>
          <StatusBadge status={app.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Talk Details */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Talk Details</h2>
              <h1 className="text-base font-mono font-bold text-[#e0e0e0] mb-2">{app.topic}</h1>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#222] text-[#888]">
                  {CATEGORY_LABELS[app.category] ?? app.category}
                </span>
                {app.preferredEvent && (
                  <span className="text-[11px] font-mono text-[#555]">Preferred: {app.preferredEvent}</span>
                )}
                {app.preferredCity && (
                  <span className="text-[11px] font-mono text-[#555]">City: {app.preferredCity}</span>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Abstract</div>
                <p className="text-sm font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap">{app.abstract}</p>
              </div>
            </div>

            {/* Bio */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Speaker Bio</h2>
              <p className="text-sm font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap">{app.bio}</p>
            </div>

            {/* Review Notes (if any) */}
            {app.reviewNotes && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
                <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Review Notes</h2>
                <p className="text-sm font-mono text-[#888] leading-relaxed whitespace-pre-wrap">{app.reviewNotes}</p>
                {app.reviewedAt && (
                  <p className="text-[10px] font-mono text-[#444] mt-2">Reviewed on {formatDate(app.reviewedAt.toISOString())}</p>
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
                <div className="text-sm font-mono font-semibold text-[#e0e0e0]">{app.name}</div>
                <a href={`mailto:${app.email}`} className="flex items-center gap-2 text-[11px] font-mono text-[#00d4ff] hover:underline">
                  <Mail className="w-3 h-3" />
                  {app.email}
                </a>
                {app.phone && (
                  <div className="flex items-center gap-2 text-[11px] font-mono text-[#666]">
                    <Phone className="w-3 h-3" />
                    {app.phone}
                  </div>
                )}
                <div className="pt-1 space-y-1.5">
                  {app.linkedIn && (
                    <a href={app.linkedIn} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#666] hover:text-[#00d4ff] transition-colors">
                      <Linkedin className="w-3 h-3" />
                      LinkedIn <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {app.github && (
                    <a href={app.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#666] hover:text-[#00d4ff] transition-colors">
                      <Github className="w-3 h-3" />
                      GitHub <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {app.portfolio && (
                    <a href={app.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#666] hover:text-[#00d4ff] transition-colors">
                      <Globe className="w-3 h-3" />
                      Portfolio <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {app.website && (
                    <a href={app.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#666] hover:text-[#00d4ff] transition-colors">
                      <Globe className="w-3 h-3" />
                      Website <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Meta */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Metadata</h2>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-[#555]">Submitted</span>
                  <span className="text-[#888]">{formatDate(app.createdAt.toISOString())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Status</span>
                  <StatusBadge status={app.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">ID</span>
                  <span className="text-[#333] text-[10px]">{app.id.slice(0, 12)}...</span>
                </div>
              </div>
            </div>

            {/* Review Actions */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Review</h2>
              <ReviewForm id={app.id} currentStatus={app.status} apiPath="/api/admin/speakers" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
