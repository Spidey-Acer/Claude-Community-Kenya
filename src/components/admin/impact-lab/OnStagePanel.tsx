"use client"

/**
 * The organiser's stage control: which team is presenting right now.
 *
 * Whoever runs the desk during demos sets this, and it lands on two screens
 * at once — every judge's scorecard pins and glows that team, and the team's
 * own dashboard tells them they are up. The alternative it replaces is a
 * microphone and thirty-six judges scrolling for the right table.
 *
 * Deliberately polls nothing. This is the surface that WRITES the value, so
 * the only reader that could disagree with it is another organiser's tab, and
 * a refetch after each action is enough for a control one person operates.
 *
 * Two reads on mount, both already-existing admin endpoints: the judging
 * payload for the team list (it is the only one carrying table number and
 * project name together, plus the final run's id), and the run itself for the
 * stored `onStage`.
 */

import { useCallback, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import type { JudgeTeamRow } from "@/lib/impact-lab/judge-team"
import { extractOnStage, type OnStage } from "@/lib/impact-lab/roster"
import { apiGet, apiSend } from "./api"

/** The slice of the judging payload this panel reads. */
interface JudgingPayload {
  teams: JudgeTeamRow[]
  /** Null until a run is marked final — nothing can go on stage before then. */
  finalRunId: string | null
}

/** The slice of the run payload this panel reads. */
interface RunPayload {
  result: unknown
}

const BUTTON =
  "rounded border border-[#1e1e1e] bg-[#111] px-3 py-1.5 text-[11px] font-mono text-[#aaa] hover:bg-[#1a1a1a] disabled:opacity-40"
const PRIMARY_BUTTON =
  "rounded border border-[#00ff41]/40 bg-[#00ff41]/10 px-3 py-1.5 text-[11px] font-mono text-[#00ff41] hover:bg-[#00ff41]/20 disabled:opacity-40"

/**
 * How a team is named in the picker: the table number leads, because that is
 * what the desk is looking at, then the project name if the team filed one and
 * the team name if they did not.
 */
function teamLabel(team: JudgeTeamRow): string {
  const name = team.submission?.projectName ?? team.teamName
  return team.table === null ? name : `Table ${team.table} · ${name}`
}

/** Table order, unnumbered teams last — the order the room is worked in. */
function byTable(a: JudgeTeamRow, b: JudgeTeamRow): number {
  if (a.table === b.table) return 0
  if (a.table === null) return 1
  if (b.table === null) return -1
  return a.table - b.table
}

/**
 * The team at the next table up from the one on stage, skipping empty tables
 * and teams with no number.
 *
 * With nothing on stage yet this is the first numbered table with members, so
 * "Next table" is also how the first pitch of the evening is started. Returns
 * null at the end of the run, which disables the button rather than wrapping
 * back to table 1 — the desk finishing the last pitch does not want to put the
 * first team back on stage by reflex.
 */
export function nextTableTeam(
  teams: JudgeTeamRow[],
  currentTeamId: string | null
): JudgeTeamRow | null {
  const eligible = teams
    .filter((team) => team.table !== null && team.memberCount > 0)
    .sort(byTable)
  const current = currentTeamId
    ? (teams.find((team) => team.teamId === currentTeamId) ?? null)
    : null
  const currentTable = current?.table ?? null
  if (currentTable === null) return eligible[0] ?? null
  return eligible.find((team) => (team.table as number) > currentTable) ?? null
}

export function OnStagePanel({ cohort }: { cohort: string }) {
  const [teams, setTeams] = useState<JudgeTeamRow[]>([])
  const [runId, setRunId] = useState<string | null>(null)
  const [onStage, setOnStage] = useState<OnStage | null>(null)
  const [choice, setChoice] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const judging = await apiGet<JudgingPayload>(
        `/api/admin/impact-lab/judging?cohort=${encodeURIComponent(cohort)}`
      )
      setTeams(judging.teams)
      setRunId(judging.finalRunId)
      if (judging.finalRunId) {
        const run = await apiGet<RunPayload>(
          `/api/admin/impact-lab/runs/${judging.finalRunId}`
        )
        setOnStage(extractOnStage(run.result))
      } else {
        setOnStage(null)
      }
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the stage")
    } finally {
      setLoading(false)
    }
  }, [cohort])

  useEffect(() => {
    void load()
  }, [load])

  /**
   * Write the stage and reload. `teamId: null` clears it. Every action goes
   * through here so there is one place that refetches, and so a failure leaves
   * the panel showing what the server actually holds rather than an optimistic
   * guess about a value judges are reading off their screens.
   */
  async function put(teamId: string | null) {
    if (!runId) return
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/admin/impact-lab/runs/${runId}`, "PATCH", {
        onStage: { teamId },
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change the stage")
    } finally {
      setBusy(false)
    }
  }

  const currentTeam = onStage
    ? (teams.find((team) => team.teamId === onStage.teamId) ?? null)
    : null
  const upNext = nextTableTeam(teams, onStage?.teamId ?? null)
  const sorted = [...teams].sort(byTable)

  return (
    <div className="space-y-3 rounded-lg border border-[#00ff41]/30 bg-[#0d0d0d] p-4">
      <p className="text-[10px] font-mono uppercase tracking-wider text-[#555]">On stage</p>

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-[#333]" />
      ) : !runId ? (
        <p className="text-[11px] font-mono text-[#555]">
          No final run yet — mark a run final before putting a team on stage.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {currentTeam ? (
              <span className="rounded bg-[#00ff41] px-2 py-0.5 font-mono text-[11px] text-[#0d0d0d]">
                {teamLabel(currentTeam)}
              </span>
            ) : onStage ? (
              // The stored id names nothing in this run — a team dropped after
              // it went on stage. Say so rather than rendering an empty pill.
              <span className="text-[11px] font-mono text-[#ffb000]">
                On stage: a team that is no longer in this run. Clear it.
              </span>
            ) : (
              <span className="text-[11px] font-mono text-[#555]">Nobody is on stage.</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="on-stage-team" className="sr-only">
              Team to put on stage
            </label>
            <select
              id="on-stage-team"
              value={choice}
              onChange={(event) => setChoice(event.target.value)}
              className="min-w-[16rem] rounded border border-[#1e1e1e] bg-[#111] px-2 py-1.5 text-[11px] font-mono text-[#e0e0e0]"
            >
              <option value="">Pick a team…</option>
              {sorted.map((team) => (
                <option key={team.teamId} value={team.teamId}>
                  {teamLabel(team)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void put(choice)}
              disabled={busy || !choice}
              className={PRIMARY_BUTTON}
            >
              Put on stage
            </button>
            <button
              type="button"
              onClick={() => upNext && void put(upNext.teamId)}
              disabled={busy || !upNext}
              title={upNext ? `Next: ${teamLabel(upNext)}` : "No further table with members"}
              className={BUTTON}
            >
              Next table{upNext ? ` (${upNext.table})` : ""}
            </button>
            <button
              type="button"
              onClick={() => void put(null)}
              disabled={busy || !onStage}
              className={BUTTON}
            >
              Clear
            </button>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#333]" />}
          </div>
        </>
      )}

      {error && (
        <p
          role="alert"
          className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]"
        >
          {error}
        </p>
      )}
    </div>
  )
}
