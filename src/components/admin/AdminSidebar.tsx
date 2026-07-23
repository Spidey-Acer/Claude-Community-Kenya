"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Mic2,
  Presentation,
  Lightbulb,
  Users,
  HandHeart,
  Calendar,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  Terminal,
  ChevronRight,
  Library,
  UsersRound,
  Sparkles,
  Camera,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/speakers", label: "Speaker Apps", icon: Mic2 },
  { href: "/admin/demos", label: "Demo Requests", icon: Presentation },
  { href: "/admin/ideas", label: "Idea Submissions", icon: Lightbulb },
  { href: "/admin/applications", label: "Join Applications", icon: Users },
  { href: "/admin/karibu", label: "Karibu", icon: Sparkles },
  { href: "/admin/volunteers", label: "Volunteers", icon: HandHeart },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/photos", label: "Photos", icon: Camera },
  { href: "/admin/blog", label: "Blog Posts", icon: FileText },
  { href: "/admin/community", label: "Community Hub", icon: Library },
  { href: "/admin/impact-lab", label: "Impact Lab", icon: Network },
  { href: "/admin/contact", label: "Contact Messages", icon: MessageSquare },
  { href: "/admin/team", label: "Team", icon: UsersRound },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

const COLLAPSED_KEY = "cck-admin-sidebar-collapsed"

export function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  // localStorage is read after mount — reading it during render would make the
  // server and client HTML disagree and trigger a hydration error.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1")
    setHydrated(true)
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSED_KEY, prev ? "0" : "1")
      return !prev
    })
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        "sticky top-0 h-screen shrink-0 bg-bg-secondary border-r border-border-default flex flex-col",
        hydrated && "transition-[width] duration-200 motion-reduce:transition-none",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo + collapse toggle */}
      <div
        className={cn(
          "border-b border-border-default flex items-center",
          collapsed ? "p-3 justify-center" : "p-5 justify-between"
        )}
      >
        <Link
          href="/admin"
          className="flex items-center gap-2.5 group"
          title={collapsed ? "CCK Admin Panel" : undefined}
        >
          <div className="w-8 h-8 rounded bg-green-primary/10 border border-green-primary/30 flex items-center justify-center shrink-0">
            <Terminal className="w-4 h-4 text-green-primary" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-xs font-mono font-bold text-green-primary leading-none">CCK</div>
              <div className="text-[10px] font-mono text-text-dim leading-none mt-0.5">Admin Panel</div>
            </div>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            aria-expanded="true"
            className="p-1.5 rounded text-text-dim hover:text-text-primary hover:bg-bg-card transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="p-3 border-b border-border-default flex justify-center">
          <button
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            aria-expanded="false"
            title="Expand sidebar"
            className="p-1.5 rounded text-text-dim hover:text-text-primary hover:bg-bg-card transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation — scrolls internally, the rail itself stays pinned */}
      <nav className={cn("flex-1 overflow-y-auto p-3 space-y-0.5", collapsed && "p-2")}>
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded text-sm font-mono transition-all group",
                collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5",
                active
                  ? "bg-green-primary/10 text-green-primary border border-green-primary/20"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-card border border-transparent"
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-green-primary" : "text-current")} />
              {!collapsed && <span className="flex-1">{label}</span>}
              {!collapsed && active && <ChevronRight className="w-3 h-3 text-green-primary" />}
            </Link>
          )
        })}
      </nav>

      {/* Sign Out */}
      <div className={cn("border-t border-border-default", collapsed ? "p-2" : "p-3")}>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          title={collapsed ? "Sign Out" : undefined}
          className={cn(
            "w-full flex items-center gap-3 rounded text-sm font-mono text-text-dim hover:text-red hover:bg-red/10 border border-transparent hover:border-red/20 transition-all",
            collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        {!collapsed && (
          <Link
            href="/"
            className="mt-1 w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-mono text-text-dim hover:text-text-secondary transition-colors"
          >
            <span>← Back to site</span>
          </Link>
        )}
      </div>
    </aside>
  )
}
