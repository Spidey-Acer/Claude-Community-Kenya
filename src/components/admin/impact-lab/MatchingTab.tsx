"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Loader2, Play, RotateCcw, Sparkles, Save } from "lucide-react"
import { apiGet, apiSend } from "./api"
import type { DirectoryParticipant, MatchResponse, TeamExplanation } from "./types"
// Import path is the constants module directly (not the "@/lib/matching" barrel)
// so the client bundle gets only the constant objects, not the engine code.
import { DEFAULT_SETTINGS as ENGINE_DEFAULTS } from "@/lib/matching/constants"
// Types are erased at compile time, so importing from the types module (rather
// than the constants module) never pulls engine code into the client bundle.
import type { MatchWeightKey, MatchWeights } from "@/lib/matching/types"

interface MatchingTabProps {
  cohort: string
  onSaved: () => void
}

// Seed the form from the engine's defaults rather than re-hardcoding them here.
const DEFAULT_SETTINGS = {
  desiredTeamSize: ENGINE_DEFAULTS.desiredTeamSize,
  minTeamSize: ENGINE_DEFAULTS.minTeamSize,
  maxTeamSize: ENGINE_DEFAULTS.maxTeamSize,
  numberOfTeams: ENGINE_DEFAULTS.numberOfTeams,
  requireBuilder: ENGINE_DEFAULTS.requireBuilder,
  requirePresenter: ENGINE_DEFAULTS.requirePresenter,
  preventBeginnerOnlyTeams: ENGINE_DEFAULTS.preventBeginnerOnlyTeams,
  distributeAdvancedParticipants: ENGINE_DEFAULTS.distributeAdvancedParticipants,
  allowUnassignedParticipants: ENGINE_DEFAULTS.allowUnassignedParticipants,
  keepPreferredTogether: ENGINE_DEFAULTS.keepPreferredTogether,
  partitionByTrack: ENGINE_DEFAULTS.partitionByTrack,
  weights: ENGINE_DEFAULTS.weights,
}

type MatchTabSettings = typeof DEFAULT_SETTINGS

const STORAGE_KEY = "cck-impact-lab-match-settings"

const DIMENSION_LABEL: Record<string, string> = {
  roleCoverage: "Role coverage",
  skillBalance: "Skill diversity",
  experienceBalance: "Experience balance",
  interestAlignment: "Shared interests",
  availabilityOverlap: "Availability",
  participantPreferences: "Preferences",
}

const WEIGHT_META: { key: MatchWeightKey; label: string; description: string }[] = [
  { key: "roleCoverage", label: "Role coverage", description: "All five roles covered on each team" },
  { key: "skillBalance", label: "Skill balance", description: "Complementary, non-overlapping skills" },
  { key: "experienceBalance", label: "Experience balance", description: "Mix of levels + at least one experienced member" },
  { key: "interestAlignment", label: "Interest alignment", description: "Shared track — teams build one problem per track" },
  { key: "availabilityOverlap", label: "Availability overlap", description: "Members share committed time slots" },
  { key: "participantPreferences", label: "Participant preferences", description: "Requested teammates end up together" },
]

/**
 * Merges a stored settings object over the current defaults so old localStorage
 * payloads that predate a new field (e.g. keepPreferredTogether, weights) still
 * hydrate cleanly instead of leaving that field undefined.
 */
function mergeStoredSettings(stored: Partial<MatchTabSettings>): MatchTabSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    weights: { ...DEFAULT_SETTINGS.weights, ...(stored.weights ?? {}) },
  }
}

