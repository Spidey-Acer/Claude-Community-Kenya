"use client"

import { useState } from "react"
import { CohortSelector } from "@/components/admin/impact-lab/CohortSelector"
import { useCohorts } from "@/components/admin/impact-lab/useCohorts"
import { JudgeScoringScreen } from "./JudgeScoringScreen"

/**
 * Cohort-aware wrapper around the judge scoring screen. Before this, the
 * page hardcoded a single default cohort, so an organiser judging a past
 * event (or re-checking a past event's scores) had no way to get there.
 *
 * `JudgeScoringScreen`'s own `load` callback already depends on its `cohort`
 * prop, so switching the selection here is all that's needed — it refetches
 * on its own, no remount required.
 */
export function JudgeDashboard({ initialCohort }: { initialCohort: string }) {
  const [cohort, setCohort] = useState(initialCohort)
  const { cohorts, loading, error } = useCohorts()

  return (
    <div className="space-y-4">
      <CohortSelector
        cohorts={cohorts}
        loading={loading}
        error={error}
        selected={cohort}
        onChange={setCohort}
      />
      <JudgeScoringScreen cohort={cohort} />
    </div>
  )
}
