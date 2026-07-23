import Link from "next/link"
import { auth, signOut } from "@/auth"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminProviders } from "@/components/admin/Providers"
import type { UserRole } from "@/lib/rbac"
import { hasPermission, ROLE_LABELS } from "@/lib/rbac"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  // No session = unauthenticated user on login page (middleware allows /admin/login through)
  // Render children without sidebar so login page gets a clean full-screen layout
  if (!session?.user) {
    return <AdminProviders>{children}</AdminProviders>
  }

  // RBAC: ensure user has permission to access admin dashboard.
  // We render an inline "no access" page rather than redirect — redirecting
  // to /admin/login would loop because the login page auto-redirects back
  // to /admin when authenticated.
  const role = (session.user as { role?: string }).role as UserRole | undefined
  if (!role || !hasPermission(role, "dashboard", "view")) {
    return (
      <AdminProviders>
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-bg-secondary border border-border-default rounded-lg p-6 space-y-4">
            <h1 className="font-mono text-base font-semibold text-red">
              Admin access denied
            </h1>
            <p className="font-mono text-xs text-text-dim leading-relaxed">
              You&apos;re signed in as{" "}
              <span className="text-text-primary">{session.user.email}</span>
              {role ? ` (${ROLE_LABELS[role] ?? role})` : ""}.
              This account doesn&apos;t have permission to access the admin panel.
            </p>
            <p className="font-mono text-xs text-text-dim leading-relaxed">
              Sign out and sign in with an admin account, or go back to the site.
            </p>
            <div className="flex gap-2 pt-2">
              <form
                action={async () => {
                  "use server"
                  await signOut({ redirectTo: "/admin/login" })
                }}
              >
                <button
                  type="submit"
                  className="px-3 py-2 text-xs font-mono border border-green-primary/40 text-green-primary rounded hover:bg-green-primary/10 transition-colors"
                >
                  Sign out
                </button>
              </form>
              <Link
                href="/"
                className="px-3 py-2 text-xs font-mono border border-border-default text-text-secondary rounded hover:border-border-hover hover:text-text-primary transition-colors"
              >
                Go to homepage
              </Link>
            </div>
          </div>
        </div>
      </AdminProviders>
    )
  }

  return (
    <AdminProviders>
      <div className="flex min-h-screen bg-[#0a0a0a]">
        <AdminSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </AdminProviders>
  )
}
