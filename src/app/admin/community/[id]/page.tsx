import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { CommunityActions } from "@/components/admin/CommunityActions"
import { CommentActions } from "@/components/admin/CommentActions"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Edit, ExternalLink, Tag } from "lucide-react"

export const dynamic = "force-dynamic"

const TYPE_LABELS: Record<string, string> = {
  MCP: "MCP",
  PROMPT: "Prompt",
  WORKFLOW: "Workflow",
  TOOL: "Tool",
}

export default async function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const submission = await prisma.communitySubmission.findUnique({
    where: { id },
    include: {
      comments: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!submission) notFound()

  const tags = (submission.tags as string[] | null) ?? []

  return (
    <div>
      <AdminHeader title="Submission Details" />
      <div className="p-6 max-w-4xl space-y-4">
        {/* Back + Status */}
        <div className="flex items-center justify-between">
          <Link href="/admin/community" className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to community
          </Link>
          <StatusBadge status={submission.status} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Submission Info */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Submission Info</h2>
              <h1 className="text-base font-mono font-bold text-[#e0e0e0] mb-2">{submission.title}</h1>
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#222] text-[#888]">
                  {TYPE_LABELS[submission.type] ?? submission.type}
                </span>
                <span className="text-[11px] font-mono text-[#555]">
                  by {submission.submitterName}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Short Description</div>
                <p className="text-sm font-mono text-[#aaa] leading-relaxed">{submission.shortDescription}</p>
              </div>
              {submission.fullDescription && (
                <div className="space-y-1.5 mt-4">
                  <div className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Full Description</div>
                  <p className="text-sm font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap">{submission.fullDescription}</p>
                </div>
              )}
            </div>

            {/* Install Instructions */}
            {submission.installInstructions && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
                <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Install Instructions</h2>
                <pre className="text-sm font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap bg-[#111] border border-[#1a1a1a] rounded p-3">{submission.installInstructions}</pre>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
                <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded bg-[#1a1a1a] border border-[#222] text-[#888]">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Review Notes */}
            {submission.reviewNotes && (
              <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
                <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Review Notes</h2>
                <p className="text-sm font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap">{submission.reviewNotes}</p>
              </div>
            )}

            {/* Comments */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">
                Comments ({submission.comments.length})
              </h2>
              {submission.comments.length === 0 ? (
                <p className="text-xs font-mono text-[#333]">No comments yet</p>
              ) : (
                <div className="space-y-3">
                  {submission.comments.map((comment) => (
                    <div key={comment.id} className="bg-[#111] border border-[#1a1a1a] rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[11px] font-mono text-[#ccc] font-semibold">{comment.authorName}</span>
                          <span className="text-[10px] font-mono text-[#444] ml-2">{formatDate(comment.createdAt.toISOString())}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={comment.status} />
                          <CommentActions
                            commentId={comment.id}
                            submissionId={submission.id}
                            currentStatus={comment.status}
                          />
                        </div>
                      </div>
                      <p className="text-xs font-mono text-[#aaa] leading-relaxed">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Actions */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Actions</h2>
              <div className="space-y-2">
                <Link
                  href={`/admin/community/${submission.id}/edit`}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/30 rounded text-[11px] font-mono font-semibold text-[#00d4ff] transition-all"
                >
                  <Edit className="w-3 h-3" />
                  Edit Submission
                </Link>
                <CommunityActions id={submission.id} title={submission.title} currentStatus={submission.status} />
              </div>
            </div>

            {/* Links */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Links</h2>
              <div className="space-y-2">
                {submission.url && (
                  <a href={submission.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#00d4ff] hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    Project URL
                  </a>
                )}
                {submission.repoUrl && (
                  <a href={submission.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] font-mono text-[#00d4ff] hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    Repository
                  </a>
                )}
              </div>
              {!submission.url && !submission.repoUrl && (
                <p className="text-[11px] font-mono text-[#333]">No links provided</p>
              )}
            </div>

            {/* Submitter Info (admin only) */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Submitter</h2>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-[#555]">Name</span>
                  <span className="text-[#888]">{submission.submitterName}</span>
                </div>
                {submission.submitterContact && (
                  <div className="flex justify-between">
                    <span className="text-[#555]">Contact</span>
                    <span className="text-[#888]">{submission.submitterContact}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Metadata</h2>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-[#555]">Status</span>
                  <StatusBadge status={submission.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Type</span>
                  <span className="text-[#888]">{TYPE_LABELS[submission.type] ?? submission.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Upvotes</span>
                  <span className="text-[#888]">{submission.upvoteCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Created</span>
                  <span className="text-[#888]">{formatDate(submission.createdAt.toISOString())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Updated</span>
                  <span className="text-[#888]">{formatDate(submission.updatedAt.toISOString())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">ID</span>
                  <span className="text-[#333] text-[10px]">{submission.id.slice(0, 12)}...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
