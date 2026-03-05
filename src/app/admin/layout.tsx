import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminProviders } from "@/components/admin/Providers"
import type { UserRole } from "@/lib/rbac"
import { hasPermission } from "@/lib/rbac"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  // No session = unauthenticated user on login page (middleware allows /admin/login through)
  // Render children without sidebar so login page gets a clean full-screen layout
  if (!session?.user) {
    return <AdminProviders>{children}</AdminProviders>
  }

  // RBAC: ensure user has permission to access admin dashboard
  const role = (session.user as { role?: string }).role as UserRole | undefined
  if (!role || !hasPermission(role, "dashboard", "view")) {
    redirect("/admin/login")
  }

  return (
    <AdminProviders>
      <div className="flex min-h-screen bg-[#0a0a0a]">
        <AdminSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </AdminProviders>
  )
}
