import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { ChevronRight, HandHeart } from "lucide-react"

export const dynamic = "force-dynamic"

const ROLE_LABELS: Record<string, string> = {
  SOCIAL_MEDIA_MANAGER: "Social Media",
  COMMUNITY_MANAGER: "Community Mgr",
  CONTENT_CREATOR: "Content Creator",
  EVENT_COORDINATOR: "Event Coordinator",
}

const ROLE_COLORS: Record<string, string> = {
  SOCIAL_MEDIA_MANAGER: "#5865F2",
  COMMUNITY_MANAGER: "#25D366",
  CONTENT_CREATOR: "#ffb000",
  EVENT_COORDINATOR: "#00d4ff",
}

export default async function VolunteersPage() {
  const applications = await prisma.volunteerApplication.findMany({
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
      <AdminHeader title="Volunteer Applications" />
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
              <HandHeart className="w-8 h-8 text-[#333] mb-3" />
              <p className="text-sm font-mono text-[#555]">No volunteer applications yet</p>
              <p className="text-xs font-mono text-[#333] mt-1">Applications submitted via /volunteer will appear here</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Applicant</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Availability</th>
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
                      <span
                        className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded"
                        style={{
                          color: ROLE_COLORS[app.role] ?? "#888",
                          backgroundColor: `${ROLE_COLORS[app.role] ?? "#888"}15`,
                          border: `1px solid ${ROLE_COLORS[app.role] ?? "#888"}30`,
                        }}
                      >
                        {ROLE_LABELS[app.role] ?? app.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#666]">{app.availability}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#444]">{formatDate(app.createdAt.toISOString())}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/volunteers/${app.id}`} className="text-[#444] hover:text-[#00ff41] transition-colors group-hover:text-[#00ff41]">
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
