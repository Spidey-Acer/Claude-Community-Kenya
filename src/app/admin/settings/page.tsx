import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { formatDate } from "@/lib/utils"
import { Settings, Users, ShieldAlert } from "lucide-react"

export const dynamic = "force-dynamic"

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MODERATOR: "Moderator",
  MEMBER: "Member",
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "text-[#ff3333]",
  ADMIN: "text-[#ffb000]",
  MODERATOR: "text-[#00d4ff]",
  MEMBER: "text-[#888]",
}

export default async function SettingsPage() {
  const session = await auth()
  const sessionUser = session?.user as { role?: string } | undefined

  if (sessionUser?.role !== "SUPER_ADMIN") {
    redirect("/admin")
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      active: true,
      emailVerified: true,
      lastLogin: true,
      createdAt: true,
    },
  })

  return (
    <div>
      <AdminHeader title="Settings" />
      <div className="p-6 space-y-6">
        {/* Users Table */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[#00ff41]" />
            <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Admin Users</h2>
          </div>

          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Last Login</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#111] transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono text-[#e0e0e0]">{user.firstName} {user.lastName}</div>
                      <div className="text-[11px] font-mono text-[#444]">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-mono font-semibold ${ROLE_COLORS[user.role] ?? "text-[#888]"}`}>
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.active ? "APPROVED" : "REJECTED"} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#444]">
                        {user.lastLogin ? formatDate(user.lastLogin.toISOString()) : "Never"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#444]">{formatDate(user.createdAt.toISOString())}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Info */}
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-[#ffb000]" />
            <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Security</h2>
          </div>
          <div className="space-y-2 text-[11px] font-mono text-[#666]">
            <div className="flex items-center gap-2">
              <Settings className="w-3 h-3 text-[#00ff41]" />
              <span>Sessions expire after 24 hours (JWT strategy)</span>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="w-3 h-3 text-[#00ff41]" />
              <span>All admin actions are recorded in the audit log</span>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="w-3 h-3 text-[#00ff41]" />
              <span>CSRF protection enabled on all mutation endpoints</span>
            </div>
            <div className="flex items-center gap-2">
              <Settings className="w-3 h-3 text-[#00ff41]" />
              <span>Rate limiting enforced via Upstash Redis</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
