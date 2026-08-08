"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { apiGet, apiSend } from "@/components/admin/impact-lab/api"
import {
  isComplete,
  type JudgingRubric,
  type ScoreSheet,
} from "@/lib/impact-lab/judging"
import { TeamScoreCard, type Draft, type JudgeTeam } from "./TeamScoreCard"

interface JudgingData {
  finalRunId: string | null
  teams: JudgeTeam[]
  mine: Record<string, { scores: ScoreSheet; feedback: string | null }>
  standings: { teamId: string; average: number; judgeCount: number }[]
  /**
   * The rubric this cohort is judged on. Optional in the type only because it
   * arrives over the wire; there is no default, and the screen refuses to
   * render without it rather than score against guessed criteria.
   */
  rubric?: JudgingRubric
}

const EMPTY_DRAFT: Draft = { scores: {}, feedback: "" }

/**
 * Judge-facing scoring screen. One team open at a time (an accordion, not a
 * long scroll of forms) so a judge holding a phone can find their place
 * again after a demo interrupts them. A partial card is always saveable —
 * this replaces a form that made feedback required, and demos run too fast
 * to let that block a score again.
 */
export function JudgeScoringScreen({ cohort }: { cohort: string }) {
  const [data, setData] = useState<JudgingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [savedSnapshot, setSavedSnapshot] = useState<Record<string, Draft>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await apiGet<JudgingData>(
        `/api/admin/impact-lab/judging?cohort=${cohort}`
      )
      setData(res)

      const initial: Record<string, Draft> = {}
      for (const team of res.teams) {
        const mine = res.mine[team.teamId]
        initial[team.teamId] = { scores: mine?.scores ?? {}, feedback: mine?.feedback ?? "" }
      }
      setDrafts(initial)
      setSavedSnapshot(initial)

      // Land on the first team this judge hasn't finished, so opening the
      // page mid-event drops them where they left off rather than at the top.
      const firstUnfinished = res.rubric
        ? res.teams.find((t) => !isComplete(initial[t.teamId]?.scores ?? {}, res.rubric))
        : undefined
      setExpanded(firstUnfinished?.teamId ?? res.teams[0]?.teamId ?? null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load teams")
    } finally {
      setLoading(false)
    }
  }, [cohort])

  useEffect(() => {
    void load()
  }, [load])

  function updateDraft(teamId: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({
      ...prev,
      [teamId]: { ...(prev[teamId] ?? EMPTY_DRAFT), ...patch },
    }))
  }

  async function save(teamId: string) {
    const draft = drafts[teamId] ?? EMPTY_DRAFT
    if (Object.keys(draft.scores).length === 0) {
      setSaveErrors((prev) => ({
        ...prev,
        [teamId]: "Score at least one criterion before saving.",
      }))
      return
    }
    setSavingId(teamId)
    setSaveErrors((prev) => ({ ...prev, [teamId]: "" }))
    try {
      await apiSend(`/api/admin/impact-lab/judging?cohort=${cohort}`, "POST", {
        teamId,
        scores: draft.scores,
        feedback: draft.feedback,
      })
      setSavedSnapshot((prev) => ({ ...prev, [teamId]: draft }))
    } catch (e) {
      setSaveErrors((prev) => ({
        ...prev,
        [teamId]: e instanceof Error ? e.message : "Failed to save",
      }))
    } finally {
      setSavingId(null)
    }
  }

  const progress = useMemo(() => {
    const teams = data?.teams ?? []
    const rubric = data?.rubric
    const done = rubric
      ? teams.filter((t) => isComplete(drafts[t.teamId]?.scores ?? {}, rubric)).length
      : 0
    return { done, total: teams.length }
  }, [data, drafts])

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#333]" />
      </div>
    )
  }

  if (loadError || !data) {
    return (
      <div className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-3 text-[12px] font-mono text-[#ff3333]">
        {loadError ?? "No data"}
      </div>
    )
  }

  if (!data.finalRunId || data.teams.length === 0) {
    return (
      <div className="rounded border border-[#ffb000]/30 bg-[#ffb000]/10 p-4 text-[12px] font-mono text-[#ffb000]">
        No final run is published for this cohort yet — there is nothing to judge until an
        organiser marks a run final.
      </div>
    )
  }

  // Deliberately no fallback — see JudgeScoring.tsx. Defaulting to the Impact
  // Lab rubric would render a plausible-looking scorecard on the wrong criteria.
  const rubric = data.rubric
  if (!rubric) {
    return (
      <p className="text-sm text-red" role="alert">
        The judging rubric for this cohort did not load. Scoring is disabled
        rather than risk recording scores against the wrong criteria.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 -mx-4 sm:-mx-0 border-b border-[#1e1e1e] bg-[#0a0a0a]/95 px-4 sm:px-0 py-2 backdrop-blur">
        <p className="text-[11px] font-mono text-[#888]">
          <span className="font-semibold text-[#00ff41]">{progress.done}</span> / {progress.total}{" "}
          teams scored
        </p>
      </div>

      {data.teams.map((team) => {
        const draft = drafts[team.teamId] ?? EMPTY_DRAFT
        const snapshot = savedSnapshot[team.teamId] ?? EMPTY_DRAFT
        const unsaved = JSON.stringify(draft) !== JSON.stringify(snapshot)
        const complete = isComplete(draft.scores, rubric)
        const isOpen = expanded === team.teamId

        return (
          <div
            key={team.teamId}
            className="overflow-hidden rounded-lg border border-[#1e1e1e] bg-[#0d0d0d]"
          >
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : team.teamId)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-mono font-semibold text-[#e0e0e0]">
                  {team.teamName}
                </p>
                <p className="truncate text-[11px] font-mono text-[#666]">
                  {team.submission?.projectName ?? "no submission"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-mono ${
                    complete
                      ? "bg-[#00ff41]/10 text-[#00ff41]"
                      : Object.keys(draft.scores).length > 0
                        ? "bg-[#ffb000]/10 text-[#ffb000]"
                        : "bg-[#1e1e1e] text-[#666]"
                  }`}
                >
                  {complete
                    ? unsaved
                      ? "unsaved"
                      : "scored"
                    : Object.keys(draft.scores).length > 0
                      ? "in progress"
                      : "not started"}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-[#555] transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-[#1e1e1e]">
                <TeamScoreCard
                  team={team}
                  rubric={rubric}
                  draft={draft}
                  saving={savingId === team.teamId}
                  unsaved={unsaved}
                  saveError={saveErrors[team.teamId] ?? ""}
                  onScore={(key, value) =>
                    updateDraft(team.teamId, { scores: { ...draft.scores, [key]: value } })
                  }
                  onFeedback={(value) => updateDraft(team.teamId, { feedback: value })}
                  onSave={() => save(team.teamId)}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
