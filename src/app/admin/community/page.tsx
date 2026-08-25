import { prisma } from "@/lib/prisma"
import { decodeHtmlEntities } from "@/lib/input-sanitization"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { formatDate } from "@/lib/utils"
import { NEED_LABELS, type NeedKey } from "@/lib/showcase/constants"
import { MessageSquare, Calendar } from "lucide-react"
import Link from "next/link"
import type { CommunityResourceType } from "@/generated/prisma/client"

export const dynamic = "force-dynamic"

const TYPE_LABELS: Record<string, string> = {
  MCP: "MCP",
  PROMPT: "Prompt",
  WORKFLOW: "Workflow",
  TOOL: "Tool",
  SHOWCASE: "Showcase",
}

interface SearchParams {
  type?: string
}

export default async function CommunityAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { type: rawTypeFilter } = await searchParams
  // Validate against the known set before it reaches Prisma — an unrecognised
  // value would otherwise throw at query time and 500 the page.
  const typeFilter = rawTypeFilter && rawTypeFilter in TYPE_LABELS ? (rawTypeFilter as CommunityResourceType) : undefined

  const [submissions, pendingCount] = await Promise.all([
    prisma.communitySubmission.findMany({
      where: typeFilter ? { type: typeFilter } : undefined,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { comments: true } }, event: { select: { title: true } } },
    }),
    prisma.communitySubmission.count({ where: { status: "PENDING" } }),
  ])

  return (
    <div>
      <AdminHeader title="Community Hub" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <p className="text-xs font-mono text-[#555]">{submissions.length} submissions total</p>
            {pendingCount > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ffb000]/10 border border-[#ffb000]/30 text-[#ffb000]">
                {pendingCount} pending review
              </span>
            )}
          </div>
          {/*
            No onChange here — this is a Server Component, and React refuses to
            serialise an event handler onto a DOM element from one. See the
            identical note in admin/photos/page.tsx.
          */}
          <form method="GET" className="flex items-center gap-2">
            <select
              name="type"
              defaultValue={typeFilter ?? ""}
              className="bg-[#111] border border-[#1e1e1e] rounded px-2 py-1.5 text-[11px] font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50"
            >
              <option value="">All types</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              type="submit"
              className="px-2 py-1.5 text-[11px] font-mono text-[#555] border border-[#1e1e1e] rounded hover:text-[#ccc] transition-colors"
            >
              Filter
            </button>
            {typeFilter && (
              <Link href="/admin/community" className="text-[11px] font-mono text-[#555] hover:text-[#ccc] transition-colors">
                Clear
              </Link>
            )}
          </form>
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
                {submissions.map((submission) => {
                  const needs = submission.type === "SHOWCASE" ? ((submission.needs as string[] | null) ?? []) : []
                  return (
                  <tr key={submission.id} className="hover:bg-[#111] transition-colors cursor-pointer group">
                    <td className="px-4 py-3">
                      <Link href={`/admin/community/${submission.id}`} className="flex items-start gap-3">
                        {submission.coverImageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail, not a page asset next/image needs to optimise
                          <img
                            src={submission.coverImageUrl}
                            alt=""
                            className="w-10 h-10 rounded object-cover bg-[#1a1a1a] border border-[#222] shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-mono text-[#e0e0e0] group-hover:text-[#00ff41] transition-colors">{decodeHtmlEntities(submission.title)}</div>
                          <div className="text-[11px] font-mono text-[#444] truncate max-w-xs">{decodeHtmlEntities(submission.shortDescription)}</div>
                          {submission.event && (
                            <div className="flex items-center gap-1 text-[10px] font-mono text-[#00d4ff] mt-1">
                              <Calendar className="w-3 h-3" />
                              {decodeHtmlEntities(submission.event.title)}
                            </div>
                          )}
                          {needs.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {needs.map((need) => (
                                <span key={need} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#ffb000]/10 border border-[#ffb000]/30 text-[#ffb000]">
                                  {NEED_LABELS[need as NeedKey] ?? need}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
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
