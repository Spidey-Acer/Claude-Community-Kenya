import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { Mic2, Lightbulb, Users, MessageSquare, Calendar, FileText, Activity } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

async function getDashboardStats() {
  const [
    speakers,
    ideas,
    applications,
    messages,
    pendingSpeakers,
    pendingIdeas,
    pendingApplications,
    unreadMessages,
    recentSpeakers,
    recentIdeas,
    recentApplications,
    events,
    blogPosts,
  ] = await Promise.all([
    prisma.speakerApplication.count(),
    prisma.ideaSubmission.count(),
    prisma.joinApplication.count(),
    prisma.contactMessage.count(),
    prisma.speakerApplication.count({ where: { status: "PENDING" } }),
    prisma.ideaSubmission.count({ where: { status: "PENDING" } }),
    prisma.joinApplication.count({ where: { status: "PENDING" } }),
    prisma.contactMessage.count({ where: { status: "UNREAD" } }),
    prisma.speakerApplication.findMany({ orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.ideaSubmission.findMany({ orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.joinApplication.findMany({ orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.event.count(),
    prisma.blogPost.count(),
  ])
  return {
    speakers, ideas, applications, messages,
    pendingSpeakers, pendingIdeas, pendingApplications, unreadMessages,
    recentSpeakers, recentIdeas, recentApplications,
    events, blogPosts,
  }
}

export default async function AdminDashboard() {
  const session = await auth()
  const user = session?.user as { name?: string; role?: string } | undefined
  const stats = await getDashboardStats()

  const statCards = [
    { label: "Speaker Apps", value: stats.speakers, pending: stats.pendingSpeakers, href: "/admin/speakers", icon: Mic2, color: "#00ff41" },
    { label: "Idea Submissions", value: stats.ideas, pending: stats.pendingIdeas, href: "/admin/ideas", icon: Lightbulb, color: "#00d4ff" },
    { label: "Join Applications", value: stats.applications, pending: stats.pendingApplications, href: "/admin/applications", icon: Users, color: "#ffb000" },
    { label: "Contact Messages", value: stats.messages, pending: stats.unreadMessages, href: "/admin/contact", icon: MessageSquare, color: "#ff3333" },
  ]

  return (
    <div>
      <AdminHeader title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-[#00ff41]" />
            <span className="text-sm font-mono text-[#e0e0e0] font-semibold">
              Welcome back, {user?.name?.split(" ")[0] ?? "Admin"}
            </span>
          </div>
          <p className="text-xs font-mono text-[#555] pl-6">
            Here&apos;s what&apos;s waiting for your review.
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, pending, href, icon: Icon, color }) => (
            <Link
              key={label}
              href={href}
              className="bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-lg p-4 group transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                {pending > 0 && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>
                    {pending} new
                  </span>
                )}
              </div>
              <div className="text-2xl font-mono font-bold text-[#e0e0e0] group-hover:text-white transition-colors">{value}</div>
              <div className="text-[11px] font-mono text-[#555] mt-0.5">{label}</div>
            </Link>
          ))}
        </div>

        {/* Content Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/admin/events" className="bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-lg p-4 flex items-center gap-4 group transition-all">
            <div className="w-10 h-10 rounded bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#00d4ff]" />
            </div>
            <div>
              <div className="text-xl font-mono font-bold text-[#e0e0e0] group-hover:text-white transition-colors">{stats.events}</div>
              <div className="text-[11px] font-mono text-[#555]">Events</div>
            </div>
          </Link>
          <Link href="/admin/blog" className="bg-[#0d0d0d] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-lg p-4 flex items-center gap-4 group transition-all">
            <div className="w-10 h-10 rounded bg-[#ffb000]/10 border border-[#ffb000]/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#ffb000]" />
            </div>
            <div>
              <div className="text-xl font-mono font-bold text-[#e0e0e0] group-hover:text-white transition-colors">{stats.blogPosts}</div>
              <div className="text-[11px] font-mono text-[#555]">Blog Posts</div>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Speaker Apps */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-mono font-semibold text-[#888] uppercase tracking-wider">Recent Speaker Apps</h3>
              <Link href="/admin/speakers" className="text-[10px] font-mono text-[#00ff41] hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {stats.recentSpeakers.length === 0 && (
                <p className="text-[11px] font-mono text-[#444]">No applications yet</p>
              )}
              {stats.recentSpeakers.map((app) => (
                <Link key={app.id} href={`/admin/speakers/${app.id}`} className="flex items-start justify-between p-2 rounded hover:bg-[#161616] transition-colors">
                  <div className="min-w-0 mr-2">
                    <div className="text-xs font-mono text-[#ccc] truncate">{app.name}</div>
                    <div className="text-[10px] font-mono text-[#444] truncate">{app.topic}</div>
                  </div>
                  <div className="text-[9px] font-mono text-[#333] whitespace-nowrap">
                    {formatDate(app.createdAt.toISOString())}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Idea Submissions */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-mono font-semibold text-[#888] uppercase tracking-wider">Recent Ideas</h3>
              <Link href="/admin/ideas" className="text-[10px] font-mono text-[#00ff41] hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {stats.recentIdeas.length === 0 && (
                <p className="text-[11px] font-mono text-[#444]">No submissions yet</p>
              )}
              {stats.recentIdeas.map((idea) => (
                <Link key={idea.id} href={`/admin/ideas/${idea.id}`} className="flex items-start justify-between p-2 rounded hover:bg-[#161616] transition-colors">
                  <div className="min-w-0 mr-2">
                    <div className="text-xs font-mono text-[#ccc] truncate">{idea.title}</div>
                    <div className="text-[10px] font-mono text-[#444] truncate">{idea.stage}</div>
                  </div>
                  <div className="text-[9px] font-mono text-[#333] whitespace-nowrap">
                    {formatDate(idea.createdAt.toISOString())}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Join Applications */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-mono font-semibold text-[#888] uppercase tracking-wider">Recent Join Apps</h3>
              <Link href="/admin/applications" className="text-[10px] font-mono text-[#00ff41] hover:underline">View all</Link>
            </div>
            <div className="space-y-2">
              {stats.recentApplications.length === 0 && (
                <p className="text-[11px] font-mono text-[#444]">No applications yet</p>
              )}
              {stats.recentApplications.map((app) => (
                <Link key={app.id} href={`/admin/applications/${app.id}`} className="flex items-start justify-between p-2 rounded hover:bg-[#161616] transition-colors">
                  <div className="min-w-0 mr-2">
                    <div className="text-xs font-mono text-[#ccc] truncate">{app.name}</div>
                    <div className="text-[10px] font-mono text-[#444] truncate">{app.email}</div>
                  </div>
                  <div className="text-[9px] font-mono text-[#333] whitespace-nowrap">
                    {formatDate(app.createdAt.toISOString())}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
