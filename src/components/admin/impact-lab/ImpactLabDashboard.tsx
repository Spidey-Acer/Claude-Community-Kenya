"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Users,
  Network,
  Save,
  FileText,
  UserCheck,
  Trophy,
  Gavel,
  ListChecks,
  SlidersHorizontal,
  CalendarDays,
  IdCard,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CohortSelector } from "./CohortSelector"
import { useCohorts } from "./useCohorts"
import { ParticipantsTab } from "./ParticipantsTab"
import { MatchingTab } from "./MatchingTab"
import { RunsTab } from "./RunsTab"
import { SubmissionsTab } from "./SubmissionsTab"
import { CheckInTab } from "./CheckInTab"
import { LeaderboardTab } from "./LeaderboardTab"
import { JudgesTab } from "./JudgesTab"
import { ResultsTab } from "./ResultsTab"
import { RubricTab } from "./RubricTab"
import { EventsTab } from "./EventsTab"
import { CardsTab } from "./CardsTab"
import { type Tab, tabFromQuery } from "./tabUrl"

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  // First: events span organisations and aren't scoped to the selected
  // cohort below, unlike every other tab here.
  { key: "events", label: "Events", icon: CalendarDays },
  { key: "participants", label: "Participants", icon: Users },
  { key: "matching", label: "Matching", icon: Network },
  { key: "runs", label: "Runs", icon: Save },
  { key: "submissions", label: "Submissions", icon: FileText },
  { key: "checkin", label: "Check-in", icon: UserCheck },
  // Before Leaderboard: the rubric is what the leaderboard's numbers mean, and
  // it has to be settled before judges start scoring — after that its structure
  // locks.
  { key: "rubric", label: "Rubric", icon: SlidersHorizontal },
  { key: "leaderboard", label: "Leaderboard", icon: Trophy },
  { key: "judges", label: "Judges", icon: Gavel },
  { key: "results", label: "Results", icon: ListChecks },
  // After Results: the share cards are what publishing produces, previewed
  // here before the results email carries them out.
  { key: "cards", label: "Cards", icon: IdCard },
]

/**
 * `initialCohort` seeds the selector — the server passes the admin default
 * cohort so the page opens on the live event, but the organiser can switch
 * to any cohort the system knows about without a redeploy.
 */
export function ImpactLabDashboard({ cohort: initialCohort }: { cohort: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [cohort, setCohortState] = useState(() => searchParams.get("cohort") ?? initialCohort)
  const [tab, setTabState] = useState<Tab>(() => tabFromQuery(searchParams.get("tab")))
  // Bumped when a run is saved so the Runs tab reloads.
  const [runsKey, setRunsKey] = useState(0)

  const { cohorts, loading: cohortsLoading, error: cohortsError } = useCohorts()

  // Replaces (never pushes) so tab/cohort switches don't spam browser
  // history, and never scrolls — this only updates the query string.
  const updateQuery = useCallback(
    (next: { tab?: Tab; cohort?: string }) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next.tab !== undefined) params.set("tab", next.tab)
      if (next.cohort !== undefined) params.set("cohort", next.cohort)
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  const setTab = useCallback(
    (next: Tab) => {
      setTabState(next)
      updateQuery({ tab: next })
    },
    [updateQuery]
  )

  const setCohort = useCallback(
    (next: string) => {
      setCohortState(next)
      updateQuery({ cohort: next })
    },
    [updateQuery]
  )

  // Mount-only: a freshly opened link (no `?tab=`/`?cohort=` yet) gets both
  // written in immediately, so the URL a user copies from here already
  // restores this exact view — not just views reached by switching tabs.
  useEffect(() => {
    if (searchParams.has("tab") && searchParams.has("cohort")) return
    const params = new URLSearchParams(searchParams.toString())
    if (!params.has("tab")) params.set("tab", tab)
    if (!params.has("cohort")) params.set("cohort", cohort)
    router.replace(`?${params.toString()}`, { scroll: false })
    // Mount-only by design — re-running on every tab/cohort change would
    // fight the explicit setTab/setCohort writes above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Only trust "not live" once the list has actually loaded — before that,
  // `cohorts` is empty and every cohort would look inactive.
  const selectedSummary = cohorts.find((c) => c.cohort === cohort)
  const isArchiveView = !cohortsLoading && !cohortsError && selectedSummary != null && !selectedSummary.isActive

  return (
    <div className="space-y-5">
      {/*
       * Worded to cover both kinds of event this dashboard now serves: a
       * cohort that gets matched into teams here (Matching tab, Explain,
       * freeze a run) and a cohort whose teams already exist and only needs
       * check-in, judging, and results. Naming the selected cohort — not a
       * hardcoded default — keeps this line honest after a switch.
       */}
      <p className="text-xs font-mono text-[#555]">
        Managing <span className="text-[#00ff41]">{cohort}</span> — participants, teams, submissions,
        judging, and results, all scoped to this event.
      </p>

      <CohortSelector
        cohorts={cohorts}
        loading={cohortsLoading}
        error={cohortsError}
        selected={cohort}
        onChange={setCohort}
      />

      {isArchiveView && (
        <div className="flex items-start gap-2 rounded border border-[#ffb000]/40 bg-[#ffb000]/10 p-3 text-[11px] font-mono text-[#ffb000]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Viewing <span className="font-semibold">{cohort}</span> — not the live event. Admin actions
            here still write to this cohort; participants aren&apos;t interacting with it anymore.
          </span>
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-[#1e1e1e] overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-xs font-mono transition-all border-b-2 -mb-px",
              tab === key
                ? "border-[#00ff41] text-[#00ff41]"
                : "border-transparent text-[#666] hover:text-[#999]"
            )}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/*
       * Keyed on `cohort` so every tab's fetched rows, form drafts, and
       * selection state fully remount on a switch — the simplest way to
       * guarantee nothing from the previous cohort (a stale leaderboard, a
       * half-filled participant form) can survive onto the new one.
       */}
      <div key={cohort} className="space-y-5">
        {tab === "events" && <EventsTab />}
        {tab === "participants" && <ParticipantsTab cohort={cohort} />}
        {tab === "matching" && (
          <MatchingTab
            cohort={cohort}
            onSaved={() => {
              setRunsKey((k) => k + 1)
              setTab("runs")
            }}
          />
        )}
        {tab === "runs" && <RunsTab cohort={cohort} refreshKey={runsKey} />}
        {tab === "submissions" && <SubmissionsTab cohort={cohort} />}
        {tab === "checkin" && <CheckInTab cohort={cohort} />}
        {tab === "rubric" && <RubricTab cohort={cohort} />}
        {tab === "leaderboard" && <LeaderboardTab cohort={cohort} />}
        {tab === "judges" && <JudgesTab cohort={cohort} />}
        {tab === "results" && <ResultsTab cohort={cohort} />}
        {tab === "cards" && <CardsTab cohort={cohort} />}
      </div>
    </div>
  )
}
