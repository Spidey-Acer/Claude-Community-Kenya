import { AdminHeader } from "@/components/admin/AdminHeader"
import { ImpactLabDashboard } from "@/components/admin/impact-lab/ImpactLabDashboard"
import { CURRENT_COHORT } from "@/lib/impact-lab/constants"

export const dynamic = "force-dynamic"

export default function ImpactLabAdminPage() {
  return (
    <div>
      <AdminHeader title="Impact Lab" />
      <div className="p-6">
        <p className="text-xs font-mono text-[#555] mb-4">
          Team matching for cohort <span className="text-[#00ff41]">{CURRENT_COHORT}</span> — import
          participants, generate teams, explain with Claude, and freeze a final run.
        </p>
        <ImpactLabDashboard cohort={CURRENT_COHORT} />
      </div>
    </div>
  )
}
