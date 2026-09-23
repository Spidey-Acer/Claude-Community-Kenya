import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { GuidesManager } from "@/components/admin/GuidesManager"
import { hasPermission, type UserRole } from "@/lib/rbac"

export const dynamic = "force-dynamic"

export default async function GuidesAdminPage() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role as UserRole | undefined

  // The layout only gates on dashboard:view; every page that has its own
  // resource checks it explicitly, same as src/app/admin/settings/page.tsx.
  if (!role || !hasPermission(role, "guides", "view")) {
    redirect("/admin")
  }

  const guides = await prisma.guide.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  })

  const serialized = guides.map((g) => ({
    ...g,
    publishedAt: g.publishedAt ? g.publishedAt.toISOString() : null,
  }))

  return (
    <div>
      <AdminHeader title="Guides" />
      <div className="p-6">
        <GuidesManager initialGuides={serialized} />
      </div>
    </div>
  )
}
