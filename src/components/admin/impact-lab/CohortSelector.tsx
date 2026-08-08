"use client"

import { ChevronDown, Loader2 } from "lucide-react"

/** One entry from `GET /api/admin/impact-lab/cohorts` — mirrors the route's response shape. */
export interface CohortSummary {
  cohort: string
  participantCount: number
  runCount: number
  hasFinalRun: boolean
  latestRunName: string | null
  latestRunAt: string | null
  isActive: boolean
}

interface CohortSelectorProps {
  cohorts: CohortSummary[]
  loading: boolean
  error: string | null
  selected: string
  onChange: (cohort: string) => void
}

/**
 * Event switcher for the Impact Lab admin dashboard. A native `<select>` —
 * keyboard-operable and screen-reader-friendly for free, and it reads as
 * chrome above the tab bar rather than a control competing with it. The
 * per-cohort counts an organiser needs to tell events apart live in the
 * option labels; the live/archive badge next to it repeats the answer for
 * whichever cohort is currently selected, so it doesn't require re-opening
 * the dropdown to confirm.
 */
export function CohortSelector({ cohorts, loading, error, selected, onChange }: CohortSelectorProps) {
  const current = cohorts.find((c) => c.cohort === selected)

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] px-3 py-2">
      <label
        htmlFor="impact-lab-cohort"
        className="text-[10px] font-mono uppercase tracking-wider text-[#555]"
      >
        Event
      </label>

      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#333]" />
      ) : error ? (
        <span className="text-[11px] font-mono text-[#ff3333]">{error}</span>
      ) : (
        <>
          <div className="relative">
            <select
              id="impact-lab-cohort"
              value={selected}
              onChange={(e) => onChange(e.target.value)}
              className="appearance-none rounded border border-[#1e1e1e] bg-[#111] py-1.5 pl-2.5 pr-7 text-[11px] font-mono text-[#e0e0e0] hover:border-[#333]"
            >
              {cohorts.map((c) => (
                <option key={c.cohort} value={c.cohort}>
                  {c.cohort} — {c.participantCount} participant{c.participantCount === 1 ? "" : "s"}
                  {c.isActive ? " (live)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[#555]" />
          </div>

          {current && (
            <span className="flex items-center gap-2 text-[10px] font-mono text-[#555]">
              {current.isActive ? (
                <span className="flex items-center gap-1 text-[#00ff41]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00ff41]" /> live
                </span>
              ) : (
                <span className="text-[#888]">archive</span>
              )}
              <span>
                {current.runCount} run{current.runCount === 1 ? "" : "s"}
              </span>
              {current.hasFinalRun && <span className="text-[#ffb000]">final</span>}
            </span>
          )}
        </>
      )}
    </div>
  )
}
