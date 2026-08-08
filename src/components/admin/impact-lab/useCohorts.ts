"use client"

import { useCallback, useEffect, useState } from "react"
import { apiGet } from "./api"
import type { CohortSummary } from "./CohortSelector"

/**
 * Shared cohort-list state for every Impact Lab admin surface that offers a
 * cohort switcher — the dashboard and the judge scoring screen both need the
 * same fetch/loading/error triad, so it lives here once instead of twice.
 */
export function useCohorts() {
  const [cohorts, setCohorts] = useState<CohortSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<{ cohorts: CohortSummary[] }>("/api/admin/impact-lab/cohorts")
      setCohorts(data.cohorts)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { cohorts, loading, error, reload }
}
