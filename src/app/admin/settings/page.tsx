import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { SiteStatsEditor } from "@/components/admin/SiteStatsEditor"
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm"
import { AdminUserManager } from "@/components/admin/AdminUserManager"
import { Settings, ShieldAlert } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await auth()
  const sessionUser = session?.user as { role?: string } | undefined

  if (sessionUser?.role !== "SUPER_ADMIN") {
    redirect("/admin")
  }

  // Fetch site stats for the editor
  let siteStats = await prisma.siteSettings.findUnique({
    where: { id: "default" },
  })
  if (!siteStats) {
    siteStats = await prisma.siteSettings.create({
      data: {
        id: "default",
        discordMembers: 78,
        whatsappMembers: 96,
        linkedinMembers: 61,
        eventsHeld: 5,
        citiesActive: ["Nairobi", "Mombasa"],
        resourceCount: 33,
        websiteStatus: "live",
      },
    })
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
        {/* Community Stats Editor */}
        <SiteStatsEditor
          initialStats={{
            discordMembers: siteStats.discordMembers,
            whatsappMembers: siteStats.whatsappMembers,
            linkedinMembers: siteStats.linkedinMembers,
            eventsHeld: siteStats.eventsHeld,
            citiesActive: Array.isArray(siteStats.citiesActive)
              ? siteStats.citiesActive as string[]
              : JSON.parse(siteStats.citiesActive as string) as string[],
            resourceCount: siteStats.resourceCount,
            websiteStatus: siteStats.websiteStatus,
          }}
        />

        {/* Change Password */}
        <ChangePasswordForm />

        {/* Admin User Management */}
        <AdminUserManager
          initialUsers={users.map((u) => ({
            ...u,
            lastLogin: u.lastLogin?.toISOString() ?? null,
            createdAt: u.createdAt.toISOString(),
          }))}
          currentUserId={(session?.user as { id?: string })?.id ?? ""}
        />

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
