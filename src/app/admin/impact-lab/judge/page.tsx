import { AdminHeader } from "@/components/admin/AdminHeader"
import { JudgeDashboard } from "./JudgeDashboard"
import { CURRENT_COHORT } from "@/lib/impact-lab/constants"

export const dynamic = "force-dynamic"

export default function ImpactLabJudgePage() {
  return (
    <div>
      <AdminHeader title="Judge scoring" />
      <div className="p-4 sm:p-6">
        <JudgeDashboard initialCohort={CURRENT_COHORT} />
      </div>
    </div>
  )
}
