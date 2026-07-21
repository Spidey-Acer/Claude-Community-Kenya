"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, Plus, Trash2, Upload, Download } from "lucide-react"
import { apiGet, apiSend } from "./api"
import type { ParticipantRow } from "./types"

const EXPERIENCE = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const

const LEVEL_COLOR: Record<string, string> = {
  BEGINNER: "#8a8a8a",
  INTERMEDIATE: "#00d4ff",
  ADVANCED: "#00ff41",
}

/** Quote-aware CSV parser — good enough for Luma / Google Form exports. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ",") { row.push(field); field = "" }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = "" }
    else if (c !== "\r") field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim() !== ""))
}

const splitMulti = (v: string): string[] =>
  v.split(/[;,]/).map((s) => s.trim()).filter(Boolean)
const parseBool = (v: string): boolean => /^(true|yes|1|y)$/i.test(v.trim())

interface ParticipantsTabProps {
  cohort: string
}

const EMPTY_FORM = {
  fullName: "",
  email: "",
  primaryRole: "",
  experienceLevel: "BEGINNER" as (typeof EXPERIENCE)[number],
  technicalSkills: "",
  interests: "",
  availability: "",
  preferredTeammates: "",
  blockedTeammates: "",
  consentToMatch: true,
  consentToShareContact: false,
}

export function ParticipantsTab({ cohort }: ParticipantsTabProps) {
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setParticipants(await apiGet<ParticipantRow[]>(`/api/admin/impact-lab/participants?cohort=${cohort}`))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [cohort])

  useEffect(() => { void load() }, [load])

  async function addParticipant() {
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/admin/impact-lab/participants?cohort=${cohort}`, "POST", {
        fullName: form.fullName,
        email: form.email,
        primaryRole: form.primaryRole,
        experienceLevel: form.experienceLevel,
        technicalSkills: splitMulti(form.technicalSkills),
        interests: splitMulti(form.interests),
        availability: splitMulti(form.availability),
        preferredTeammates: splitMulti(form.preferredTeammates),
        blockedTeammates: splitMulti(form.blockedTeammates),
        consentToMatch: form.consentToMatch,
        consentToShareContact: form.consentToShareContact,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add")
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    setBusy(true)
    try {
      await apiSend(`/api/admin/impact-lab/participants/${id}`, "DELETE")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete")
    } finally {
      setBusy(false)
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setImportMsg(null)
    try {
      const rows = parseCsv(await file.text())
      if (rows.length < 2) throw new Error("CSV has no data rows")
      const headers = rows[0].map((h) => h.trim().toLowerCase())
      const idx = (name: string) => headers.indexOf(name.toLowerCase())
      const drafts = rows.slice(1).map((r) => {
        const get = (name: string) => (idx(name) >= 0 ? r[idx(name)] ?? "" : "")
        return {
          fullName: get("fullName"),
          email: get("email"),
          phone: get("phone") || null,
          institution: get("institution") || null,
          experienceLevel: (get("experienceLevel").toUpperCase() || "BEGINNER"),
          primaryRole: get("primaryRole"),
          secondaryRoles: splitMulti(get("secondaryRoles")),
          technicalSkills: splitMulti(get("technicalSkills")),
          interests: splitMulti(get("interests")),
          availability: splitMulti(get("availability")),
          preferredTeammates: splitMulti(get("preferredTeammates")),
          blockedTeammates: splitMulti(get("blockedTeammates")),
          consentToMatch: parseBool(get("consentToMatch")),
          consentToShareContact: parseBool(get("consentToShareContact")),
        }
      })
      const result = await apiSend<{ created: number; updated: number; failed: number }>(
        "/api/admin/impact-lab/participants/import",
        "POST",
        { cohort, participants: drafts }
      )
      setImportMsg(`${result.created} added, ${result.updated} updated, ${result.failed} skipped.`)
      await load()
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Import failed")
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const consenting = participants.filter((p) => p.consentToMatch).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-mono text-[#555]">
          {participants.length} participants · {consenting} consenting
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41] transition-all"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#888] transition-all"
          >
            <Upload className="w-3 h-3" /> Import CSV
          </button>
          <a
            href={`/api/admin/impact-lab/participants/export?cohort=${cohort}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#888] transition-all"
          >
            <Download className="w-3 h-3" /> Export
          </a>
          <input ref={fileRef} type="file" accept=".csv" onChange={onFile} className="hidden" />
        </div>
      </div>

      {importMsg && (
        <div className="p-2 bg-[#00d4ff]/10 border border-[#00d4ff]/30 rounded text-[11px] font-mono text-[#00d4ff]">{importMsg}</div>
      )}
      {error && (
        <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">{error}</div>
      )}

      {showForm && (
        <div className="p-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg grid grid-cols-2 gap-3">
          <Input label="Full name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
          <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Input label="Primary role" value={form.primaryRole} onChange={(v) => setForm({ ...form, primaryRole: v })} />
          <div>
            <label className="block text-[10px] font-mono text-[#555] mb-1 uppercase">Experience</label>
            <select
              value={form.experienceLevel}
              onChange={(e) => setForm({ ...form, experienceLevel: e.target.value as (typeof EXPERIENCE)[number] })}
              className="w-full bg-[#111] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs font-mono text-[#e0e0e0]"
            >
              {EXPERIENCE.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <Input label="Skills (; or ,)" value={form.technicalSkills} onChange={(v) => setForm({ ...form, technicalSkills: v })} />
          <Input label="Interests (; or ,)" value={form.interests} onChange={(v) => setForm({ ...form, interests: v })} />
          <Input label="Availability (; or ,)" value={form.availability} onChange={(v) => setForm({ ...form, availability: v })} />
          <Input label="Preferred teammates (emails)" value={form.preferredTeammates} onChange={(v) => setForm({ ...form, preferredTeammates: v })} />
          <div className="col-span-2 flex items-center gap-4">
            <Check label="Consent to match" checked={form.consentToMatch} onChange={(v) => setForm({ ...form, consentToMatch: v })} />
            <Check label="Consent to share contact" checked={form.consentToShareContact} onChange={(v) => setForm({ ...form, consentToShareContact: v })} />
            <button
              onClick={addParticipant}
              disabled={busy || !form.fullName || !form.email || !form.primaryRole}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41] disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Save
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-[#333] mx-auto" /></div>
        ) : participants.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono text-[#555]">No participants yet — add or import.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Name", "Role", "Level", "Skills", "Consent", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {participants.map((p) => (
                <tr key={p.id} className="hover:bg-[#111]">
                  <td className="px-4 py-3">
                    <div className="text-sm font-mono text-[#e0e0e0]">{p.fullName}</div>
                    <div className="text-[11px] font-mono text-[#444]">{p.email}</div>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono text-[#888]">{p.primaryRole}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ color: LEVEL_COLOR[p.experienceLevel], borderColor: `${LEVEL_COLOR[p.experienceLevel]}40` }}>{p.experienceLevel}</span>
                  </td>
                  <td className="px-4 py-3 text-[11px] font-mono text-[#666] max-w-xs truncate">{p.technicalSkills.join(", ")}</td>
                  <td className="px-4 py-3 text-[11px] font-mono">
                    <span className={p.consentToMatch ? "text-[#00ff41]" : "text-[#ff3333]"}>{p.consentToMatch ? "yes" : "no"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(p.id)} disabled={busy} className="text-[#ff3333]/70 hover:text-[#ff3333] disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-mono text-[#555] mb-1 uppercase">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-[#111] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs font-mono text-[#e0e0e0]" />
    </div>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[11px] font-mono text-[#888] cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="accent-[#00ff41]" />
      {label}
    </label>
  )
}
