import Link from "next/link"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { TeamMemberNewForm } from "./TeamMemberNewForm"

export default function NewTeamMemberPage() {
  return (
    <div>
      <AdminHeader title="Add Team Member" />
      <div className="p-6 max-w-2xl">
        <div className="mb-4">
          <Link href="/admin/team" className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
            ← Back to Team
          </Link>
        </div>
        <TeamMemberNewForm />
      </div>
    </div>
  )
}
