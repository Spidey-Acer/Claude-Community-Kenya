import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { Users, Plus, CheckCircle2, XCircle } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function TeamAdminPage() {
  const members = await prisma.teamMember.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true, active: true, order: true, avatar: true, createdAt: true },
  })

  return (
    <div>
      <AdminHeader title="Team Members" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono text-[#555]">{members.length} members total</p>
          <Link
            href="/admin/team/new"
            className="flex items-center gap-2 px-3 py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41] hover:bg-[#00ff41]/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Member
          </Link>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-x-auto">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-8 h-8 text-[#333] mb-3" />
              <p className="text-sm font-mono text-[#555]">No team members yet</p>
              <p className="text-xs font-mono text-[#333] mt-1">Add your first team member to get started.</p>
            </div>
          ) : (
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Order</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Active</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-[#111] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {m.avatar ? (
                          <img src={m.avatar} alt={m.name} className="h-7 w-7 rounded-full object-cover bg-[#1a1a1a]" />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[10px] font-mono text-[#555]">
                            {m.name[0]}
                          </div>
                        )}
                        <span className="text-sm font-mono text-[#ccc]">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#888]">{m.role}</td>
                    <td className="px-4 py-3 text-xs font-mono text-[#555]">{m.order}</td>
                    <td className="px-4 py-3">
                      {m.active
                        ? <CheckCircle2 className="w-4 h-4 text-[#00ff41]" />
                        : <XCircle className="w-4 h-4 text-[#555]" />}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/team/${m.id}`}
                        className="text-[11px] font-mono text-[#00ff41] hover:underline"
                      >
                        Edit →
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
