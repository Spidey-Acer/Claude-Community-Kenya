import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { ReviewForm } from "@/components/admin/ReviewForm"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Mail, Github, ExternalLink } from "lucide-react"

export const dynamic = "force-dynamic"

const AUDIENCE_LABELS: Record<string, string> = {
  dev: "Developer",
  non_tech_pro: "Non-Tech Professional",
  student: "Student",
  founder: "Founder",
  creator: "Creator",
}

const INTENT_LABELS: Record<string, string> = {
  learn_basics: "Learn the basics",
  find_event: "Find an event",
  find_collaborators: "Find collaborators",
  build: "Build something",
  hire_or_partner: "Hire or partner",
  other: "Other",
}

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const app = await prisma.joinApplication.findUnique({ where: { id } })
  if (!app) notFound()

  const interests = Array.isArray(app.interests) ? (app.interests as string[]) : []

  return (
    <div>
      <AdminHeader title="Join Application" />
      <div className="p-6 max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/admin/applications" className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to applications
          </Link>
          <StatusBadge status={app.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Experience</h2>
              <p className="text-sm font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap">{app.experience}</p>
            </div>

            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Why They Want to Join</h2>
              <p className="text-sm font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap">{app.reason}</p>
            </div>

            {interests.length > 0 && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
                <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Interests</h2>
                <div className="flex flex-wrap gap-1.5">
                  {interests.map((interest) => (
                    <span key={interest} className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff]">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Applicant</h2>
              <div className="space-y-2">
                <div className="text-sm font-mono font-semibold text-[#e0e0e0]">{app.name}</div>
                <a href={`mailto:${app.email}`} className="flex items-center gap-2 text-[11px] font-mono text-[#00d4ff] hover:underline">
                  <Mail className="w-3 h-3" />
                  {app.email}
                </a>
                {app.github && (
                  <a href={app.github.startsWith("http") ? app.github : `https://github.com/${app.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#666] hover:text-[#00d4ff] transition-colors">
                    <Github className="w-3 h-3" />
                    {app.github} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {app.heardFrom && (
                  <div className="text-[11px] font-mono text-[#555] mt-2">
                    Heard from: <span className="text-[#888]">{app.heardFrom}</span>
                  </div>
                )}
              </div>
            </div>

            {app.karibuAudience && (
              <div className="bg-[#0d0d0d] border border-[#00ff41]/20 rounded-lg p-4">
                <h2 className="text-[11px] font-mono font-semibold text-[#00ff41]/70 uppercase tracking-wider mb-3">Karibu Context</h2>
                <div className="space-y-2">
                  <div>
                    <div className="text-[10px] font-mono text-[#555] mb-1">Audience</div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-[#00ff41]/30 text-[#00ff41] bg-[#00ff41]/5">
                      {AUDIENCE_LABELS[app.karibuAudience] ?? app.karibuAudience}
                    </span>
                  </div>
                  {app.karibuIntent && (
                    <div>
                      <div className="text-[10px] font-mono text-[#555] mb-1">Intent</div>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-[#00d4ff]/30 text-[#00d4ff] bg-[#00d4ff]/5">
                        {INTENT_LABELS[app.karibuIntent] ?? app.karibuIntent}
                      </span>
                    </div>
                  )}
                  {app.karibuSessionId && (
                    <div>
                      <div className="text-[10px] font-mono text-[#555] mb-1">Session ID</div>
                      <div className="text-[10px] font-mono text-[#444] break-all">{app.karibuSessionId}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

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
              </div>
            </div>

            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Review</h2>
              <ReviewForm id={app.id} currentStatus={app.status} apiPath="/api/admin/applications" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
