import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { ReviewForm } from "@/components/admin/ReviewForm"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Mail, Phone, Linkedin, Github, Globe, ExternalLink, Twitter } from "lucide-react"

export const dynamic = "force-dynamic"

const ROLE_LABELS: Record<string, string> = {
  SOCIAL_MEDIA_MANAGER: "Social Media Manager",
  COMMUNITY_MANAGER: "Community Manager",
  CONTENT_CREATOR: "Content Creator",
  EVENT_COORDINATOR: "Event Coordinator",
}

const ROLE_COLORS: Record<string, string> = {
  SOCIAL_MEDIA_MANAGER: "#5865F2",
  COMMUNITY_MANAGER: "#25D366",
  CONTENT_CREATOR: "#ffb000",
  EVENT_COORDINATOR: "#00d4ff",
}

export default async function VolunteerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const app = await prisma.volunteerApplication.findUnique({ where: { id } })
  if (!app) notFound()

  const roleColor = ROLE_COLORS[app.role] ?? "#888"

  return (
    <div>
      <AdminHeader title="Volunteer Application" />
      <div className="p-6 max-w-4xl space-y-4">
        {/* Back + Status */}
        <div className="flex items-center justify-between">
          <Link href="/admin/volunteers" className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to volunteers
          </Link>
          <StatusBadge status={app.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Role & Availability */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Volunteer Details</h2>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-sm font-mono font-bold px-3 py-1 rounded"
                  style={{
                    color: roleColor,
                    backgroundColor: `${roleColor}15`,
                    border: `1px solid ${roleColor}30`,
                  }}
                >
                  {ROLE_LABELS[app.role] ?? app.role}
                </span>
                <span className="text-[11px] font-mono text-[#555]">
                  Availability: {app.availability}
                </span>
              </div>
            </div>

            {/* Experience */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Experience</h2>
              <p className="text-sm font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap">{app.experience}</p>
            </div>

            {/* Motivation */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Motivation</h2>
              <p className="text-sm font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap">{app.motivation}</p>
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
                  {app.twitter && (
                    <a href={app.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#666] hover:text-[#00d4ff] transition-colors">
                      <Twitter className="w-3 h-3" />
                      Twitter <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {app.portfolio && (
                    <a href={app.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#666] hover:text-[#00d4ff] transition-colors">
                      <Globe className="w-3 h-3" />
                      Portfolio <ExternalLink className="w-2.5 h-2.5" />
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
              <ReviewForm id={app.id} currentStatus={app.status} apiPath="/api/admin/volunteers" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
