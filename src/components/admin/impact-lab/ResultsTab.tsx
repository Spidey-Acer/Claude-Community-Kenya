"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  MessageSquareText,
  Save,
  Send,
  Sparkles,
  Trophy,
} from "lucide-react"
import { apiGet, apiSend } from "./api"
import { collapseAll, expandAll, reviewExcerpt, toggleOpen, type OpenSet } from "./reviewCollapse"
import { cn } from "@/lib/utils"
import type { SerializedRubric, TeamStanding } from "@/lib/impact-lab/judging"
import { buildRanking, buildTrackWinners, toPublicRanking, type ResultsInput } from "@/lib/impact-lab/results"

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
  const [rubric, setRubric] = useState<SerializedRubric | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, TeamDraftState>>({})
  // Persists after a team's card is removed from the list, so pressing Save
  // has a confirmation that outlives the card it belonged to.
  const [savedTeams, setSavedTeams] = useState<{ teamId: string; teamName: string }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiGet<{ teams: AwaitingTeam[]; rubric: SerializedRubric }>(
        `/api/admin/impact-lab/judging/writeup?cohort=${cohort}`
      )
      setTeams(data.teams)
      setRubric(data.rubric)
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

  if (loadError || !teams || !rubric) {
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
          const canSave = rubric.criteria.every((criterion) => {
            const value = state.scores[criterion.key]
            return (
              typeof value === "number" &&
              Number.isInteger(value) &&
              value >= criterion.min &&
              value <= criterion.max
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
                {rubric.criteria.map((criterion) => (
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
                      min={criterion.min}
                      max={criterion.max}
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

// ─── Publish ──────────────────────────────────────────────────────────────

interface PublishTeam {
  teamId: string
  teamName: string
  /** Resolved by the judging route from the team's `trackKey`, not parsed here. */
  track: string
  memberCount: number
  submission: { projectName: string } | null
}

interface JudgingData {
  finalRunId: string | null
  teams: PublishTeam[]
  standings: TeamStanding[]
}

interface PublishStatus {
  published: boolean
  publishedAt: string | null
  recipients: number
}

interface PublishResponse {
  publishedAt: string
  recipients: number
  /** How many teams were published as unscored participants. */
  unranked: number
}

const EMPTY_RESULTS_INPUT_EXTRAS = {
  publishedAt: new Date(0).toISOString(),
  writeupOnly: new Set<string>(),
  range: new Map<string, { low: number; high: number }>(),
}

/** Mirrors `src/lib/impact-lab/tracks.ts`'s `Track` — only the fields this screen needs. */
interface EventTrack {
  key: string
  label: string
}

/** The event's declared tracks for this cohort — `[]` for an event with none configured. */
async function loadEventTracks(cohort: string): Promise<EventTrack[]> {
  const data = await apiGet<{ events: { cohort: string; tracks?: EventTrack[] }[] }>(
    "/api/admin/impact-lab/events"
  )
  return data.events.find((e) => e.cohort === cohort)?.tracks ?? []
}

function teamOptionLabel(t: PublishTeam): string {
  return t.submission ? `${t.teamName} — ${t.submission.projectName}` : t.teamName
}

/** What `AnnouncementSelector` reports upward — enough to publish or correct with. */
interface AnnouncementSelection {
  mode: "podium" | "tracks"
  announcedTeamIds: string[]
  /**
   * True only when the operator is knowingly publishing an overall podium
   * that has the exact Impact Lab 02 fingerprint (ticked count equals track
   * count, every ticked team in a distinct track) — mirrors
   * `looksLikePerTrackWinners` in `@/lib/impact-lab/results-input` (not
   * imported directly: that module also carries a Prisma type import, and
   * this client component should not depend on where that boundary sits).
   * Both `publish/route.ts` and `correct/route.ts` run the same check
   * server-side and refuse without this flag — sending it here only when the
   * auto-preselect above was actually overridden, never by default, keeps
   * the server the actual source of truth.
   */
  confirmPodium: boolean
}

/**
 * Mirrors `looksLikePerTrackWinners` (`@/lib/impact-lab/results-input`) —
 * same fingerprint, same doc comment reasoning. Duplicated rather than
 * imported so this "use client" component never pulls in a module that also
 * carries a Prisma type import; keep the two in sync (see
 * `results-input.test.ts` for the canonical test coverage of this shape).
 */
function looksLikeTrackWinners(
  announcedTeamIds: readonly string[],
  trackByTeamId: ReadonlyMap<string, string>,
  trackCount: number
): boolean {
  if (announcedTeamIds.length === 0 || trackCount === 0) return false
  if (announcedTeamIds.length !== trackCount) return false
  const picked = announcedTeamIds.map((id) => trackByTeamId.get(id))
  if (picked.some((t) => t === undefined)) return false
  return new Set(picked).size === picked.length
}

const PODIUM_LABELS = ["1st place (announced)", "2nd place (announced)", "3rd place (announced)"]

/**
 * The team-picking widget shared by `PublishPanel` and `CorrectionPanel` — one
 * announcement-mode toggle plus the matching selection UI, so a publish and a
 * later correction can never disagree about what "tracks mode" even looks
 * like on screen.
 *
 * Owns its own selection state and reports only the derived
 * `{ mode, announcedTeamIds }` upward via `onChange` — the caller never feeds
 * a value back down, so there is no controlled-component loop to get wrong.
 *
 * Preselects "tracks" mode the moment the ticked podium slots are exactly one
 * team per track, in distinct tracks — the exact shape that silently produced
 * Impact Lab 02's wrong overall 1-2-3 (see the module doc comment on
 * `results.ts`). Never fires again once the operator has touched the mode
 * toggle themselves, so an explicit "podium" choice always sticks.
 */
function AnnouncementSelector({
  eligibleTeams,
  tracks,
  onChange,
}: {
  eligibleTeams: PublishTeam[]
  tracks: EventTrack[]
  onChange: (selection: AnnouncementSelection) => void
}) {
  const [mode, setMode] = useState<"podium" | "tracks">("podium")
  const [modeTouched, setModeTouched] = useState(false)
  const [podium, setPodium] = useState<[string, string, string]>(["", "", ""])
  const [byTrack, setByTrack] = useState<Record<string, string>>({})

  const podiumIds = useMemo(() => podium.filter((id) => id !== ""), [podium])
  const trackByTeamId = useMemo(
    () => new Map(eligibleTeams.map((t) => [t.teamId, t.track])),
    [eligibleTeams]
  )

  const podiumLooksLikeTracks = useMemo(
    () => looksLikeTrackWinners(podiumIds, trackByTeamId, tracks.length),
    [podiumIds, trackByTeamId, tracks.length]
  )

  useEffect(() => {
    if (modeTouched) return
    if (!podiumLooksLikeTracks) return
    setMode("tracks")
    const next: Record<string, string> = {}
    for (const id of podiumIds) {
      const track = trackByTeamId.get(id)
      if (track) next[track] = id
    }
    setByTrack(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [podiumLooksLikeTracks, podiumIds.join(","), modeTouched])

  const announcedTeamIds = useMemo(
    () => (mode === "tracks" ? Object.values(byTrack).filter((id) => id !== "") : podiumIds),
    [mode, byTrack, podiumIds]
  )

  // True exactly when the operator has explicitly overridden the auto-detect
  // above back to "podium" despite the ticked teams matching the per-track
  // fingerprint — see `AnnouncementSelection.confirmPodium`'s own doc
  // comment for why this is safe to derive rather than a separate checkbox.
  const confirmPodium = mode === "podium" && podiumLooksLikeTracks

  useEffect(() => {
    onChange({ mode, announcedTeamIds, confirmPodium })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, announcedTeamIds.join(","), confirmPodium])

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#555]">
          What was announced
        </span>
        <label className="flex items-center gap-1.5 text-[11px] font-mono text-[#e0e0e0]">
          <input
            type="radio"
            name="announcement-mode"
            checked={mode === "tracks"}
            disabled={tracks.length === 0}
            onChange={() => {
              setModeTouched(true)
              setMode("tracks")
            }}
            className="accent-[#00ff41]"
          />
          One winner per track
        </label>
        <label className="flex items-center gap-1.5 text-[11px] font-mono text-[#e0e0e0]">
          <input
            type="radio"
            name="announcement-mode"
            checked={mode === "podium"}
            onChange={() => {
              setModeTouched(true)
              setMode("podium")
            }}
            className="accent-[#00ff41]"
          />
          An overall podium (1st, 2nd, 3rd)
        </label>
        {tracks.length === 0 && (
          <span className="text-[10px] font-mono text-[#555]">
            (no tracks declared for this event — Events tab)
          </span>
        )}
      </div>

      {mode === "podium" ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {PODIUM_LABELS.map((label, i) => (
            <label key={label} className="block">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#555]">
                {label}
              </span>
              <select
                value={podium[i]}
                onChange={(e) => {
                  const next: [string, string, string] = [...podium]
                  next[i] = e.target.value
                  setPodium(next)
                }}
                className="mt-1 w-full rounded border border-[#1e1e1e] bg-[#111] px-2 py-1.5 text-[11px] font-mono text-[#e0e0e0] focus:border-[#00ff41] focus:outline-none"
              >
                <option value="">— not announced —</option>
                {eligibleTeams.map((t) => (
                  <option
                    key={t.teamId}
                    value={t.teamId}
                    disabled={podiumIds.includes(t.teamId) && t.teamId !== podium[i]}
                  >
                    {teamOptionLabel(t)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track) => {
            const options = eligibleTeams.filter((t) => t.track === track.label)
            const selected = byTrack[track.label] ?? ""
            return (
              <label key={track.key} className="block">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#555]">
                  {track.label} — winner
                </span>
                <select
                  value={selected}
                  onChange={(e) =>
                    setByTrack((prev) => ({ ...prev, [track.label]: e.target.value }))
                  }
                  className="mt-1 w-full rounded border border-[#1e1e1e] bg-[#111] px-2 py-1.5 text-[11px] font-mono text-[#e0e0e0] focus:border-[#00ff41] focus:outline-none"
                >
                  <option value="">— not announced —</option>
                  {options.map((t) => (
                    <option key={t.teamId} value={t.teamId}>
                      {teamOptionLabel(t)}
                    </option>
                  ))}
                </select>
              </label>
            )
          })}
        </div>
      )}

      {mode === "podium" && announcedTeamIds.length !== 3 && (
        <p className="text-[11px] font-mono text-[#ffb000]">
          {announcedTeamIds.length} of the usual 3 announced winners selected. Publishing with
          fewer (or none) ranks everyone by score alone — confirm this is intended before
          continuing.
        </p>
      )}

      {confirmPodium && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-3 text-[11px] font-mono text-[#ff3333]"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            This selection is one winner per track — the shape that produced Impact Lab 02&apos;s
            wrong podium. You have switched back to &ldquo;overall podium&rdquo; anyway, so the
            server will require an explicit override to accept it. Only continue if the panel
            genuinely announced an overall 1st/2nd/3rd, not one winner per track.
          </span>
        </div>
      )}
    </div>
  )
}

/** One announced team's read-back, from `preview-email`'s own `headline` field. */
interface AnnouncementHeadlineRow {
  teamId: string
  projectName: string
  headline: string
}

/**
 * The sentence an operator reads before confirming — "ElimuTayari will be
 * told: Runner-up — 3rd overall." One row per announced team (podium mode)
 * or per declared track winner (tracks mode — every id in `announcedTeamIds`
 * already IS that track's winner in this mode; see `AnnouncementSelector`).
 *
 * This is the actual fix for Impact Lab 02 (3 September 2026): the operator
 * ticked three teams and never saw the consequence before publishing: the
 * wrong podium was only caught two days later by reading the PDF. Each
 * sentence here is read off `preview-email`'s own `headline` — the same
 * `Placement` the real email renders from — so what an organiser reads here
 * cannot disagree with what a team actually receives. Calls
 * `preview-email`'s GET only: no write, no enqueue, nothing to undo if the
 * organiser changes their mind before pressing confirm.
 */
function AnnouncementHeadlines({
  cohort,
  mode,
  announcedTeamIds,
}: {
  cohort: string
  mode: "podium" | "tracks"
  announcedTeamIds: string[]
}) {
  const [rows, setRows] = useState<AnnouncementHeadlineRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (announcedTeamIds.length === 0) {
        setRows(null)
        setError(null)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const announcedParam = encodeURIComponent(announcedTeamIds.join(","))
        const results = await Promise.all(
          announcedTeamIds.map((teamId) =>
            apiGet<PreviewEmailData>(
              `/api/admin/impact-lab/results/preview-email?cohort=${cohort}` +
                `&teamId=${encodeURIComponent(teamId)}&announced=${announcedParam}` +
                `&announcementMode=${mode}`
            )
          )
        )
        if (cancelled) return
        setRows(
          results.map((r, i) => ({
            teamId: announcedTeamIds[i],
            projectName: r.projectName,
            headline: r.headline,
          }))
        )
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not read back what each team would be told.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [cohort, mode, announcedTeamIds.join(",")])

  if (announcedTeamIds.length === 0) return null

  return (
    <div className="space-y-1.5 rounded border border-[#00d4ff]/30 bg-[#00d4ff]/10 p-3">
      <p className="text-[10px] font-mono uppercase tracking-wider text-[#00d4ff]">
        What each team will be told
      </p>
      {loading && (
        <p className="text-[11px] font-mono text-[#888]">Reading back each team&apos;s email…</p>
      )}
      {error && (
        <p role="alert" className="text-[11px] font-mono text-[#ff3333]">
          {error}
        </p>
      )}
      {rows?.map((row) => (
        <p key={row.teamId} className="text-[11px] font-mono text-[#e0e0e0]">
          <span className="font-semibold">{row.projectName}</span> will be told: {row.headline}
        </p>
      ))}
    </div>
  )
}

/**
 * Section: publish results. A one-way door — see the route's own header
 * comment for why the snapshot it writes is never recomputed afterwards.
 *
 * The ranking preview reuses `buildRanking`/`buildTrackWinners` from
 * `@/lib/impact-lab/results` directly (that module is pure and dependency-free
 * for exactly this reason) so what an organiser previews here is produced by
 * the same code that computes the stored snapshot, not a second
 * reimplementation that could quietly drift from it.
 */
function PublishPanel({
  cohort,
  onAnnouncementChange,
}: {
  cohort: string
  /** Lifted so `PreviewEmailPanel` can preview exactly this selection. */
  onAnnouncementChange: (selection: AnnouncementSelection) => void
}) {
  const [judging, setJudging] = useState<JudgingData | null>(null)
  const [tracks, setTracks] = useState<EventTrack[]>([])
  const [publishStatus, setPublishStatus] = useState<PublishStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selection, setSelection] = useState<AnnouncementSelection>({
    mode: "podium",
    announcedTeamIds: [],
    confirmPodium: false,
  })

  const [confirmText, setConfirmText] = useState("")
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  // Off by default: publishing a team nobody judged is a deliberate choice,
  // never something an organiser drifts into by not reading the warning.
  const [allowUnscored, setAllowUnscored] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [judgingData, status, eventTracks] = await Promise.all([
        apiGet<JudgingData>(`/api/admin/impact-lab/judging?cohort=${cohort}`),
        apiGet<PublishStatus>(`/api/admin/impact-lab/results/publish?cohort=${cohort}`),
        loadEventTracks(cohort),
      ])
      setJudging(judgingData)
      setPublishStatus(status)
      setTracks(eventTracks)
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load results")
    } finally {
      setLoading(false)
    }
  }, [cohort])

  useEffect(() => {
    void load()
  }, [load])

  const submittedTeams = useMemo(
    () => judging?.teams.filter((t) => t.submission !== null) ?? [],
    [judging]
  )
  const scoredTeamIds = useMemo(
    () => new Set(judging?.standings.map((s) => s.teamId) ?? []),
    [judging]
  )
  const unscoredSubmitted = useMemo(
    () => submittedTeams.filter((t) => !scoredTeamIds.has(t.teamId)),
    [submittedTeams, scoredTeamIds]
  )
  // Only a team the panel actually scored can sensibly be announced as a winner.
  const eligibleWinners = useMemo(
    () => submittedTeams.filter((t) => scoredTeamIds.has(t.teamId)),
    [submittedTeams, scoredTeamIds]
  )
  // Unscored teams get a dashboard card, not an email: the results email is
  // built from a rank and a scorecard they do not have. Mirrors the filter the
  // publish route applies server-side.
  const recipientCount = useMemo(
    () =>
      submittedTeams
        .filter((t) => !allowUnscored || scoredTeamIds.has(t.teamId))
        .reduce((sum, t) => sum + t.memberCount, 0),
    [submittedTeams, scoredTeamIds, allowUnscored]
  )
  const announcedTeamIds = selection.announcedTeamIds

  function handleSelectionChange(next: AnnouncementSelection) {
    setSelection(next)
    onAnnouncementChange(next)
  }

  const preview = useMemo(() => {
    if (!judging) return null
    const teamsMeta = new Map<string, { projectName: string; track: string }>()
    for (const t of submittedTeams) {
      if (!t.submission) continue
      // The track comes from the server, resolved from how the matcher
      // partitioned the team. Parsing the team name here put every team in
      // "Unassigned" and previewed a single track winner for the whole event.
      teamsMeta.set(t.teamId, { projectName: t.submission.projectName, track: t.track })
    }
    const input: ResultsInput = {
      ...EMPTY_RESULTS_INPUT_EXTRAS,
      announcementMode: selection.mode,
      announcedTeamIds,
      standings: judging.standings,
      teams: teamsMeta,
    }
    const ranking = buildRanking(input)
    return {
      overall:
        selection.mode === "tracks"
          ? []
          : toPublicRanking(ranking.slice(0, announcedTeamIds.length)),
      trackWinners: buildTrackWinners(ranking, new Set(announcedTeamIds)),
      ranking: toPublicRanking(ranking),
    }
  }, [judging, submittedTeams, announcedTeamIds, selection.mode])

  async function publish() {
    setPublishing(true)
    setPublishError(null)
    try {
      const result = await apiSend<PublishResponse>(
        "/api/admin/impact-lab/results/publish",
        "POST",
        {
          cohort,
          announcedTeamIds,
          announcementMode: selection.mode,
          confirmPodium: selection.confirmPodium,
          confirm: confirmText,
          allowUnscored,
        }
      )
      setPublishStatus({ published: true, publishedAt: result.publishedAt, recipients: result.recipients })
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Could not publish results.")
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#333]" />
      </div>
    )
  }

  if (loadError || !judging) {
    return (
      <div className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]">
        {loadError ?? "No data"}
      </div>
    )
  }

  if (!judging.finalRunId) {
    return (
      <p className="p-8 text-center text-sm font-mono text-[#555]">
        No final run to publish yet — mark a run final to start judging.
      </p>
    )
  }

  if (publishStatus?.published) {
    return (
      <div className="space-y-4">
        <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Publish results</h2>
        <div className="flex items-start gap-3 rounded-lg border border-[#00ff41]/30 bg-[#00ff41]/10 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#00ff41]" />
          <div>
            <p className="text-[12px] font-mono font-semibold text-[#00ff41]">
              Results published
              {publishStatus.publishedAt &&
                ` on ${new Date(publishStatus.publishedAt).toLocaleString()}`}
            </p>
            <p className="mt-1 text-[11px] font-mono text-[#888]">
              {publishStatus.recipients} recipient{publishStatus.recipients === 1 ? "" : "s"}{" "}
              queued for the results email. Announced the wrong winners? Use the correction
              panel below the send section — it never sends a second email.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const unscoredNames = unscoredSubmitted
    .map((t) => t.submission?.projectName ?? t.teamName)
    .join(", ")

  const disabledReason =
    unscoredSubmitted.length > 0 && !allowUnscored
      ? `Every submitted team needs a score first: ${unscoredNames}`
      : confirmText !== "PUBLISH"
        ? 'Type PUBLISH to confirm.'
        : null

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Publish results</h2>
          <p className="mt-1 text-[11px] font-mono text-[#888]">
            A one-way door. This closes submissions and judging, freezes the result, and
            queues one email per recipient. It cannot be undone or run twice.
          </p>
        </div>
        {/* Scoring a team happens in the section above, whose own fetch this
            panel does not share — refresh after scoring the last team rather
            than reloading the page. */}
        <button
          type="button"
          onClick={() => void load()}
          className="shrink-0 rounded border border-[#1e1e1e] bg-[#1a1a1a] px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-[#888] hover:bg-[#222]"
        >
          Refresh
        </button>
      </div>

      {unscoredSubmitted.length > 0 && (
        <div
          role="alert"
          className={`flex items-start gap-2 rounded border p-3 text-[11px] font-mono ${
            allowUnscored
              ? "border-[#ffb000]/30 bg-[#ffb000]/10 text-[#ffb000]"
              : "border-[#ff3333]/30 bg-[#ff3333]/10 text-[#ff3333]"
          }`}
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {allowUnscored
              ? `${unscoredSubmitted.length} submitted team${
                  unscoredSubmitted.length === 1 ? "" : "s"
                } will be published as participants with no rank and no results email: ${unscoredNames}`
              : `Every submitted team needs a score first: ${unscoredNames}`}
          </span>
        </div>
      )}

      {unscoredSubmitted.length > 0 && (
        <label className="flex items-start gap-2 text-[11px] font-mono text-[#888]">
          <input
            type="checkbox"
            checked={allowUnscored}
            onChange={(e) => setAllowUnscored(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#ffb000]"
          />
          <span>
            Publish with unscored teams as participants ({unscoredSubmitted.length}{" "}
            team{unscoredSubmitted.length === 1 ? "" : "s"}). They are left out of the
            ranking and every winner list, and their members see &ldquo;not scored in the
            finals&rdquo; on their own card instead of nothing.
          </span>
        </label>
      )}

      <AnnouncementSelector
        eligibleTeams={eligibleWinners}
        tracks={tracks}
        onChange={handleSelectionChange}
      />

      {preview && (
        <div className="space-y-4 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-4">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#555]">
            Preview — exactly what participants will see, by position only
          </p>

          {preview.overall.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Trophy className="h-3.5 w-3.5 shrink-0 text-[#ffb000]" />
              {preview.overall.map((row) => (
                <span
                  key={row.teamId}
                  className="rounded border border-[#ffb000]/30 bg-[#ffb000]/10 px-2 py-1 text-[11px] font-mono text-[#ffb000]"
                >
                  #{row.rank} {row.projectName}
                </span>
              ))}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {preview.trackWinners.map((w) => (
              <div key={w.track} className="rounded border border-[#1e1e1e] bg-[#111] p-2">
                <p className="truncate text-[9px] font-mono uppercase tracking-wider text-[#555]">
                  {w.track}
                </p>
                <p className="truncate text-[11px] font-mono text-[#e0e0e0]">{w.projectName}</p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded border border-[#1e1e1e]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  {["Position", "Project", "Track"].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-mono font-semibold uppercase tracking-wider text-[#555]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {preview.ranking.map((row) => (
                  <tr key={row.teamId}>
                    <td className="px-3 py-2 text-[11px] font-mono text-[#555]">{row.rank}</td>
                    <td className="px-3 py-2 text-[11px] font-mono text-[#e0e0e0]">
                      {row.projectName}
                    </td>
                    <td className="px-3 py-2 text-[11px] font-mono text-[#888]">{row.track}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] font-mono text-[#888]">
            <span className="font-semibold text-[#00ff41]">{recipientCount}</span> recipient
            {recipientCount === 1 ? "" : "s"} will be queued for the results email (estimate —
            the exact count is confirmed by the server at publish time).
          </p>
        </div>
      )}

      <AnnouncementHeadlines cohort={cohort} mode={selection.mode} announcedTeamIds={announcedTeamIds} />

      <label className="block max-w-xs">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#555]">
          Type PUBLISH to confirm
        </span>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="PUBLISH"
          className="mt-1 w-full rounded border border-[#1e1e1e] bg-[#111] px-2 py-1.5 text-[11px] font-mono uppercase text-[#e0e0e0] focus:border-[#ff3333] focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void publish()}
          disabled={disabledReason !== null || publishing}
          className="flex items-center gap-2 rounded border border-[#ff3333]/40 bg-[#ff3333]/10 px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-[#ff3333] transition-colors hover:bg-[#ff3333]/20 disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          {publishing ? "Publishing…" : "Publish results"}
        </button>
        {disabledReason && (
          <span className="text-[11px] font-mono text-[#888]">{disabledReason}</span>
        )}
        {publishError && (
          <span role="alert" className="text-[11px] font-mono text-[#ff3333]">
            {publishError}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Correct a published result ────────────────────────────────────────────

/** What `/results/correct`'s GET returns for one side of the current-vs-proposed comparison. */
interface AnnouncementView {
  announcementMode: "podium" | "tracks"
  overall: { rank: number; teamId: string; projectName: string }[]
  trackWinners: { track: string; teamId: string; projectName: string; basis: string }[]
}

function announcementSummary(view: AnnouncementView, nameById: Map<string, string>): {
  label: string
  lines: string[]
} {
  if (view.announcementMode === "tracks") {
    return {
      label: "One winner per track",
      lines: view.trackWinners.map((w) => `${w.track}: ${w.projectName} (${nameById.get(w.teamId) ?? w.teamId})`),
    }
  }
  return {
    label: "Overall podium",
    lines: view.overall.map((w) => `#${w.rank} ${w.projectName} (${nameById.get(w.teamId) ?? w.teamId})`),
  }
}

/**
 * Section: correct an already-published result. Visible only once
 * `publish/route.ts` has actually published a run — a run with nothing
 * published has nothing to correct, and `correct/route.ts` itself refuses
 * with `NOT_PUBLISHED` for the same reason.
 *
 * Deliberately built on the same `AnnouncementSelector` `PublishPanel` uses —
 * a correction is "pick the right winners again", not a different kind of
 * decision, and two separate pickers is exactly how a publish screen and a
 * correction screen could quietly disagree about what "tracks mode" means.
 *
 * States plainly, on screen and every time: this rewrites the results pages
 * and share cards, and sends no email. The 85 emails already sent for the
 * wrong announcement stay sent — nobody gets a second one.
 */
function CorrectionPanel({ cohort }: { cohort: string }) {
  const [published, setPublished] = useState<boolean | null>(null)
  const [judging, setJudging] = useState<JudgingData | null>(null)
  const [tracks, setTracks] = useState<EventTrack[]>([])
  const [current, setCurrent] = useState<AnnouncementView | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selection, setSelection] = useState<AnnouncementSelection>({
    mode: "podium",
    announcedTeamIds: [],
    confirmPodium: false,
  })
  const [proposed, setProposed] = useState<AnnouncementView | null>(null)

  const [confirmText, setConfirmText] = useState("")
  const [correcting, setCorrecting] = useState(false)
  const [correctError, setCorrectError] = useState<string | null>(null)
  const [correctedAt, setCorrectedAt] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [status, judgingData, eventTracks] = await Promise.all([
        apiGet<{ published: boolean }>(`/api/admin/impact-lab/results/publish?cohort=${cohort}`),
        apiGet<JudgingData>(`/api/admin/impact-lab/judging?cohort=${cohort}`),
        loadEventTracks(cohort),
      ])
      setPublished(status.published)
      setJudging(judgingData)
      setTracks(eventTracks)
      if (status.published) {
        const view = await apiGet<{ current: AnnouncementView; proposed: AnnouncementView | null }>(
          `/api/admin/impact-lab/results/correct?cohort=${cohort}`
        )
        setCurrent(view.current)
      } else {
        setCurrent(null)
      }
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load the published result")
    } finally {
      setLoading(false)
    }
  }, [cohort])

  useEffect(() => {
    void load()
  }, [load])

  const nameById = useMemo(
    () => new Map((judging?.teams ?? []).map((t) => [t.teamId, teamOptionLabel(t)])),
    [judging]
  )
  const eligibleWinners = useMemo(() => {
    if (!judging) return []
    const scoredTeamIds = new Set(judging.standings.map((s) => s.teamId))
    return judging.teams.filter((t) => t.submission !== null && scoredTeamIds.has(t.teamId))
  }, [judging])

  // The proposed preview comes from the server (same `buildSnapshot` path
  // `correct/route.ts`'s POST commits with) rather than being computed again
  // here — one function decides what an announcement produces, not two.
  useEffect(() => {
    let cancelled = false
    async function loadProposal() {
      if (selection.announcedTeamIds.length === 0) {
        setProposed(null)
        return
      }
      try {
        const data = await apiGet<{ current: AnnouncementView; proposed: AnnouncementView | null }>(
          `/api/admin/impact-lab/results/correct?cohort=${cohort}` +
            `&announcedTeamIds=${encodeURIComponent(selection.announcedTeamIds.join(","))}` +
            `&announcementMode=${selection.mode}`
        )
        if (!cancelled) setProposed(data.proposed)
      } catch {
        if (!cancelled) setProposed(null)
      }
    }
    void loadProposal()
    return () => {
      cancelled = true
    }
  }, [cohort, selection.mode, selection.announcedTeamIds])

  async function correct() {
    setCorrecting(true)
    setCorrectError(null)
    try {
      const result = await apiSend<{ publishedAt: string }>(
        "/api/admin/impact-lab/results/correct",
        "POST",
        {
          cohort,
          announcedTeamIds: selection.announcedTeamIds,
          announcementMode: selection.mode,
          confirmPodium: selection.confirmPodium,
          confirm: confirmText,
        }
      )
      setCorrectedAt(result.publishedAt)
      setConfirmText("")
      await load()
    } catch (e) {
      setCorrectError(e instanceof Error ? e.message : "Could not correct results.")
    } finally {
      setCorrecting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#333]" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]">
        {loadError}
      </div>
    )
  }

  // Nothing to correct until something has actually been published.
  if (!published || !current) {
    return (
      <p className="p-8 text-center text-sm font-mono text-[#555]">
        Publish results above to unlock corrections.
      </p>
    )
  }

  const disabledReason =
    selection.announcedTeamIds.length === 0
      ? "Pick at least one announced winner."
      : confirmText !== "CORRECT"
        ? "Type CORRECT to confirm."
        : null

  const currentSummary = announcementSummary(current, nameById)
  const proposedSummary = proposed ? announcementSummary(proposed, nameById) : null

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">
          Correct a published result
        </h2>
        <p className="mt-1 text-[11px] font-mono text-[#888]">
          Rewrites the results pages and share cards to say what the panel actually announced.
          It sends no email — the recipients already sent keep their mail exactly as it was,
          and nobody receives a second one. Use this only to fix a wrong announcement, not to
          re-run publish.
        </p>
      </div>

      <div className="rounded border border-[#1e1e1e] bg-[#0d0d0d] p-3">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[#555]">
          Currently announced — {currentSummary.label}
        </p>
        <ul className="mt-1 space-y-0.5">
          {currentSummary.lines.length === 0 ? (
            <li className="text-[11px] font-mono text-[#555]">Nothing announced (score order only).</li>
          ) : (
            currentSummary.lines.map((line) => (
              <li key={line} className="text-[11px] font-mono text-[#e0e0e0]">
                {line}
              </li>
            ))
          )}
        </ul>
      </div>

      <AnnouncementSelector eligibleTeams={eligibleWinners} tracks={tracks} onChange={setSelection} />

      {proposedSummary && (
        <div className="rounded border border-[#ffb000]/30 bg-[#ffb000]/10 p-3">
          <p className="text-[10px] font-mono uppercase tracking-wider text-[#ffb000]">
            Proposed — {proposedSummary.label}
          </p>
          <ul className="mt-1 space-y-0.5">
            {proposedSummary.lines.map((line) => (
              <li key={line} className="text-[11px] font-mono text-[#e0e0e0]">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AnnouncementHeadlines
        cohort={cohort}
        mode={selection.mode}
        announcedTeamIds={selection.announcedTeamIds}
      />

      <label className="block max-w-xs">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#555]">
          Type CORRECT to confirm
        </span>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="CORRECT"
          className="mt-1 w-full rounded border border-[#1e1e1e] bg-[#111] px-2 py-1.5 text-[11px] font-mono uppercase text-[#e0e0e0] focus:border-[#ffb000] focus:outline-none"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void correct()}
          disabled={disabledReason !== null || correcting}
          className="flex items-center gap-2 rounded border border-[#ffb000]/40 bg-[#ffb000]/10 px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-[#ffb000] transition-colors hover:bg-[#ffb000]/20 disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {correcting ? "Correcting…" : "Correct results"}
        </button>
        {disabledReason && (
          <span className="text-[11px] font-mono text-[#888]">{disabledReason}</span>
        )}
        {correctError && (
          <span role="alert" className="text-[11px] font-mono text-[#ff3333]">
            {correctError}
          </span>
        )}
        {correctedAt && !correctError && (
          <span className="text-[11px] font-mono text-[#00ff41]">
            Corrected — results pages and share cards now reflect this. No email was sent.
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Team reviews ───────────────────────────────────────────────────────────

interface ReviewJudgeNote {
  judgeName: string
  text: string
}

interface ReviewRecord {
  text: string
  generatedBy: string
  editedAt: string | null
  approvedAt: string | null
  updatedAt: string
}

interface ReviewTeam {
  teamId: string
  teamName: string
  projectName: string
  track: string
  judgeNotes: ReviewJudgeNote[]
  review: ReviewRecord | null
}

interface ReviewTeamState {
  /** Local edit of the review text; null = not touched, show the server's. */
  draftText: string | null
  busy: "generate" | "save" | "approve" | null
  /** Set after a 409 REVIEW_PROTECTED — the next generate press sends force. */
  confirmRegenerate: boolean
  error: string | null
}

function emptyReviewState(): ReviewTeamState {
  return { draftText: null, busy: null, confirmRegenerate: false, error: null }
}

interface GenerateBatchResult {
  generated: number
  remaining: number
  failed?: string[]
}

/**
 * Section: the written review every team receives.
 *
 * A judging panel returns scores and, as a rule, little written feedback —
 * so a team that built through the night would otherwise get a handful of
 * numbers and silence. This section drafts a substantive review per team
 * (signed "Claude Community Kenya" — never attributed to a judge), and gives
 * the organiser the pen: read each one, edit any of it, approve. Nothing
 * reaches a participant until it is approved, and a draft the organiser has
 * edited is never regenerated over without an explicit second confirmation.
 *
 * Any notes a judge did write are shown read-only beside the review — they
 * publish as quotes under the judge's name, and the review is written to sit
 * alongside them, so the organiser should see both together.
 *
 * With a full cohort this is a long list, so each team is a collapsible
 * card: a one-line header (name, table, status, excerpt) that opens to the
 * full editor. Open state is local, keyed by team id so it survives the
 * reloads that Save / Approve / Generate trigger, and never index-based.
 */
function ReviewsSection({ cohort }: { cohort: string }) {
  const [teams, setTeams] = useState<ReviewTeam[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [states, setStates] = useState<Record<string, ReviewTeamState>>({})
  const [generatingAll, setGeneratingAll] = useState(false)
  const [generateAllStatus, setGenerateAllStatus] = useState<string | null>(null)
  /** Team ids whose card is expanded. Everything starts collapsed. */
  const [openIds, setOpenIds] = useState<OpenSet>(() => new Set())

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ teams: ReviewTeam[] }>(
        `/api/admin/impact-lab/reviews?cohort=${cohort}`
      )
      setTeams(data.teams)
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load reviews")
    } finally {
      setLoading(false)
    }
  }, [cohort])

  useEffect(() => {
    void load()
  }, [load])

  const stateFor = useCallback(
    (teamId: string): ReviewTeamState => states[teamId] ?? emptyReviewState(),
    [states]
  )

  const patch = useCallback((teamId: string, next: Partial<ReviewTeamState>) => {
    setStates((prev) => ({
      ...prev,
      [teamId]: { ...(prev[teamId] ?? emptyReviewState()), ...next },
    }))
  }, [])

  const counts = useMemo(() => {
    const total = teams?.length ?? 0
    const drafted = teams?.filter((t) => t.review !== null).length ?? 0
    const approved = teams?.filter((t) => t.review?.approvedAt).length ?? 0
    return { total, drafted, approved }
  }, [teams])

  /** Teams whose local edit differs from the server's text — never bulk-collapsed. */
  const dirtyIds = useMemo(
    () =>
      (teams ?? [])
        .filter((t) => {
          const draft = states[t.teamId]?.draftText ?? null
          return draft !== null && draft !== (t.review?.text ?? "")
        })
        .map((t) => t.teamId),
    [teams, states]
  )

  const allIds = useMemo(() => (teams ?? []).map((t) => t.teamId), [teams])
  const openCount = allIds.filter((id) => openIds.has(id)).length
  const allOpen = allIds.length > 0 && openCount === allIds.length
  /** Open cards a bulk collapse would actually close — dirty ones are exempt. */
  const collapsibleCount = allIds.filter((id) => openIds.has(id) && !dirtyIds.includes(id)).length

  const toggleCard = useCallback((teamId: string) => {
    setOpenIds((prev) => toggleOpen(prev, teamId))
  }, [])

  /**
   * Fill every gap: the server drafts a few teams per call and reports how
   * many are left, so this loops until nothing remains — and stops when a
   * call makes no progress, so one persistently failing team cannot spin
   * this forever. Existing drafts (edited or not) are never overwritten.
   */
  async function generateAll() {
    setGeneratingAll(true)
    setGenerateAllStatus(null)
    try {
      let total = 0
      for (;;) {
        const result = await apiSend<GenerateBatchResult>(
          `/api/admin/impact-lab/reviews?cohort=${cohort}`,
          "POST",
          { action: "generate" }
        )
        total += result.generated
        setGenerateAllStatus(
          `Generated ${total} so far — ${result.remaining} remaining…`
        )
        await load()
        if (result.remaining === 0 || result.generated === 0) {
          setGenerateAllStatus(
            result.remaining === 0
              ? `Done — ${total} draft${total === 1 ? "" : "s"} generated. Read and edit each one below, then approve.`
              : `Generated ${total}; ${result.remaining} could not be drafted right now (${(result.failed ?? []).join(", ") || "try again"}). You can retry or write them by hand.`
          )
          break
        }
      }
    } catch (e) {
      setGenerateAllStatus(null)
      setLoadError(e instanceof Error ? e.message : "Generation failed.")
    } finally {
      setGeneratingAll(false)
    }
  }

  async function generateOne(teamId: string, force: boolean) {
    patch(teamId, { busy: "generate", error: null })
    try {
      await apiSend(`/api/admin/impact-lab/reviews?cohort=${cohort}`, "POST", {
        action: "generate",
        teamId,
        ...(force ? { force: true } : {}),
      })
      patch(teamId, { busy: null, draftText: null, confirmRegenerate: false })
      await load()
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not generate."
      // The protected-review refusal: arm the confirm step instead of erroring.
      const isProtected = message.includes("edited or approved")
      patch(teamId, {
        busy: null,
        confirmRegenerate: isProtected,
        error: isProtected ? null : message,
      })
    }
  }

  async function save(teamId: string) {
    const state = stateFor(teamId)
    if (state.draftText === null) return
    patch(teamId, { busy: "save", error: null })
    try {
      await apiSend(`/api/admin/impact-lab/reviews?cohort=${cohort}`, "POST", {
        action: "save",
        teamId,
        text: state.draftText,
      })
      patch(teamId, { busy: null, draftText: null })
      await load()
    } catch (e) {
      patch(teamId, {
        busy: null,
        error: e instanceof Error ? e.message : "That did not save.",
      })
    }
  }

  async function setApproval(teamId: string, approve: boolean) {
    patch(teamId, { busy: "approve", error: null })
    try {
      await apiSend(`/api/admin/impact-lab/reviews?cohort=${cohort}`, "POST", {
        action: approve ? "approve" : "unapprove",
        teamId,
      })
      patch(teamId, { busy: null })
      await load()
    } catch (e) {
      patch(teamId, {
        busy: null,
        error: e instanceof Error ? e.message : "Could not update approval.",
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

  if (loadError && !teams) {
    return (
      <div className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]">
        {loadError}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Team reviews</h2>
        <p className="mt-1 text-[11px] font-mono text-[#888]">
          A written review for every team, signed Claude Community Kenya. The panel returns
          scores and little written feedback, so Claude drafts a review from each team&apos;s
          own submission; you read, edit, and approve. Only approved reviews reach the
          dashboard, the results email, and the exports.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void generateAll()}
          disabled={generatingAll || (teams?.length ?? 0) === 0}
          className="flex items-center gap-2 rounded border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-[#00d4ff] transition-colors hover:bg-[#00d4ff]/20 disabled:opacity-40"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {generatingAll ? "Generating…" : "Generate missing drafts"}
        </button>
        <span className="text-[11px] font-mono text-[#888]">
          {counts.drafted}/{counts.total} drafted ·{" "}
          <span className={counts.approved === counts.total && counts.total > 0 ? "text-[#00ff41]" : ""}>
            {counts.approved}/{counts.total} approved
          </span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOpenIds(expandAll(allIds))}
            disabled={allOpen || allIds.length === 0}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#888] transition-colors hover:text-[#D97757] disabled:opacity-40 disabled:hover:text-[#888]"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden />
            Expand all
          </button>
          <span className="h-3 w-px bg-[#1e1e1e]" aria-hidden />
          <button
            type="button"
            onClick={() => setOpenIds(collapseAll(dirtyIds))}
            disabled={collapsibleCount === 0}
            title={dirtyIds.length > 0 ? "Cards with unsaved edits stay open." : undefined}
            className="flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#888] transition-colors hover:text-[#D97757] disabled:opacity-40 disabled:hover:text-[#888]"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" aria-hidden />
            Collapse all
          </button>
        </div>
      </div>

      {generateAllStatus && (
        <div
          role="status"
          className="rounded border border-[#00d4ff]/30 bg-[#00d4ff]/10 p-3 text-[11px] font-mono text-[#00d4ff]"
        >
          {generateAllStatus}
        </div>
      )}

      {loadError && (
        <div className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]">
          {loadError}
        </div>
      )}

      {(teams ?? []).length === 0 ? (
        <p className="p-8 text-center text-sm font-mono text-[#555]">
          No submitted teams yet — reviews are written about submissions.
        </p>
      ) : (
        <div className="space-y-2">
          {(teams ?? []).map((team) => (
            <ReviewCard
              key={team.teamId}
              team={team}
              state={stateFor(team.teamId)}
              open={openIds.has(team.teamId)}
              generatingAll={generatingAll}
              onToggle={() => toggleCard(team.teamId)}
              onEdit={(value) => patch(team.teamId, { draftText: value })}
              onGenerate={(force) => void generateOne(team.teamId, force)}
              onSave={() => void save(team.teamId)}
              onApprove={(approve) => void setApproval(team.teamId, approve)}
            />
          ))}
        </div>
      )}

      <p className="flex items-start gap-2 text-[11px] font-mono text-[#888]">
        <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#00d4ff]" aria-hidden />
        <span>
          Reviews publish signed &ldquo;Claude Community Kenya&rdquo; with a line saying the
          community wrote them — never as a judge&apos;s words. A judge&apos;s own notes publish
          separately, quoted under the judge&apos;s name, exactly as they wrote them (spelling
          fixed).
        </span>
      </p>
    </div>
  )
}

interface ReviewCardProps {
  team: ReviewTeam
  state: ReviewTeamState
  open: boolean
  /** A bulk generate is running — per-card generate is paused meanwhile. */
  generatingAll: boolean
  onToggle: () => void
  onEdit: (text: string) => void
  onGenerate: (force: boolean) => void
  onSave: () => void
  onApprove: (approve: boolean) => void
}

/**
 * The Claude-orange rule along a card's top edge: a hairline that fades to
 * nothing at both ends, brighter with a soft glow while the card is open.
 * Sits exactly on the card's border so it reads as the divider between
 * cards rather than a second line. Decorative only.
 */
function ReviewDivider({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-3 -top-px h-px bg-[linear-gradient(90deg,transparent,#D97757_22%,#D97757_78%,transparent)] transition-[opacity,box-shadow] duration-300 motion-reduce:transition-none",
        active ? "opacity-100 shadow-[0_0_12px_1px_rgba(217,119,87,0.45)]" : "opacity-45"
      )}
    />
  )
}

/**
 * One team's review as a collapsible card.
 *
 * The header is a single button (project name, table + track, a one-line
 * excerpt, status) so the whole row is the toggle and keyboard users get
 * aria-expanded for free. The body animates open on grid-template-rows —
 * no measuring, no jank — and is `inert` while closed so a hidden textarea
 * can never receive focus or a Tab stop. All review actions (generate,
 * save, approve) are the parent's; this component only renders and reports.
 */
function ReviewCard({
  team,
  state,
  open,
  generatingAll,
  onToggle,
  onEdit,
  onGenerate,
  onSave,
  onApprove,
}: ReviewCardProps) {
  const serverText = team.review?.text ?? ""
  const text = state.draftText ?? serverText
  const dirty = state.draftText !== null && state.draftText !== serverText
  const approved = Boolean(team.review?.approvedAt)
  const edited = Boolean(team.review?.editedAt)
  const excerpt = reviewExcerpt(text)
  const bodyId = `review-${team.teamId}`
  const headingId = `review-${team.teamId}-heading`

  return (
    <div
      className={cn(
        "relative rounded-lg border bg-[#0d0d0d] transition-[border-color,box-shadow] duration-300 motion-reduce:transition-none",
        open
          ? "border-[#D97757]/30 shadow-[0_0_36px_-14px_rgba(217,119,87,0.55)]"
          : "border-[#1e1e1e] hover:border-[#2a2a2a]"
      )}
    >
      <ReviewDivider active={open} />

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className={cn(
          "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 rounded-t-lg px-4 py-3 text-left md:grid-cols-[auto_minmax(0,auto)_minmax(0,1fr)_auto]",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#D97757]/60",
          open && "bg-[linear-gradient(180deg,rgba(217,119,87,0.06),transparent_85%)]"
        )}
      >
        <ChevronRight
          aria-hidden
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-300 motion-reduce:transition-none",
            open ? "rotate-90 text-[#D97757]" : "text-[#555]"
          )}
        />
        <span className="min-w-0">
          <span
            id={headingId}
            className="block truncate text-[12px] font-mono font-semibold text-[#e0e0e0]"
          >
            {team.projectName}
          </span>
          <span className="block truncate text-[11px] font-mono text-[#888]">{team.teamName}</span>
        </span>
        <span
          aria-hidden={open}
          className={cn(
            "hidden min-w-0 truncate text-[11px] font-mono transition-opacity duration-200 motion-reduce:transition-none md:block",
            excerpt ? "text-[#666]" : "text-[#444]",
            open ? "opacity-0" : "opacity-100"
          )}
        >
          {excerpt || "No draft yet"}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {dirty && (
            <span className="rounded border border-[#ffb000]/40 bg-[#ffb000]/10 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#ffb000]">
              Unsaved
            </span>
          )}
          <span
            className={
              approved
                ? "rounded border border-[#00ff41]/40 bg-[#00ff41]/10 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#00ff41]"
                : team.review
                  ? "rounded border border-[#ffb000]/40 bg-[#ffb000]/10 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#ffb000]"
                  : "rounded border border-[#1e1e1e] bg-[#111] px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#555]"
            }
          >
            {approved ? "Approved" : team.review ? (edited ? "Edited draft" : "Draft") : "No review"}
          </span>
        </span>
      </button>

      <div
        id={bodyId}
        role="region"
        aria-labelledby={headingId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-3 px-4 pb-4 pt-1">
            {team.judgeNotes.map((note) => (
              <div
                key={`${note.judgeName}-${note.text.slice(0, 24)}`}
                className="rounded border border-[#ffb000]/30 bg-[#ffb000]/5 p-3"
              >
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#ffb000]">
                  Judge&apos;s note — {note.judgeName} (publishes as a quote under the judge&apos;s
                  name)
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[11px] font-mono italic text-[#ccc]">
                  &ldquo;{note.text}&rdquo;
                </p>
              </div>
            ))}

            {team.review && (
              <p className="text-[10px] font-mono text-[#555]">
                Drafted by {team.review.generatedBy}
                {edited ? " · edited by organiser" : ""}
                {" · "}last updated {new Date(team.review.updatedAt).toLocaleString()}
              </p>
            )}

            <textarea
              value={text}
              onChange={(e) => onEdit(e.target.value)}
              rows={9}
              placeholder="No draft yet — generate one, or write the review here yourself."
              aria-label={`Impact Lab review for ${team.projectName}`}
              className="w-full rounded border border-[#1e1e1e] bg-[#111] px-3 py-2 text-[12px] font-mono leading-relaxed text-[#e0e0e0] focus:border-[#00ff41] focus:outline-none"
            />

            {state.confirmRegenerate && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded border border-[#ffb000]/30 bg-[#ffb000]/10 p-3 text-[11px] font-mono text-[#ffb000]"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  This review has been edited or approved — your words, not a draft.
                  Regenerating replaces them and clears approval. Press
                  &ldquo;Regenerate anyway&rdquo; only if that is what you want.
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onGenerate(state.confirmRegenerate)}
                disabled={state.busy !== null || generatingAll}
                className="flex items-center gap-2 rounded border border-[#00d4ff]/30 bg-[#00d4ff]/10 px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-[#00d4ff] transition-colors hover:bg-[#00d4ff]/20 disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {state.busy === "generate"
                  ? "Generating…"
                  : state.confirmRegenerate
                    ? "Regenerate anyway"
                    : team.review
                      ? "Regenerate"
                      : "Generate draft"}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={!dirty || text.trim() === "" || state.busy !== null}
                className="flex items-center gap-2 rounded border border-[#00ff41]/40 bg-[#00ff41]/10 px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-[#00ff41] transition-colors hover:bg-[#00ff41]/20 disabled:opacity-40"
              >
                <Save className="h-3.5 w-3.5" />
                {state.busy === "save" ? "Saving…" : "Save"}
              </button>
              {team.review && (
                <button
                  type="button"
                  onClick={() => onApprove(!approved)}
                  disabled={state.busy !== null || dirty}
                  title={dirty ? "Save your edit first, then approve what you saved." : undefined}
                  className={
                    approved
                      ? "flex items-center gap-2 rounded border border-[#1e1e1e] bg-[#1a1a1a] px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-[#888] transition-colors hover:bg-[#222] disabled:opacity-40"
                      : "flex items-center gap-2 rounded border border-[#00ff41]/40 bg-[#00ff41]/10 px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-[#00ff41] transition-colors hover:bg-[#00ff41]/20 disabled:opacity-40"
                  }
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {state.busy === "approve"
                    ? "Working…"
                    : approved
                      ? "Unapprove"
                      : "Approve"}
                </button>
              )}
              {state.error && (
                <span role="alert" className="text-[11px] font-mono text-[#ff3333]">
                  {state.error}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Preview a team's email ─────────────────────────────────────────────────

interface PreviewEmailOption {
  teamId: string
  teamName: string
  projectName: string
}

interface PreviewEmailData {
  html: string
  subject: string
  teamName: string
  projectName: string
  recipientCount: number
  /** Whether this was read off the frozen post-publish snapshot, or computed live. */
  published: boolean
  /**
   * The one-line sentence this team's email actually says — "Runner-up — 3rd
   * overall.", "Winner of the Kilimo track." — read straight off the same
   * `Placement` the email renders from. See `announcementHeadline` on the
   * server for why this exists: Impact Lab 02's wrong podium was caught two
   * days later by reading the PDF, not before the click that sent it.
   */
  headline: string
}

/**
 * Section: preview a team's real results email before any of the 93 go out.
 *
 * Sits between publish and send, in that order on screen, because that is
 * the order it is meant to be used in: check a real email renders correctly,
 * then publish (or, if already published, spot-check before pressing send
 * below).
 *
 * The server route this calls builds the HTML with the exact
 * `impactLabResultsEmail()` template the batch send uses — no second
 * renderer — so what is shown here cannot drift from what actually goes
 * out. It only ever reads; nothing is sent and nothing is written.
 */
function PreviewEmailPanel({
  cohort,
  announcementMode,
  announcedTeamIds,
}: {
  cohort: string
  announcementMode: "podium" | "tracks"
  announcedTeamIds: string[]
}) {
  const [teams, setTeams] = useState<PreviewEmailOption[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState("")
  const [preview, setPreview] = useState<PreviewEmailData | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await apiGet<JudgingData>(`/api/admin/impact-lab/judging?cohort=${cohort}`)
        if (cancelled) return
        const submitted = data.teams
          .filter((t) => t.submission !== null)
          .map((t) => ({
            teamId: t.teamId,
            teamName: t.teamName,
            projectName: t.submission?.projectName ?? t.teamName,
          }))
        setTeams(submitted)
        setLoadError(null)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load teams")
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [cohort])

  // Re-render whenever the announced winners OR the announcement mode
  // change: a preview showing a placing (or a podium/tracks shape) the
  // organiser has since altered is worse than no preview.
  useEffect(() => {
    if (selectedTeamId !== "") void loadPreview(selectedTeamId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcedTeamIds.join(","), announcementMode])

  async function loadPreview(teamId: string) {
    setSelectedTeamId(teamId)
    setPreview(null)
    setPreviewError(null)
    if (teamId === "") return
    setLoadingPreview(true)
    try {
      const data = await apiGet<PreviewEmailData>(
        // The announced winners are part of what the email says — they decide
        // the overall placing AND which team leads each track. Sending them,
        // together with the announcement mode, means a pre-publish preview
        // renders what publishing would actually produce, rather than the
        // score-only (always-podium) ranking the panel overrode.
        `/api/admin/impact-lab/results/preview-email?cohort=${cohort}&teamId=${encodeURIComponent(teamId)}` +
          `&announcementMode=${announcementMode}` +
          (announcedTeamIds.length > 0
            ? `&announced=${encodeURIComponent(announcedTeamIds.join(","))}`
            : "")
      )
      setPreview(data)
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Could not render a preview for that team.")
    } finally {
      setLoadingPreview(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">
          Preview a team&apos;s email
        </h2>
        <p className="mt-1 text-[11px] font-mono text-[#888]">
          Renders the exact email one team will receive — same template, same numbers — so you
          can check it before any of the 93 go out. Nothing on this screen sends mail.
        </p>
      </div>

      {loadError && (
        <div className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]">
          {loadError}
        </div>
      )}

      <label className="block max-w-md">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#555]">Team</span>
        <select
          value={selectedTeamId}
          onChange={(e) => void loadPreview(e.target.value)}
          className="mt-1 w-full rounded border border-[#1e1e1e] bg-[#111] px-2 py-1.5 text-[11px] font-mono text-[#e0e0e0] focus:border-[#00ff41] focus:outline-none"
        >
          <option value="">— pick a team —</option>
          {(teams ?? []).map((t) => (
            <option key={t.teamId} value={t.teamId}>
              {t.teamName} — {t.projectName}
            </option>
          ))}
        </select>
      </label>

      {loadingPreview && (
        <div className="p-8 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#333]" />
        </div>
      )}

      {previewError && (
        <div
          role="alert"
          className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]"
        >
          {previewError}
        </div>
      )}

      {preview && (
        <div className="space-y-3 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-4">
          {!preview.published && (
            <div
              role="status"
              className="flex items-start gap-2 rounded border border-[#ffb000]/30 bg-[#ffb000]/10 p-3 text-[11px] font-mono text-[#ffb000]"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Computed from current data, including the winners selected above;
                publishing will freeze exactly this.
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 shrink-0 text-[#00d4ff]" />
            <p className="text-[11px] font-mono text-[#888]">
              Subject: <span className="text-[#e0e0e0]">{preview.subject}</span>
            </p>
          </div>
          <p className="text-[11px] font-mono text-[#888]">
            <span className="font-semibold text-[#00ff41]">{preview.recipientCount}</span>{" "}
            recipient{preview.recipientCount === 1 ? "" : "s"} on {preview.teamName} —{" "}
            {preview.projectName}
          </p>

          <iframe
            title={`Email preview — ${preview.projectName}`}
            srcDoc={preview.html}
            sandbox=""
            className="h-[640px] w-full rounded border border-[#1e1e1e] bg-[#0a0a0a]"
          />
        </div>
      )}
    </div>
  )
}

// ─── Notify ───────────────────────────────────────────────────────────────

interface NotifyCounts {
  queued: number
  sent: number
  failed: number
}

interface NotifyResult {
  sent: number
  failed: number
  remaining: number
}

/**
 * Section: send the results email. Only meaningful once results are
 * published, which it checks independently (the same endpoint PublishPanel
 * checks) rather than sharing PublishPanel's internal state — that keeps this
 * section appendable without touching the two above it.
 *
 * Resumable by construction: "Send next 25" always asks the server for
 * whichever rows are still unsent, never a specific set — see the route's own
 * doc comment for why that means a repeat press (after a partial failure, a
 * timeout, or just clearing the whole cohort in batches) can only ever move
 * `remaining` toward zero, never mail the same person twice.
 */
function NotifyPanel({ cohort }: { cohort: string }) {
  const [published, setPublished] = useState<boolean | null>(null)
  const [counts, setCounts] = useState<NotifyCounts | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<NotifyResult | null>(null)

  const [testEmail, setTestEmail] = useState("")
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [status, notifyCounts] = await Promise.all([
        apiGet<{ published: boolean }>(`/api/admin/impact-lab/results/publish?cohort=${cohort}`),
        apiGet<NotifyCounts>(`/api/admin/impact-lab/results/notify?cohort=${cohort}`),
      ])
      setPublished(status.published)
      setCounts(notifyCounts)
      setLoadError(null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load send status.")
    }
  }, [cohort])

  useEffect(() => {
    void load()
  }, [load])

  async function sendNext() {
    setSending(true)
    setSendError(null)
    try {
      const result = await apiSend<NotifyResult>("/api/admin/impact-lab/results/notify", "POST", {
        cohort,
      })
      setLastResult(result)
      await load()
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Could not send.")
    } finally {
      setSending(false)
    }
  }

  async function sendTest() {
    setTestSending(true)
    setTestError(null)
    setTestResult(null)
    try {
      const result = await apiSend<NotifyResult>("/api/admin/impact-lab/results/notify", "POST", {
        cohort,
        testEmail,
      })
      setTestResult(
        result.sent > 0 ? `Sent to ${testEmail}.` : "Could not send — check the address and try again."
      )
    } catch (e) {
      setTestError(e instanceof Error ? e.message : "Could not send test email.")
    } finally {
      setTestSending(false)
    }
  }

  if (published === null && !loadError) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#333]" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]">
        {loadError}
      </div>
    )
  }

  if (!published) {
    return (
      <p className="p-8 text-center text-sm font-mono text-[#555]">
        Publish results above to unlock the send panel.
      </p>
    )
  }

  const remaining = counts ? counts.queued + counts.failed : 0

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Send results email</h2>
        <p className="mt-1 text-[11px] font-mono text-[#888]">
          Sends the standalone results email — winners and each team&apos;s own scorecard — to
          every published recipient. Resumable: a repeat press only reaches whoever is still
          unsent.
        </p>
      </div>

      <div
        role="alert"
        className="flex items-start gap-2 rounded border border-[#ffb000]/30 bg-[#ffb000]/10 p-3 text-[11px] font-mono text-[#ffb000]"
      >
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Resend allows 100 emails per day. There are 93 recipients — one clean run fits, a
          repeated run does not. Test sends below count against that same 100.
        </span>
      </div>

      {counts && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Queued", value: counts.queued, color: "#888" },
            { label: "Sent", value: counts.sent, color: "#00ff41" },
            { label: "Failed", value: counts.failed, color: "#ff3333" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded border border-[#1e1e1e] bg-[#0d0d0d] p-3 text-center"
            >
              <p className="text-lg font-mono font-bold" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#555]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void sendNext()}
          disabled={sending || remaining === 0}
          className="flex items-center gap-2 rounded border border-[#00ff41]/40 bg-[#00ff41]/10 px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-[#00ff41] transition-colors hover:bg-[#00ff41]/20 disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
          {sending ? "Sending…" : "Send next 25"}
        </button>
        {remaining === 0 && counts && (
          <span className="text-[11px] font-mono text-[#00ff41]">Everyone has been sent.</span>
        )}
        {lastResult && (
          <span className="text-[11px] font-mono text-[#888]">
            Last batch: {lastResult.sent} sent, {lastResult.failed} failed, {lastResult.remaining}{" "}
            remaining.
          </span>
        )}
        {sendError && (
          <span role="alert" className="text-[11px] font-mono text-[#ff3333]">
            {sendError}
          </span>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-4">
        <label className="block max-w-sm">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#555]">
            Send to one address first
          </span>
          <div className="mt-1 flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded border border-[#1e1e1e] bg-[#111] px-2 py-1.5 text-[11px] font-mono text-[#e0e0e0] focus:border-[#00ff41] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void sendTest()}
              disabled={testSending || testEmail.trim() === ""}
              className="shrink-0 rounded border border-[#00d4ff]/40 bg-[#00d4ff]/10 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-[#00d4ff] transition-colors hover:bg-[#00d4ff]/20 disabled:opacity-40"
            >
              {testSending ? "Sending…" : "Send test"}
            </button>
          </div>
        </label>
        {testResult && <p className="text-[11px] font-mono text-[#00ff41]">{testResult}</p>}
        {testError && (
          <p role="alert" className="text-[11px] font-mono text-[#ff3333]">
            {testError}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────

/**
 * Section: export the complete record — an Excel workbook and a PDF, built
 * on request and streamed to the browser (never written to disk or a
 * bucket; both files carry every participant's name and email).
 *
 * Checks the publish endpoint only to phrase the copy honestly: after
 * publication the exports carry the announced placings alongside the raw
 * score order; before it, there is only score order and the files say so.
 */
/** Reads the server-set filename off Content-Disposition; falls back if absent or unparsable. */
function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback
  const match = header.match(/filename="?([^"；;]+)"?/)
  return match ? match[1] : fallback
}

function ExportPanel({ cohort }: { cohort: string }) {
  const [published, setPublished] = useState<boolean | null>(null)
  // Which export is currently being built server-side, so the trigger can
  // show visible progress instead of the founder "waiting there as a fool" —
  // an <a href> download gives no lifecycle to hook into, so this fetches the
  // file itself and hands the browser a blob to save.
  const [building, setBuilding] = useState<"xlsx" | "pdf" | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    apiGet<{ published: boolean }>(`/api/admin/impact-lab/results/publish?cohort=${cohort}`)
      .then((status) => {
        if (!cancelled) setPublished(status.published)
      })
      // The downloads work either way — an unknown status only softens the copy.
      .catch(() => {
        if (!cancelled) setPublished(null)
      })
    return () => {
      cancelled = true
    }
  }, [cohort])

  async function download(format: "xlsx" | "pdf") {
    setBuilding(format)
    setExportError(null)
    try {
      const res = await fetch(`/api/admin/impact-lab/results/export?cohort=${cohort}&format=${format}`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(
          (body && typeof body.error === "string" && body.error) ||
            `Could not build the ${format === "xlsx" ? "Excel workbook" : "PDF"}.`
        )
      }
      const blob = await res.blob()
      const filename = filenameFromDisposition(
        res.headers.get("Content-Disposition"),
        `impact-lab-results-${cohort}.${format}`
      )
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Could not build that export.")
    } finally {
      setBuilding(null)
    }
  }

  const exports = [
    {
      format: "xlsx",
      label: "Excel workbook",
      description:
        "Five sheets — Results, Submissions, Judging detail, Participants, Summary. The working record: sortable, filterable, complete.",
      Icon: FileSpreadsheet,
      accentClass: "text-[#00ff41]",
    },
    {
      format: "pdf",
      label: "PDF record",
      description:
        "Cover, winners, full ranking, then a page per team with its submission and every judge's feedback. A4, made for print.",
      Icon: FileText,
      accentClass: "text-[#00d4ff]",
    },
  ] as const

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Export the record</h2>
        <p className="mt-1 text-[11px] font-mono text-[#888]">
          The complete results of the event in one file — what every team built, how it was
          judged, and who won. Generated fresh on each download; nothing is stored.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {exports.map(({ format, label, description, Icon, accentClass }) => {
          const isBuilding = building === format
          return (
            <button
              key={format}
              type="button"
              onClick={() => void download(format)}
              disabled={building !== null}
              className="group flex items-start gap-3 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-4 text-left transition-colors hover:border-[#333] hover:bg-[#111] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBuilding ? (
                <Loader2 className={`mt-0.5 h-5 w-5 shrink-0 animate-spin ${accentClass}`} aria-hidden />
              ) : (
                <Icon
                  className={`mt-0.5 h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 ${accentClass}`}
                  aria-hidden
                />
              )}
              <span>
                <span className="block text-[12px] font-mono font-semibold text-[#e0e0e0]">
                  {isBuilding ? `Building ${format === "xlsx" ? "Excel" : "PDF"}…` : label}
                </span>
                <span className="mt-1 block text-[11px] font-mono leading-relaxed text-[#888]">
                  {description}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {building && (
        <p role="status" className="text-[11px] font-mono text-[#888]">
          Generating the full report from the judging records — usually takes about ten seconds.
        </p>
      )}

      {exportError && (
        <p role="alert" className="text-[11px] font-mono text-[#ff3333]">
          {exportError}
        </p>
      )}

      <div className="space-y-2 rounded border border-[#ffb000]/30 bg-[#ffb000]/10 p-3 text-[11px] font-mono text-[#ffb000]">
        <p>
          {published
            ? "Ranks in both files show the announced placing (the panel's deliberated podium) and the raw score order side by side, each labelled — the two disagree by design."
            : "Results are not published yet, so both files rank by raw score order only, and say so."}
        </p>
        <p>
          Teams no judge reached are marked &quot;scored from written submission&quot; wherever
          their scores appear — they submitted on time and did not miss anything.
        </p>
      </div>

      <p className="flex items-start gap-2 text-[11px] font-mono text-[#888]">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ff3333]" aria-hidden />
        <span>
          Both files contain every participant&apos;s name and email. Share them deliberately.
        </span>
      </p>
    </div>
  )
}

/**
 * Results tab — organiser-facing surfaces for closing out judging.
 *
 * Starts with the one section this program needs first: the teams the panel
 * never reached. The publish panel follows, then team reviews, then the email
 * preview panel, then the send panel — reviews sit above the preview because
 * the preview renders them, and the preview sits above send deliberately,
 * since it exists to be checked before pressing send; screen order should
 * teach that order of use. Each section is its own component rendered in a
 * simple stack, fetching its own data independently.
 */
export function ResultsTab({ cohort }: { cohort: string }) {
  // The announced selection lives here, not inside PublishPanel, because two
  // panels depend on it: the one that publishes and the one that previews
  // what publishing would send. While this state was private to PublishPanel,
  // the preview had no way to read it and rendered the score-only ranking —
  // so it showed a different champion and different track winners than the
  // email it was supposed to be previewing. Carries `mode` alongside the ids
  // (not just a bare id list) since "who" and "podium or per-track" are the
  // same decision — a preview built from the ids alone, defaulting to
  // podium, is exactly the shape that mislabelled Impact Lab 02's per-track
  // calls as an overall 1-2-3.
  const [announcement, setAnnouncement] = useState<AnnouncementSelection>({
    mode: "podium",
    announcedTeamIds: [],
    confirmPodium: false,
  })

  return (
    <div className="space-y-6">
      <AwaitingScoreSection cohort={cohort} />
      <div className="border-t border-[#1e1e1e] pt-6">
        <PublishPanel cohort={cohort} onAnnouncementChange={setAnnouncement} />
      </div>
      <div className="border-t border-[#1e1e1e] pt-6">
        <ReviewsSection cohort={cohort} />
      </div>
      <div className="border-t border-[#1e1e1e] pt-6">
        <PreviewEmailPanel
          cohort={cohort}
          announcementMode={announcement.mode}
          announcedTeamIds={announcement.announcedTeamIds}
        />
      </div>
      <div className="border-t border-[#1e1e1e] pt-6">
        <NotifyPanel cohort={cohort} />
      </div>
      <div className="border-t border-[#1e1e1e] pt-6">
        <CorrectionPanel cohort={cohort} />
      </div>
      <div className="border-t border-[#1e1e1e] pt-6">
        <ExportPanel cohort={cohort} />
      </div>
    </div>
  )
}
