import { AdminHeader } from "@/components/admin/AdminHeader"
import { ImpactLabDashboard } from "@/components/admin/impact-lab/ImpactLabDashboard"
import { CURRENT_COHORT } from "@/lib/impact-lab/constants"

export const dynamic = "force-dynamic"

export default function ImpactLabAdminPage() {
  return (
    <div>
      <AdminHeader title="Impact Lab" />
      <div className="p-6">
        {/*
         * The explanatory line used to live here as static server-rendered
         * text naming CURRENT_COHORT — wrong the moment an organiser picks a
         * different event from the selector below. It now lives inside
         * ImpactLabDashboard, which tracks the selected cohort as state.
         */}
        <ImpactLabDashboard cohort={CURRENT_COHORT} />
      </div>
    </div>
  )
}
