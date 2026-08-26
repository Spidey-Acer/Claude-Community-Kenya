import { prisma } from "@/lib/prisma"
import { decodeHtmlEntities } from "@/lib/input-sanitization"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { ReportActions } from "@/components/admin/ReportActions"
import { formatDate } from "@/lib/utils"
import { ShieldAlert } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

const TARGET_LABELS: Record<string, string> = {
  SUBMISSION: "Submission",
  COMMENT: "Comment",
  UPDATE: "Update",
}

const REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  ABUSE: "Abuse",
  OFF_TOPIC: "Off-topic",
  PLAGIARISM: "Plagiarism",
  OTHER: "Other",
}

/**
 * Admin queue of OPEN content reports.
 *
 * Resolves each report's target to a link into the existing community admin
 * pages rather than the public site — a moderator acting on a report needs
 * the moderation controls (approve/reject/delete), not the public read view.
 * SUBMISSION reports link straight to the submission; COMMENT reports are
 * resolved to their parent submission (comments have no page of their own).
 * UPDATE reports are unlinked — ShowcaseUpdate is a Phase 2 model that
 * doesn't exist yet, so no UPDATE report can be filed in Phase 1.
 */
export default async function ReportsAdminPage() {
  const reports = await prisma.contentReport.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    include: { reporter: { select: { firstName: true, lastName: true } } },
  })

  const submissionIds = reports.filter(r => r.targetType === "SUBMISSION").map(r => r.targetId)
  const commentIds = reports.filter(r => r.targetType === "COMMENT").map(r => r.targetId)

  const [submissions, comments] = await Promise.all([
    submissionIds.length
      ? prisma.communitySubmission.findMany({
          where: { id: { in: submissionIds } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
    commentIds.length
      ? prisma.communityComment.findMany({
          where: { id: { in: commentIds } },
          select: { id: true, submissionId: true, content: true },
        })
      : Promise.resolve([]),
  ])

  const submissionById = new Map(submissions.map(s => [s.id, s]))
  const commentById = new Map(comments.map(c => [c.id, c]))

  function targetLink(report: (typeof reports)[number]): { label: string; href: string | null } {
    if (report.targetType === "SUBMISSION") {
      const submission = submissionById.get(report.targetId)
      return submission
        ? { label: decodeHtmlEntities(submission.title), href: `/admin/community/${submission.id}` }
        : { label: "Submission (deleted)", href: null }
    }
    if (report.targetType === "COMMENT") {
      const comment = commentById.get(report.targetId)
      return comment
        ? { label: decodeHtmlEntities(comment.content).slice(0, 60), href: `/admin/community/${comment.submissionId}` }
        : { label: "Comment (deleted)", href: null }
    }
    return { label: "Showcase update", href: null }
  }

  return (
    <div>
      <AdminHeader title="Reports" />
      <div className="p-6 space-y-4">
        <p className="text-xs font-mono text-[#555]">{reports.length} open report{reports.length !== 1 ? "s" : ""}</p>

        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-x-auto">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldAlert className="w-8 h-8 text-[#333] mb-3" />
              <p className="text-sm font-mono text-[#555]">No open reports</p>
              <p className="text-xs font-mono text-[#333] mt-1">Flagged content will appear here</p>
            </div>
          ) : (
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Target</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Content</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Reason</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Detail</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Reporter</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Resolve</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {reports.map((report) => {
                  const target = targetLink(report)
                  const reporterName = report.reporter
                    ? decodeHtmlEntities(`${report.reporter.firstName} ${report.reporter.lastName}`)
                    : "Anonymous"
                  return (
                    <tr key={report.id} className="hover:bg-[#111] transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#222] text-[#888]">
                          {TARGET_LABELS[report.targetType] ?? report.targetType}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {target.href ? (
                          <Link href={target.href} className="text-[11px] font-mono text-[#00d4ff] hover:underline truncate block">
                            {target.label}
                          </Link>
                        ) : (
                          <span className="text-[11px] font-mono text-[#444]">{target.label}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#ff3333]/10 border border-[#ff3333]/30 text-[#ff3333]">
                          {REASON_LABELS[report.reason] ?? report.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="text-[11px] font-mono text-[#888] truncate block" title={report.detail ?? undefined}>
                          {report.detail ? decodeHtmlEntities(report.detail) : <span className="text-[#444]">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-[#666]">{reporterName}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-[#444]">{formatDate(report.createdAt.toISOString())}</td>
                      <td className="px-4 py-3">
                        <ReportActions id={report.id} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
