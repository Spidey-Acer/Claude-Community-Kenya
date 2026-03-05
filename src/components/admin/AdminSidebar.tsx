"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Mic2,
  Lightbulb,
  Users,
  Calendar,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Terminal,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/speakers", label: "Speaker Apps", icon: Mic2 },
  { href: "/admin/ideas", label: "Idea Submissions", icon: Lightbulb },
  { href: "/admin/applications", label: "Join Applications", icon: Users },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/blog", label: "Blog Posts", icon: FileText },
  { href: "/admin/contact", label: "Contact Messages", icon: MessageSquare },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-64 min-h-screen bg-bg-secondary border-r border-border-default flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-border-default">
        <Link href="/admin" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded bg-green-primary/10 border border-green-primary/30 flex items-center justify-center">
            <Terminal className="w-4 h-4 text-green-primary" />
          </div>
          <div>
            <div className="text-xs font-mono font-bold text-green-primary leading-none">CCK</div>
            <div className="text-[10px] font-mono text-text-dim leading-none mt-0.5">Admin Panel</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-mono transition-all group",
                active
                  ? "bg-green-primary/10 text-green-primary border border-green-primary/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-card border border-transparent"
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-green-primary" : "text-current")} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 text-green-primary" />}
            </Link>
          )
        })}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-border-default">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-mono text-text-dim hover:text-red hover:bg-red/10 border border-transparent hover:border-red/20 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
        <Link
          href="/"
          className="mt-1 w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-mono text-text-dim hover:text-text-secondary transition-colors"
        >
          <span>← Back to site</span>
        </Link>
      </div>
    </aside>
  )
}
