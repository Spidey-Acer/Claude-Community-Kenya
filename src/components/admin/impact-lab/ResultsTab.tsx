"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Save, Sparkles } from "lucide-react"
import { apiGet, apiSend } from "./api"
import { CRITERION_KEYS, JUDGING_CRITERIA, MAX_SCORE, MIN_SCORE } from "@/lib/impact-lab/judging"

interface AwaitingTeam {
  teamId: string
  teamName: string
  projectName: string
  repoUrl: string
  demoUrl: string | null
  submission: Record<string, string>
}

interface DraftResult {
  scores: Record<string, number>
  reasoning: Record<string, string>
}

interface TeamDraftState {
  scores: Partial<Record<string, number>>
  reasoning: Record<string, string>
  drafting: boolean
  saving: boolean
  error: string | null
}

function emptyState(): TeamDraftState {
  return {
    scores: {},
    reasoning: {},
    drafting: false,
    saving: false,
    error: null,
  }
}

/**
 * Section: teams awaiting a score.
 *
 * Four teams submitted and no judge ever reached their table. Kept as its own
 * component (rather than inlined in ResultsTab) so Task 7 can append a second
 * section without touching this one.
 */
function AwaitingScoreSection({ cohort }: { cohort: string }) {
  const [teams, setTeams] = useState<AwaitingTeam[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, TeamDraftState>>({})
  // Persists after a team's card is removed from the list, so pressing Save
  // has a confirmation that outlives the card it belonged to.
  const [savedTeams, setSavedTeams] = useState<{ teamId: string; teamName: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<{ teams: AwaitingTeam[] }>(
        `/api/admin/impact-lab/judging/writeup?cohort=${cohort}`
      )
      setTeams(data.teams)
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load teams awaiting a score")
    } finally {
      setLoading(false)
    }
  }, [cohort])

  useEffect(() => {
    void load()
  }, [load])

  const stateFor = useCallback(
    (teamId: string): TeamDraftState => drafts[teamId] ?? emptyState(),
    [drafts]
  )

  const patch = useCallback(
    (teamId: string, next: Partial<TeamDraftState>) => {
      setDrafts((prev) => ({ ...prev, [teamId]: { ...(prev[teamId] ?? emptyState()), ...next } }))
    },
    []
  )

  async function draft(teamId: string) {
    patch(teamId, { drafting: true, error: null })
    try {
      const result = await apiSend<DraftResult>(
        `/api/admin/impact-lab/judging/writeup?cohort=${cohort}`,
        "POST",
        { teamId, action: "draft" }
      )
      patch(teamId, {
        drafting: false,
        scores: result.scores,
        reasoning: result.reasoning,
      })
    } catch (e) {
      patch(teamId, {
        drafting: false,
        error: e instanceof Error ? e.message : "Could not draft scores for that team.",
      })
    }
  }

  function setScore(teamId: string, key: string, raw: string) {
    const current = stateFor(teamId)
    const nextScores = { ...current.scores }
    if (raw === "") {
      delete nextScores[key]
    } else {
      const value = Number(raw)
      if (!Number.isNaN(value)) nextScores[key] = value
    }
    patch(teamId, { scores: nextScores })
  }

  async function save(teamId: string) {
    const current = stateFor(teamId)
    const team = teams?.find((t) => t.teamId === teamId)
    patch(teamId, { saving: true, error: null })
    try {
      await apiSend(`/api/admin/impact-lab/judging/writeup?cohort=${cohort}`, "POST", {
        teamId,
        action: "save",
        scores: current.scores,
      })
      patch(teamId, { saving: false })
      if (team) setSavedTeams((prev) => [...prev, { teamId, teamName: team.teamName }])
      // The team no longer belongs in "awaiting a score" once it has one —
      // but the confirmation above the list stays, so the organiser sees the
      // save happened rather than the card just disappearing.
      setTeams((prev) => prev?.filter((t) => t.teamId !== teamId) ?? prev)
    } catch (e) {
      patch(teamId, {
        saving: false,
        error: e instanceof Error ? e.message : "That did not save.",
      })
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#333]" />
      </div>
    )
  }

  if (loadError || !teams) {
    return (
      <div className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]">
        {loadError ?? "No data"}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">
          Teams awaiting a score
        </h2>
        <p className="mt-1 text-[11px] font-mono text-[#888]">
          These teams submitted work but no judge ever reached their table. Without a
          score they would be published with no result at all.
        </p>
      </div>

      {savedTeams.length > 0 && (
        <div
          role="status"
          className="rounded border border-[#00ff41]/30 bg-[#00ff41]/10 p-3 text-[11px] font-mono text-[#00ff41]"
        >
          Saved as organiser review: {savedTeams.map((t) => t.teamName).join(", ")}
        </div>
      )}

      {teams.length === 0 ? (
        <p className="p-8 text-center text-sm font-mono text-[#555]">
          Every submitted team has a score.
        </p>
      ) : (
        teams.map((team) => {
          const state = stateFor(team.teamId)
          const canSave = CRITERION_KEYS.every((key) => {
            const value = state.scores[key]
            return (
              typeof value === "number" &&
              Number.isInteger(value) &&
              value >= MIN_SCORE &&
              value <= MAX_SCORE
            )
          })

          return (
            <div
              key={team.teamId}
              className="space-y-4 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-4"
            >
              <div>
                <p className="text-[12px] font-mono font-semibold text-[#e0e0e0]">
                  {team.teamName}
                </p>
                <p className="text-[11px] font-mono text-[#888]">{team.projectName}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-[11px] font-mono">
                  <a
                    href={team.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#00d4ff] underline"
                  >
                    repo
                  </a>
                  {team.demoUrl && (
                    <a
                      href={team.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#00d4ff] underline"
                    >
                      demo link
                    </a>
                  )}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(team.submission).map(([label, value]) => (
                  <div key={label} className="rounded border border-[#1e1e1e] bg-[#111] p-3">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[#555]">
                      {label}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-[11px] font-mono text-[#ccc]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void draft(team.teamId)}
                disabled={state.drafting}
                className="flex items-center gap-2 rounded border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-[#00d4ff] transition-colors hover:bg-[#00d4ff]/20 disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {state.drafting ? "Drafting…" : "Draft with Claude"}
              </button>

              <p className="text-[11px] font-mono text-[#ffb000]">
                Claude drafts. You decide. Nothing is saved until you press Save.
              </p>

              <div className="space-y-3">
                {JUDGING_CRITERIA.map((criterion) => (
                  <div
                    key={criterion.key}
                    className="grid gap-2 sm:grid-cols-[180px_80px_1fr] sm:items-start"
                  >
                    <label
                      htmlFor={`${team.teamId}-${criterion.key}`}
                      className="text-[11px] font-mono text-[#e0e0e0]"
                    >
                      {criterion.label}
                      <span className="ml-1 text-[#555]">· {criterion.weight}pts</span>
                    </label>
                    <input
                      id={`${team.teamId}-${criterion.key}`}
                      type="number"
                      min={MIN_SCORE}
                      max={MAX_SCORE}
                      step={1}
                      value={state.scores[criterion.key] ?? ""}
                      onChange={(e) => setScore(team.teamId, criterion.key, e.target.value)}
                      className="w-full rounded border border-[#1e1e1e] bg-[#111] px-2 py-1.5 text-[11px] font-mono text-[#e0e0e0] focus:border-[#00ff41] focus:outline-none"
                    />
                    <p className="text-[11px] font-mono text-[#888]">
                      {state.reasoning[criterion.key] ?? ""}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void save(team.teamId)}
                  disabled={!canSave || state.saving}
                  className="flex items-center gap-2 rounded border border-[#00ff41]/40 bg-[#00ff41]/10 px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-[#00ff41] transition-colors hover:bg-[#00ff41]/20 disabled:opacity-40"
                >
                  <Save className="h-3.5 w-3.5" />
                  {state.saving ? "Saving…" : "Save"}
                </button>
                {state.error && (
                  <span role="alert" className="text-[11px] font-mono text-[#ff3333]">
                    {state.error}
                  </span>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

/**
 * Results tab — organiser-facing surfaces for closing out judging.
 *
 * Starts with the one section this program needs first: the teams the panel
 * never reached. Task 7 appends further sections below this one, so each
 * section is its own component rendered in a simple stack.
 */
export function ResultsTab({ cohort }: { cohort: string }) {
  return (
    <div className="space-y-6">
      <AwaitingScoreSection cohort={cohort} />
    </div>
  )
}
