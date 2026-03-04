import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { ChevronRight, Lightbulb } from "lucide-react"

export const dynamic = "force-dynamic"

const STAGE_LABELS: Record<string, string> = {
  IDEA: "Idea",
  MVP: "MVP",
  GROWING: "Growing",
}

export default async function IdeasPage() {
  const submissions = await prisma.ideaSubmission.findMany({
    orderBy: { createdAt: "desc" },
  })

  const counts = {
    total: submissions.length,
    pending: submissions.filter((s) => s.status === "PENDING").length,
    approved: submissions.filter((s) => s.status === "APPROVED").length,
    rejected: submissions.filter((s) => s.status === "REJECTED").length,
  }

  return (
    <div>
      <AdminHeader title="Idea Submissions" />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: counts.total, color: "#888" },
            { label: "Pending", value: counts.pending, color: "#ffb000" },
            { label: "Approved", value: counts.approved, color: "#00ff41" },
            { label: "Rejected", value: counts.rejected, color: "#ff3333" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded p-3">
              <div className="text-xl font-mono font-bold" style={{ color }}>{value}</div>
              <div className="text-[10px] font-mono text-[#555]">{label}</div>
            </div>
          ))}
        </div>

        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
          {submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Lightbulb className="w-8 h-8 text-[#333] mb-3" />
              <p className="text-sm font-mono text-[#555]">No idea submissions yet</p>
              <p className="text-xs font-mono text-[#333] mt-1">Submissions via /submit-idea will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Project</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Stage</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#111] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono text-[#e0e0e0]">{sub.title}</div>
                      <div className="text-[11px] font-mono text-[#444] max-w-[220px] truncate">{sub.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#666]">{STAGE_LABELS[sub.stage] ?? sub.stage}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[11px] font-mono text-[#888]">{sub.contactName}</div>
                      <div className="text-[10px] font-mono text-[#444]">{sub.contactEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#444]">{formatDate(sub.createdAt.toISOString())}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/ideas/${sub.id}`} className="text-[#444] hover:text-[#00ff41] transition-colors group-hover:text-[#00ff41]">
                        <ChevronRight className="w-4 h-4" />
                      </Link>
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
