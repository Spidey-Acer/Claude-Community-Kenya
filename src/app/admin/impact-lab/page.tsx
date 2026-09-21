import { Suspense } from "react"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { ImpactLabDashboard } from "@/components/admin/impact-lab/ImpactLabDashboard"
import { defaultAdminCohort } from "@/lib/impact-lab/event-store"

export const dynamic = "force-dynamic"

export default async function ImpactLabAdminPage() {
  const cohort = await defaultAdminCohort()
  return (
    <div>
      <AdminHeader title="Impact Lab" />
      <div className="p-6">
        {/*
         * The explanatory line used to live here as static server-rendered
         * text naming the default cohort — wrong the moment an organiser
         * picks a different event from the selector below. It now lives
         * inside ImpactLabDashboard, which tracks the selected cohort as
         * state.
         */}
        {/* ImpactLabDashboard reads useSearchParams (tab/cohort restore on
         * refresh) — Next requires a Suspense boundary around any client
         * component that does, since this page itself is a server component. */}
        <Suspense fallback={null}>
          <ImpactLabDashboard cohort={cohort} />
        </Suspense>
      </div>
    </div>
  )
}
