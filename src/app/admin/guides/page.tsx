import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { GuidesManager } from "@/components/admin/GuidesManager"

export const dynamic = "force-dynamic"

export default async function GuidesAdminPage() {
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
