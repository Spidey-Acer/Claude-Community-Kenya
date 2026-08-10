import { AdminHeader } from "@/components/admin/AdminHeader"
import { JudgeDashboard } from "./JudgeDashboard"
import { defaultAdminCohort } from "@/lib/impact-lab/event-store"

export const dynamic = "force-dynamic"

export default async function ImpactLabJudgePage() {
  const cohort = await defaultAdminCohort()
  return (
    <div>
      <AdminHeader title="Judge scoring" />
      <div className="p-4 sm:p-6">
        <JudgeDashboard initialCohort={cohort} />
      </div>
    </div>
  )
}
