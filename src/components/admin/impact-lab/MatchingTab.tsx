"use client"

import { useMemo, useState } from "react"
import { Loader2, Play, Sparkles, Save } from "lucide-react"
import { apiSend } from "./api"
import type { DirectoryParticipant, MatchResponse, TeamExplanation } from "./types"
// Import path is the constants module directly (not the "@/lib/matching" barrel)
// so the client bundle gets only the constant objects, not the engine code.
import { DEFAULT_SETTINGS as ENGINE_DEFAULTS } from "@/lib/matching/constants"

interface MatchingTabProps {
  cohort: string
  onSaved: () => void
}

// Seed the form from the engine's defaults rather than re-hardcoding them here.
const DEFAULT_SETTINGS = {
  desiredTeamSize: ENGINE_DEFAULTS.desiredTeamSize,
  minTeamSize: ENGINE_DEFAULTS.minTeamSize,
  maxTeamSize: ENGINE_DEFAULTS.maxTeamSize,
  requireBuilder: ENGINE_DEFAULTS.requireBuilder,
  requirePresenter: ENGINE_DEFAULTS.requirePresenter,
  preventBeginnerOnlyTeams: ENGINE_DEFAULTS.preventBeginnerOnlyTeams,
  distributeAdvancedParticipants: ENGINE_DEFAULTS.distributeAdvancedParticipants,
  allowUnassignedParticipants: ENGINE_DEFAULTS.allowUnassignedParticipants,
}

const DIMENSION_LABEL: Record<string, string> = {
  roleCoverage: "Role coverage",
  skillBalance: "Skill diversity",
  experienceBalance: "Experience balance",
  interestAlignment: "Shared interests",
  availabilityOverlap: "Availability",
  participantPreferences: "Preferences",
}

export function MatchingTab({ cohort, onSaved }: MatchingTabProps) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [data, setData] = useState<MatchResponse | null>(null)
  const [explanations, setExplanations] = useState<TeamExplanation[] | null>(null)
  const [generating, setGenerating] = useState(false)
  const [explaining, setExplaining] = useState(false)
  const [saving, setSaving] = useState(false)
  const [runName, setRunName] = useState("")
  const [error, setError] = useState<string | null>(null)

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
    try {
      setData(await apiSend<MatchResponse>("/api/admin/impact-lab/match", "POST", { cohort, settings }))
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
      await apiSend("/api/admin/impact-lab/runs", "POST", { cohort, name: runName.trim(), settings, expectedSignature: data?.signature })
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
        <div className="grid grid-cols-3 gap-3">
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
                    <div className="text-sm font-mono text-[#e0e0e0]">{team.name}{team.locked && <span className="ml-2 text-[10px] text-[#ffb000]">[locked]</span>}</div>
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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] font-mono text-[#888] cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[#00ff41]" />
      {label}
    </label>
  )
}
