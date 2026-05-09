import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { TeamMemberEditForm } from "./TeamMemberEditForm"

export default async function EditTeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const member = await prisma.teamMember.findUnique({ where: { id } })
  if (!member) notFound()

  return (
    <div>
      <AdminHeader title={`Edit: ${member.name}`} />
      <div className="p-6 max-w-2xl">
        <div className="mb-4">
          <Link
            href="/admin/team"
            className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors"
          >
            ← Back to Team
          </Link>
        </div>
        <TeamMemberEditForm member={member} />
      </div>
    </div>
  )
}
