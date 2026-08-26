"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
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
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
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
  { href: "/admin/reports", label: "Reports", icon: ShieldAlert },
  { href: "/admin/impact-lab", label: "Impact Lab", icon: Network },
  { href: "/admin/contact", label: "Contact Messages", icon: MessageSquare },
  { href: "/admin/team", label: "Team", icon: UsersRound },
  { href: "/admin/settings", label: "Settings", icon: Settings },
]

const COLLAPSED_KEY = "cck-admin-sidebar-collapsed"

// Duplicated from rolePermissions in @/lib/rbac rather than imported: rbac.ts
// pulls in @/auth (bcryptjs, a Prisma dynamic import) at module scope, which
// breaks the client bundle. AdminUserManager.tsx and
// admin/volunteers/[id]/page.tsx hit the same wall and duplicate ROLE_LABELS
// / ROLE_COLORS locally for the same reason — this follows that precedent.
// Keep in sync with rbac.ts's `reports` entry if that ever changes.
const REPORTS_VISIBLE_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MODERATOR"])

/**
 * Admin navigation shell.
 *
 * Desktop (md+): the original sticky rail with a collapse toggle.
 * Mobile (below md): the rail is hidden entirely — it used to occupy 256 of
 * a phone's 375px and crush every page — replaced by a top bar with a
 * hamburger that opens the same nav as an off-canvas drawer.
 */
export function AdminSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // localStorage is read after mount — reading it during render would make the
  // server and client HTML disagree and trigger a hydration error.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1")
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!drawerOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDrawerOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [drawerOpen])

  const role = (session?.user as { role?: string } | undefined)?.role
  const visibleNavItems = navItems.filter(
    (item) => item.href !== "/admin/reports" || REPORTS_VISIBLE_ROLES.has(role ?? "")
  )

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

  // Rendered twice (drawer + rail); the drawer passes onNavigate so tapping a
  // link closes it — cheaper and lint-cleaner than watching pathname in an
  // effect.
  const renderNav = (onNavigate?: () => void) => (
    <nav className={cn("flex-1 overflow-y-auto p-3 space-y-0.5", collapsed && "md:p-2")}>
      {visibleNavItems.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center gap-3 rounded text-sm font-mono transition-all group px-3 py-2.5",
              collapsed && "md:px-0 md:justify-center",
              active
                ? "bg-green-primary/10 text-green-primary border border-green-primary/20"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-card border border-transparent"
            )}
          >
            <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-green-primary" : "text-current")} />
            <span className={cn("flex-1", collapsed && "md:hidden")}>{label}</span>
            {active && (
              <ChevronRight className={cn("w-3 h-3 text-green-primary", collapsed && "md:hidden")} />
            )}
          </Link>
        )
      })}
    </nav>
  )

  const footer = (
    <div className={cn("border-t border-border-default p-3", collapsed && "md:p-2")}>
      <button
        onClick={() => signOut({ callbackUrl: "/admin/login" })}
        title={collapsed ? "Sign Out" : undefined}
        className={cn(
          "w-full flex items-center gap-3 rounded text-sm font-mono text-text-dim hover:text-red hover:bg-red/10 border border-transparent hover:border-red/20 transition-all px-3 py-2.5",
          collapsed && "md:px-0 md:justify-center"
        )}
      >
        <LogOut className="w-4 h-4" />
        <span className={cn(collapsed && "md:hidden")}>Sign Out</span>
      </button>
      <Link
        href="/"
        className={cn(
          "mt-1 w-full flex items-center gap-3 px-3 py-2 rounded text-xs font-mono text-text-dim hover:text-text-secondary transition-colors",
          collapsed && "md:hidden"
        )}
      >
        <span>← Back to site</span>
      </Link>
    </div>
  )

  const logo = (
    <Link href="/admin" className="flex items-center gap-2.5 group" title="CCK Admin Panel">
      <div className="w-8 h-8 rounded bg-green-primary/10 border border-green-primary/30 flex items-center justify-center shrink-0">
        <Terminal className="w-4 h-4 text-green-primary" />
      </div>
      <div className={cn(collapsed && "md:hidden")}>
        <div className="text-xs font-mono font-bold text-green-primary leading-none">CCK</div>
        <div className="text-[10px] font-mono text-text-dim leading-none mt-0.5">Admin Panel</div>
      </div>
    </Link>
  )

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border-default bg-bg-secondary px-4">
        {logo}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open admin menu"
          aria-expanded={drawerOpen}
          className="flex h-11 w-11 items-center justify-center rounded text-text-secondary hover:bg-bg-card hover:text-text-primary transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile drawer + backdrop */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Admin navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border-default bg-bg-secondary"
          >
            <div className="flex items-center justify-between border-b border-border-default p-4">
              {logo}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close admin menu"
                className="flex h-11 w-11 items-center justify-center rounded text-text-dim hover:bg-bg-card hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNav(() => setDrawerOpen(false))}
            {footer}
          </div>
        </div>
      )}

      {/* Desktop rail */}
      <aside
        className={cn(
          "hidden md:flex sticky top-0 h-screen shrink-0 bg-bg-secondary border-r border-border-default flex-col",
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
          {logo}
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
        {renderNav()}

        {/* Sign Out */}
        {footer}
      </aside>
    </>
  )
}
