import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import type { UserRole } from "@/lib/rbac"
import { hasPermission } from "@/lib/rbac"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect("/admin/login")

  const role = (session.user as { role?: string }).role as UserRole | undefined
  if (!role || !hasPermission(role, "dashboard", "view")) {
    redirect("/admin/login")
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
