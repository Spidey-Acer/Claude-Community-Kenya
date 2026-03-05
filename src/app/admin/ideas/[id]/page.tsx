import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { ReviewForm } from "@/components/admin/ReviewForm"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Mail, Linkedin, Github, Globe, ExternalLink } from "lucide-react"

export const dynamic = "force-dynamic"

const STAGE_LABELS: Record<string, string> = { IDEA: "Idea", MVP: "MVP", GROWING: "Growing" }

export default async function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sub = await prisma.ideaSubmission.findUnique({ where: { id } })
  if (!sub) notFound()

  const seekingRoles = Array.isArray(sub.seekingRoles) ? (sub.seekingRoles as string[]) : []
  const techStack = sub.techStack && Array.isArray(sub.techStack) ? (sub.techStack as string[]) : []

  return (
    <div>
      <AdminHeader title="Idea Submission" />
      <div className="p-6 max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <Link href="/admin/ideas" className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to submissions
          </Link>
          <StatusBadge status={sub.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Project Details</h2>
              <h1 className="text-base font-mono font-bold text-[#e0e0e0] mb-2">{sub.title}</h1>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#222] text-[#888]">
                  {STAGE_LABELS[sub.stage] ?? sub.stage}
                </span>
                {sub.timeline && <span className="text-[11px] font-mono text-[#555]">Timeline: {sub.timeline}</span>}
              </div>
              <p className="text-sm font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap">{sub.description}</p>
            </div>

            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Seeking</h2>
              <div className="flex flex-wrap gap-1.5">
                {seekingRoles.map((role) => (
                  <span key={role} className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#00ff41]/10 border border-[#00ff41]/20 text-[#00ff41]">
                    {role}
                  </span>
                ))}
              </div>
              {techStack.length > 0 && (
                <div className="mt-4">
                  <div className="text-[11px] font-mono text-[#555] mb-2">Tech Stack</div>
                  <div className="flex flex-wrap gap-1.5">
                    {techStack.map((tech) => (
                      <span key={tech} className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#222] text-[#888]">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {sub.reviewNotes && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
                <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Review Notes</h2>
                <p className="text-sm font-mono text-[#888] leading-relaxed whitespace-pre-wrap">{sub.reviewNotes}</p>
                {sub.reviewedAt && <p className="text-[10px] font-mono text-[#444] mt-2">Reviewed on {formatDate(sub.reviewedAt.toISOString())}</p>}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Contact</h2>
              <div className="space-y-2">
                <div className="text-sm font-mono font-semibold text-[#e0e0e0]">{sub.contactName}</div>
                <a href={`mailto:${sub.contactEmail}`} className="flex items-center gap-2 text-[11px] font-mono text-[#00d4ff] hover:underline">
                  <Mail className="w-3 h-3" />
                  {sub.contactEmail}
                </a>
                <div className="pt-1 space-y-1.5">
                  {sub.linkedIn && (
                    <a href={sub.linkedIn} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#666] hover:text-[#00d4ff] transition-colors">
                      <Linkedin className="w-3 h-3" /> LinkedIn <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {sub.github && (
                    <a href={sub.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#666] hover:text-[#00d4ff] transition-colors">
                      <Github className="w-3 h-3" /> GitHub <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {sub.website && (
                    <a href={sub.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#666] hover:text-[#00d4ff] transition-colors">
                      <Globe className="w-3 h-3" /> Website <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Metadata</h2>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-[#555]">Submitted</span>
                  <span className="text-[#888]">{formatDate(sub.createdAt.toISOString())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Status</span>
                  <StatusBadge status={sub.status} />
                </div>
              </div>
            </div>

            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Review</h2>
              <ReviewForm id={sub.id} currentStatus={sub.status} apiPath="/api/admin/ideas" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
