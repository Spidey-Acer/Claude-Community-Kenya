import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { ChevronRight, Mic2 } from "lucide-react"

export const dynamic = "force-dynamic"

const CATEGORY_LABELS: Record<string, string> = {
  FINTECH: "Fintech",
  TECHNICAL: "Technical",
  CAREER: "Career",
  LIVE_DEMO: "Live Demo",
  OTHER: "Other",
}

export default async function SpeakersPage() {
  const applications = await prisma.speakerApplication.findMany({
    orderBy: { createdAt: "desc" },
  })

  const counts = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "PENDING").length,
    approved: applications.filter((a) => a.status === "APPROVED").length,
    rejected: applications.filter((a) => a.status === "REJECTED").length,
  }

  return (
    <div>
      <AdminHeader title="Speaker Applications" />
      <div className="p-6 space-y-4">
        {/* Summary */}
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

        {/* Table */}
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
          {applications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Mic2 className="w-8 h-8 text-[#333] mb-3" />
              <p className="text-sm font-mono text-[#555]">No speaker applications yet</p>
              <p className="text-xs font-mono text-[#333] mt-1">Applications submitted via /speak will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Applicant</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Topic</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-[#111] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono text-[#e0e0e0]">{app.name}</div>
                      <div className="text-[11px] font-mono text-[#444]">{app.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono text-[#aaa] max-w-[220px] truncate">{app.topic}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#666]">{CATEGORY_LABELS[app.category] ?? app.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#444]">{formatDate(app.createdAt.toISOString())}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/speakers/${app.id}`} className="text-[#444] hover:text-[#00ff41] transition-colors group-hover:text-[#00ff41]">
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