export function MatchingTab({ cohort, onSaved }: MatchingTabProps) {
  const [settings, setSettings] = useState<MatchTabSettings>(DEFAULT_SETTINGS)
  const [hydrated, setHydrated] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [data, setData] = useState<MatchResponse | null>(null)
  const [explanations, setExplanations] = useState<TeamExplanation[] | null>(null)
  const [generating, setGenerating] = useState(false)
  const [explaining, setExplaining] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runName, setRunName] = useState("")
  const [error, setError] = useState<string | null>(null)
  /** Run created automatically at generate time; explanations get patched onto it. */
  const [autoSavedRunId, setAutoSavedRunId] = useState<string | null>(null)
  const [autoSaveNote, setAutoSaveNote] = useState<string | null>(null)
  // Whether this cohort's event has any tracks defined — drives the "Group
  // by track" toggle. Fetched from the same events list the Events tab uses;
  // an event with no tracks means the toggle is shown but disabled, since
  // there's nothing to partition by.
  const [hasTracks, setHasTracks] = useState(false)

  useEffect(() => {
    let active = true
    apiGet<{ events: { cohort: string; tracks?: unknown }[] }>("/api/admin/impact-lab/events")
      .then((data) => {
        if (!active) return
        const event = data.events.find((e) => e.cohort === cohort)
        setHasTracks(Array.isArray(event?.tracks) && event.tracks.length > 0)
      })
      .catch(() => {
        if (active) setHasTracks(false)
      })
    return () => {
      active = false
    }
  }, [cohort])

  // localStorage is read after mount — reading it during render would make the
  // server and client HTML disagree and trigger a hydration error.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        setSettings(mergeStoredSettings(JSON.parse(raw) as Partial<MatchTabSettings>))
      }
    } catch {
      // Malformed or foreign localStorage payload — fall back to defaults.
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings, hydrated])

  const directory = useMemo(() => {
    const map = new Map<string, DirectoryParticipant>()
    data?.participants.forEach((p) => map.set(p.id, p))
    return map
  }, [data])

  const explByTeam = useMemo(() => {
    const map = new Map<string, TeamExplanation>()
    explanations?.forEach((e) => map.set(e.teamId, e))
    return map
  }, [explanations])

  async function generate() {
    setGenerating(true)
    setError(null)
    setExplanations(null)
    setAutoSavedRunId(null)
    setAutoSaveNote(null)
    try {
      const res = await apiSend<MatchResponse>("/api/admin/impact-lab/match", "POST", { cohort, settings })
      setData(res)

      // Auto-save immediately: a generated result that only lives in this tab
      // is one refresh away from being lost, and the reveal needs a SAVED run.
      // Named by clock time so successive runs stay tellable apart; rename or
      // delete from the Runs tab.
      try {
        const stamp = new Date().toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" })
        const run = await apiSend<{ id: string }>("/api/admin/impact-lab/runs", "POST", {
          cohort,
          name: `Auto-save · ${stamp}`,
          settings,
          result: res.result,
        })
        setAutoSavedRunId(run.id)
        setAutoSaveNote("Saved automatically — find it in the Runs tab.")
        onSaved()
      } catch (saveError) {
        setAutoSaveNote(
          `Generated, but auto-save failed: ${saveError instanceof Error ? saveError.message : "unknown error"}. Save manually below.`
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate")
    } finally {
      setGenerating(false)
    }
  }

  async function explain() {
    setExplaining(true)
    setError(null)
    try {
      const res = await apiSend<{ explanations: TeamExplanation[] }>("/api/admin/impact-lab/explain", "POST", { cohort, settings, expectedSignature: data?.signature })
      setExplanations(res.explanations)

      // Attach the writeups to the run auto-saved at generate time, so what
      // participants see on the reveal matches what's on screen here.
      if (autoSavedRunId) {
        try {
          await apiSend(`/api/admin/impact-lab/runs/${autoSavedRunId}`, "PATCH", {
            explanations: res.explanations,
          })
          setAutoSaveNote("Saved automatically, explanations attached — see the Runs tab.")
          onSaved()
        } catch {
          setAutoSaveNote("Explanations ready, but attaching them to the auto-saved run failed. Save manually below.")
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to explain")
    } finally {
      setExplaining(false)
    }
  }

  async function save() {
    if (!runName.trim()) return
    setSaving(true)
    setError(null)
    try {
      // The reviewed result and its explanations ride along so the run
      // freezes exactly what's on screen — profile edits by participants
      // between Generate and Save can no longer block the save with a 409.
      await apiSend("/api/admin/impact-lab/runs", "POST", { cohort, name: runName.trim(), settings, result: data?.result, expectedSignature: data?.signature, explanations: explanations ?? undefined })
      setRunName("")
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg space-y-3">
        <p className="text-[10px] font-mono text-[#555] uppercase tracking-wider">Settings</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Num label="Desired size" value={settings.desiredTeamSize} onChange={(v) => setSettings({ ...settings, desiredTeamSize: v })} />
          <Num label="Min size" value={settings.minTeamSize} onChange={(v) => setSettings({ ...settings, minTeamSize: v })} />
          <Num label="Max size" value={settings.maxTeamSize} onChange={(v) => setSettings({ ...settings, maxTeamSize: v })} />
        </div>
        <div className="flex flex-wrap gap-4">
          <Toggle label="Require builder" checked={settings.requireBuilder} onChange={(v) => setSettings({ ...settings, requireBuilder: v })} />
          <Toggle label="Require presenter" checked={settings.requirePresenter} onChange={(v) => setSettings({ ...settings, requirePresenter: v })} />
          <Toggle label="No beginner-only teams" checked={settings.preventBeginnerOnlyTeams} onChange={(v) => setSettings({ ...settings, preventBeginnerOnlyTeams: v })} />
          <Toggle label="Distribute advanced" checked={settings.distributeAdvancedParticipants} onChange={(v) => setSettings({ ...settings, distributeAdvancedParticipants: v })} />
          <Toggle label="Allow unassigned" checked={settings.allowUnassignedParticipants} onChange={(v) => setSettings({ ...settings, allowUnassignedParticipants: v })} />
          <Toggle
            label="Keep declared teammates together"
            checked={settings.keepPreferredTogether}
            onChange={(v) => setSettings({ ...settings, keepPreferredTogether: v })}
            helper="People who named each other on the Luma form are placed as one unit"
          />
          <Toggle
            label="Group by track"
            checked={settings.partitionByTrack}
            disabled={!hasTracks}
            onChange={(v) => setSettings({ ...settings, partitionByTrack: v })}
            helper={
              hasTracks
                ? "No team spans two tracks — define tracks in the Events tab"
                : "This event has no tracks defined (Events tab) — matching runs unpartitioned"
            }
          />
        </div>

        <div className="pt-1 border-t border-[#1e1e1e]">
          <button
            type="button"
            onClick={() => setAdvancedOpen((prev) => !prev)}
            aria-expanded={advancedOpen}
            aria-controls="matching-advanced-settings"
            className="flex items-center gap-1.5 pt-2 text-[10px] font-mono text-[#888] uppercase tracking-wider hover:text-[#e0e0e0]"
          >
            <ChevronRight className={`w-3 h-3 transition-transform ${advancedOpen ? "rotate-90" : ""}`} />
            Advanced settings
          </button>

          {advancedOpen && (
            <div id="matching-advanced-settings" className="pt-3 space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div className="w-40">
                  <label htmlFor="number-of-teams" className="block text-[10px] font-mono text-[#555] mb-1 uppercase">
                    Number of teams
                  </label>
                  <input
                    id="number-of-teams"
                    type="number"
                    min={1}
                    value={settings.numberOfTeams ?? ""}
                    placeholder="Auto"
                    onChange={(e) => {
                      const raw = e.target.value
                      setSettings({ ...settings, numberOfTeams: raw === "" ? null : Number(raw) })
                    }}
                    className="w-full bg-[#111] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs font-mono text-[#e0e0e0]"
                  />
                  <p className="text-[10px] font-mono text-[#555] mt-1">Leave blank to compute from team size</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings(DEFAULT_SETTINGS)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#161616] hover:bg-[#1e1e1e] border border-[#2a2a2a] rounded text-[11px] font-mono text-[#888]"
                >
                  <RotateCcw className="w-3 h-3" /> Reset to defaults
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {WEIGHT_META.map(({ key, label, description }) => (
                  <WeightSlider
                    key={key}
                    id={`weight-${key}`}
                    label={label}
                    description={description}
                    value={settings.weights[key]}
                    onChange={(v) => setSettings({ ...settings, weights: { ...settings.weights, [key]: v } as MatchWeights })}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button onClick={generate} disabled={generating} className="flex items-center gap-1.5 px-4 py-2 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[11px] font-mono font-semibold text-[#00ff41] disabled:opacity-40">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Generate teams
          </button>
          {data && (
            <button onClick={explain} disabled={explaining} className="flex items-center gap-1.5 px-4 py-2 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/30 rounded text-[11px] font-mono text-[#00d4ff] disabled:opacity-40">
              {explaining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} Explain with Claude
            </button>
          )}
        </div>
      </div>

      {error && <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">{error}</div>}

      {autoSaveNote && (
        <div
          role="status"
          className={`p-2 border rounded text-[11px] font-mono ${
            autoSavedRunId
              ? "bg-[#00ff41]/5 border-[#00ff41]/30 text-[#00ff41]"
              : "bg-[#ffb000]/5 border-[#ffb000]/30 text-[#ffb000]"
          }`}
        >
          {autoSaveNote}
        </div>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-mono text-[#888]">
              {data.result.teams.length} teams · avg score {data.result.averageScore}/100
              {data.result.unassignedIds.length > 0 && ` · ${data.result.unassignedIds.length} unassigned`}
            </p>
            <div className="flex items-center gap-2">
              <input value={runName} onChange={(e) => setRunName(e.target.value)} placeholder="Run name…" className="bg-[#111] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs font-mono text-[#e0e0e0] w-40" />
              <button onClick={save} disabled={saving || !runName.trim()} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffb000]/10 hover:bg-[#ffb000]/20 border border-[#ffb000]/30 rounded text-[11px] font-mono text-[#ffb000] disabled:opacity-40">
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save run
              </button>
            </div>
          </div>

          {data.result.warnings.length > 0 && (
            <div className="p-3 bg-[#ffb000]/5 border border-[#ffb000]/20 rounded text-[11px] font-mono text-[#ffb000] space-y-1">
              {data.result.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.result.teams.map((team) => {
              const expl = explByTeam.get(team.id)
              return (
                <div key={team.id} className="p-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-mono text-[#e0e0e0]">
                      {team.name}
                      {team.locked && <span className="ml-2 text-[10px] text-[#ffb000]">[locked]</span>}
                      {team.trackKey && (
                        <span className="ml-2 rounded border border-[#00d4ff]/30 px-1.5 py-0.5 text-[9px] text-[#00d4ff]">
                          {team.trackKey}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-mono font-bold text-[#00ff41]">{team.score.total}<span className="text-[#444] text-xs">/100</span></div>
                  </div>

                  <div className="space-y-1.5">
                    {team.memberIds.map((id) => {
                      const p = directory.get(id)
                      const role = expl?.suggestedInternalRoles?.[id]
                      return (
                        <div key={id} className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-[#aaa]">{p?.fullName ?? id}</span>
                          <span className="text-[#555]">{role ?? p?.primaryRole}{p ? ` · ${p.experienceLevel.toLowerCase()}` : ""}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="space-y-1 pt-1">
                    {team.score.dimensions.map((d) => (
                      <div key={d.key} className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#555] w-28 flex-shrink-0">{DIMENSION_LABEL[d.key]}</span>
                        <div className="flex-1 h-1.5 bg-[#161616] rounded overflow-hidden">
                          <div className="h-full bg-[#00ff41]/60" style={{ width: `${Math.round(d.raw * 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-[#666] w-8 text-right">{Math.round(d.raw * 100)}%</span>
                      </div>
                    ))}
                  </div>

                  {team.score.penalties.length > 0 && (
                    <div className="text-[10px] font-mono text-[#ff3333]/80 space-y-0.5">
                      {team.score.penalties.map((p, i) => <div key={i}>−{p.points} {p.reason}</div>)}
                    </div>
                  )}

                  {expl && (
                    <div className="pt-2 border-t border-[#161616] space-y-1.5 text-[11px] font-mono">
                      <p className="text-[#888]">{expl.summary}</p>
                      {expl.suggestedProjectDirection && <p className="text-[#00d4ff]">{expl.suggestedProjectDirection}</p>}
                      {expl.source === "deterministic" && <p className="text-[10px] text-[#444]">(deterministic summary)</p>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {data.result.unassignedIds.length > 0 && (
            <div className="p-3 bg-[#0d0d0d] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#888]">
              <span className="text-[#555]">Unassigned:</span> {data.result.unassignedIds.map((id) => directory.get(id)?.fullName ?? id).join(", ")}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-mono text-[#555] mb-1 uppercase">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-[#111] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs font-mono text-[#e0e0e0]" />
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  helper,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  helper?: string
  disabled?: boolean
}) {
  return (
    <label className={`flex flex-col gap-0.5 max-w-[220px] ${disabled ? "opacity-40" : ""}`}>
      <span
        className={`flex items-center gap-2 text-[11px] font-mono text-[#888] ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="accent-[#00ff41]"
        />
        {label}
      </span>
      {helper && <span className="text-[10px] font-mono text-[#555] pl-5">{helper}</span>}
    </label>
  )
}

function WeightSlider({
  id,
  label,
  description,
  value,
  onChange,
}: {
  id: string
  label: string
  description: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label htmlFor={id} className="text-[10px] font-mono text-[#555] uppercase">{label}</label>
        <span className="text-[10px] font-mono text-[#888]">{value.toFixed(1)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={5}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={value}
        aria-valuetext={value.toFixed(1)}
        className="w-full accent-[#00ff41]"
      />
      <p className="text-[10px] font-mono text-[#555]">{description}</p>
    </div>
  )
}
