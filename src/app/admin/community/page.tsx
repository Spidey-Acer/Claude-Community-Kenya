import { prisma } from "@/lib/prisma"
import { decodeHtmlEntities } from "@/lib/input-sanitization"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { formatDate } from "@/lib/utils"
import { MessageSquare } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

const TYPE_LABELS: Record<string, string> = {
  MCP: "MCP",
  PROMPT: "Prompt",
  WORKFLOW: "Workflow",
  TOOL: "Tool",
}

export default async function CommunityAdminPage() {
  const [submissions, pendingCount] = await Promise.all([
    prisma.communitySubmission.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { comments: true } } },
    }),
    prisma.communitySubmission.count({ where: { status: "PENDING" } }),
  ])

  return (
    <div>
      <AdminHeader title="Community Hub" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-xs font-mono text-[#555]">{submissions.length} submissions total</p>
            {pendingCount > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ffb000]/10 border border-[#ffb000]/30 text-[#ffb000]">
                {pendingCount} pending review
              </span>
            )}
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
          {submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="w-8 h-8 text-[#333] mb-3" />
              <p className="text-sm font-mono text-[#555]">No submissions found</p>
              <p className="text-xs font-mono text-[#333] mt-1">Community submissions will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Submitter</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Upvotes</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Comments</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-[#111] transition-colors cursor-pointer group">
                    <td className="px-4 py-3">
                      <Link href={`/admin/community/${submission.id}`} className="block">
                        <div className="text-sm font-mono text-[#e0e0e0] group-hover:text-[#00ff41] transition-colors">{decodeHtmlEntities(submission.title)}</div>
                        <div className="text-[11px] font-mono text-[#444] truncate max-w-xs">{decodeHtmlEntities(submission.shortDescription)}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/community/${submission.id}`} className="block">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#222] text-[#888]">
                          {TYPE_LABELS[submission.type] ?? submission.type}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/community/${submission.id}`} className="block text-[11px] font-mono text-[#666]">{submission.submitterName ? decodeHtmlEntities(submission.submitterName) : submission.submitterName}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/community/${submission.id}`} className="block">
                        <StatusBadge status={submission.status} />
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/community/${submission.id}`} className="block text-[11px] font-mono text-[#666]">{submission.upvoteCount}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/community/${submission.id}`} className="block text-[11px] font-mono text-[#666]">{submission._count.comments}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/community/${submission.id}`} className="block text-[11px] font-mono text-[#444]">{formatDate(submission.createdAt.toISOString())}</Link>
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
