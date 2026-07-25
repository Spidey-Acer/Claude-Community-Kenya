"use client"

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, Plus, Trash2, Upload, Download, Pencil, Search, Save, X, Mail } from "lucide-react"
import { apiGet, apiSend } from "./api"
import { isLumaExport, mapLumaRows } from "@/lib/impact-lab/luma"
import type { ParticipantRow } from "./types"

const EXPERIENCE = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const

const LEVEL_COLOR: Record<string, string> = {
  BEGINNER: "#8a8a8a",
  INTERMEDIATE: "#00d4ff",
  ADVANCED: "#00ff41",
}

const TRACK_COLOR = "#ffb000"
const TEAMMATES_COLOR = "#00d4ff"

/** Which slice of the cohort a notify blast targets — see /api/admin/impact-lab/notify. */
type EmailGroup = "all" | "first" | "second"
const GROUP_LABEL: Record<EmailGroup, string> = { all: "All", first: "1st half", second: "2nd half" }

interface NotifyResult {
  sent: number
  failed: number
  recipients: number
  group: EmailGroup
  cohortSize: number
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

/** Editable subset of a participant, mirrored as comma/semicolon-joined strings for text inputs. */
interface EditFormState {
  fullName: string
  email: string
  phone: string
  institution: string
  experienceLevel: (typeof EXPERIENCE)[number]
  primaryRole: string
  technicalSkills: string
  interests: string
  availability: string
  preferredTeammates: string
  projectIdeas: string
  consentToMatch: boolean
  consentToShareContact: boolean
}

function toEditForm(p: ParticipantRow): EditFormState {
  return {
    fullName: p.fullName,
    email: p.email,
    phone: p.phone ?? "",
    institution: p.institution ?? "",
    experienceLevel: p.experienceLevel,
    primaryRole: p.primaryRole,
    technicalSkills: p.technicalSkills.join(", "),
    interests: p.interests.join(", "),
    availability: p.availability.join(", "),
    preferredTeammates: p.preferredTeammates.join(", "),
    projectIdeas: p.projectIdeas ?? "",
    consentToMatch: p.consentToMatch,
    consentToShareContact: p.consentToShareContact,
  }
}

export function ParticipantsTab({ cohort }: ParticipantsTabProps) {
  const [participants, setParticipants] = useState<ParticipantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [notifying, setNotifying] = useState<EmailGroup | null>(null)
  const [notifyResult, setNotifyResult] = useState<NotifyResult | null>(null)
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
      if (editingId === id) { setEditingId(null); setEditForm(null) }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete")
    } finally {
      setBusy(false)
    }
  }

  function startEdit(p: ParticipantRow) {
    setError(null)
    setEditingId(p.id)
    setEditForm(toEditForm(p))
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(null)
  }

  async function saveEdit() {
    if (!editingId || !editForm) return
    setBusy(true)
    setError(null)
    try {
      const updated = await apiSend<ParticipantRow>(`/api/admin/impact-lab/participants/${editingId}`, "PATCH", {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone || null,
        institution: editForm.institution || null,
        experienceLevel: editForm.experienceLevel,
        primaryRole: editForm.primaryRole,
        technicalSkills: splitMulti(editForm.technicalSkills),
        interests: splitMulti(editForm.interests),
        availability: splitMulti(editForm.availability),
        preferredTeammates: splitMulti(editForm.preferredTeammates),
        projectIdeas: editForm.projectIdeas || null,
        consentToMatch: editForm.consentToMatch,
        consentToShareContact: editForm.consentToShareContact,
      })
      setParticipants((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
      cancelEdit()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update")
    } finally {
      setBusy(false)
    }
  }

  async function sendOnboardingEmails(group: EmailGroup) {
    const n = participants.length
    const firstHalf = Math.ceil(n / 2)
    const secondHalf = n - firstHalf
    const confirmText =
      group === "all"
        ? `Email account-setup instructions to all ${n} participants? This sends real email.`
        : group === "first"
        ? `Email account-setup instructions to the first half (~${firstHalf} of ${n} participants)? This sends real email.`
        : `Email account-setup instructions to the second half (~${secondHalf} of ${n} participants)? This sends real email.`
    if (!window.confirm(confirmText)) return
    setNotifying(group)
    setError(null)
    setNotifyResult(null)
    try {
      const result = await apiSend<NotifyResult>(
        "/api/admin/impact-lab/notify",
        "POST",
        { type: "onboarding", group }
      )
      setNotifyResult(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send emails")
    } finally {
      setNotifying(null)
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setImportMsg(null)
    try {
      // Luma exports lead with a UTF-8 BOM; strip it or the first header
      // ("guest_id") never matches and format detection silently fails.
      const rows = parseCsv((await file.text()).replace(/^\uFEFF/, ""))
      if (rows.length < 2) throw new Error("CSV has no data rows")

      if (isLumaExport(rows[0])) {
        const luma = mapLumaRows(rows[0], rows.slice(1))
        if (luma.drafts.length === 0) {
          throw new Error("No approved guests with an email found in this Luma export")
        }
        const result = await apiSend<{ created: number; updated: number; failed: number }>(
          "/api/admin/impact-lab/participants/import",
          "POST",
          { cohort, participants: luma.drafts }
        )
        setImportMsg(
          `Luma export: ${result.created} added, ${result.updated} updated, ${result.failed} skipped` +
            ` · ${luma.notApproved} not approved ignored` +
            (luma.missingEmail ? ` · ${luma.missingEmail} approved without email skipped` : "")
        )
        await load()
        return
      }

      const headers = rows[0].map((h) => h.trim().toLowerCase())
      // Accept a few common header spellings so a raw Luma/Google Forms export
      // doesn't silently import zero rows.
      const ALIASES: Record<string, string[]> = {
        fullname: ["fullname", "full name", "name"],
        email: ["email", "e-mail", "email address"],
      }
      const idx = (name: string) => {
        const candidates = ALIASES[name.toLowerCase()] ?? [name.toLowerCase()]
        for (const c of candidates) {
          const i = headers.indexOf(c)
          if (i >= 0) return i
        }
        return -1
      }
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

  const filteredParticipants = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return participants
    return participants.filter((p) =>
      p.fullName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.institution ?? "").toLowerCase().includes(q) ||
      p.interests.some((i) => i.toLowerCase().includes(q))
    )
  }, [participants, search])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-mono text-[#555]">
          {participants.length} participants · {consenting} consenting
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-[#444] pointer-events-none" />
            <label htmlFor="participant-search" className="sr-only">Search participants</label>
            <input
              id="participant-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, institution, track…"
              className="pl-7 pr-2 py-1.5 w-56 bg-[#111] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#e0e0e0] placeholder:text-[#444] focus:outline-none focus:border-[#00ff41]/40"
            />
          </div>
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
          <div className="flex items-center rounded border border-[#1e1e1e] overflow-hidden">
            <button
              onClick={() => sendOnboardingEmails("all")}
              disabled={notifying !== null || participants.length === 0}
              aria-label="Email signup instructions to all participants"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border-r border-[#1e1e1e] text-[11px] font-mono text-[#888] transition-all disabled:opacity-40"
            >
              {notifying === "all" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />} Email signup instructions
            </button>
            <button
              onClick={() => sendOnboardingEmails("first")}
              disabled={notifying !== null || participants.length === 0}
              aria-label="Email signup instructions to the first half"
              className="px-2.5 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border-r border-[#1e1e1e] text-[10px] font-mono text-[#888] transition-all disabled:opacity-40"
            >
              {notifying === "first" ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "1st half"}
            </button>
            <button
              onClick={() => sendOnboardingEmails("second")}
              disabled={notifying !== null || participants.length === 0}
              aria-label="Email signup instructions to the second half"
              className="px-2.5 py-1.5 bg-[#1a1a1a] hover:bg-[#222] text-[10px] font-mono text-[#888] transition-all disabled:opacity-40"
            >
              {notifying === "second" ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "2nd half"}
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".csv" onChange={onFile} className="hidden" />
        </div>
      </div>

      <p className="text-[10px] font-mono text-[#444]">
        Import accepts a raw Luma guest export (only approved guests are pulled;
        waitlist/declined ignored) or the Export format (fullName, email,
        primaryRole, …); multi-value cells split on ; or ,.
      </p>
      {importMsg && (
        <div className="p-2 bg-[#00d4ff]/10 border border-[#00d4ff]/30 rounded text-[11px] font-mono text-[#00d4ff]">{importMsg}</div>
      )}
      {notifyResult && (
        <div role="status" className="p-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41] flex items-center justify-between gap-2">
          <span>
            {GROUP_LABEL[notifyResult.group]}: sent {notifyResult.sent} of {notifyResult.recipients} emails
            {notifyResult.failed > 0 && <span className="text-[#ff3333]">, {notifyResult.failed} failed</span>}
          </span>
          <button onClick={() => setNotifyResult(null)} aria-label="Dismiss notification status" className="text-[#00ff41]/60 hover:text-[#00ff41]">
            <X className="w-3 h-3" />
          </button>
        </div>
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
        ) : filteredParticipants.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono text-[#555]">No participants match &quot;{search}&quot;.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  {["Name", "Role", "Level", "Track", "Skills", "Teammates", "Consent", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {filteredParticipants.map((p) => (
                  <Fragment key={p.id}>
                    <tr className="hover:bg-[#111]">
                      <td className="px-4 py-3">
                        <div className="text-sm font-mono text-[#e0e0e0]">{p.fullName}</div>
                        <div className="text-[11px] font-mono text-[#444]">{p.email}</div>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-[#888]">{p.primaryRole}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ color: LEVEL_COLOR[p.experienceLevel], borderColor: `${LEVEL_COLOR[p.experienceLevel]}40` }}>{p.experienceLevel}</span>
                      </td>
                      <td className="px-4 py-3">
                        {p.interests[0] ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ color: TRACK_COLOR, borderColor: `${TRACK_COLOR}40` }}>{p.interests[0]}</span>
                        ) : (
                          <span className="text-[11px] font-mono text-[#333]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-[#666] max-w-xs truncate">{p.technicalSkills.join(", ")}</td>
                      <td className="px-4 py-3">
                        {p.preferredTeammates.length > 0 ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded border" style={{ color: TEAMMATES_COLOR, borderColor: `${TEAMMATES_COLOR}40` }}>+{p.preferredTeammates.length} teammates</span>
                        ) : (
                          <span className="text-[11px] font-mono text-[#333]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono">
                        <div className="flex flex-col gap-0.5">
                          <span className={p.consentToMatch ? "text-[#00ff41]" : "text-[#ff3333]"}>{p.consentToMatch ? "yes" : "no"}</span>
                          {!p.consentToMatch && (
                            <span className="text-[9px] font-mono text-[#ff3333]/60 italic">excluded from matching</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => (editingId === p.id ? cancelEdit() : startEdit(p))}
                            disabled={busy}
                            aria-label={editingId === p.id ? `Cancel editing ${p.fullName}` : `Edit ${p.fullName}`}
                            aria-expanded={editingId === p.id}
                            className="text-[#00d4ff]/70 hover:text-[#00d4ff] disabled:opacity-40"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => remove(p.id)}
                            disabled={busy}
                            aria-label={`Delete ${p.fullName}`}
                            className="text-[#ff3333]/70 hover:text-[#ff3333] disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingId === p.id && editForm && (
                      <tr className="bg-[#0a0a0a]">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-2 gap-3">
                            <Input label="Full name" value={editForm.fullName} onChange={(v) => setEditForm({ ...editForm, fullName: v })} />
                            <Input label="Email" value={editForm.email} onChange={(v) => setEditForm({ ...editForm, email: v })} />
                            <Input label="Phone" value={editForm.phone} onChange={(v) => setEditForm({ ...editForm, phone: v })} />
                            <Input label="Institution" value={editForm.institution} onChange={(v) => setEditForm({ ...editForm, institution: v })} />
                            <Input label="Primary role" value={editForm.primaryRole} onChange={(v) => setEditForm({ ...editForm, primaryRole: v })} />
                            <div>
                              <label className="block text-[10px] font-mono text-[#555] mb-1 uppercase">Experience</label>
                              <select
                                value={editForm.experienceLevel}
                                onChange={(e) => setEditForm({ ...editForm, experienceLevel: e.target.value as (typeof EXPERIENCE)[number] })}
                                className="w-full bg-[#111] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs font-mono text-[#e0e0e0]"
                              >
                                {EXPERIENCE.map((l) => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                            <Input label="Skills (; or ,)" value={editForm.technicalSkills} onChange={(v) => setEditForm({ ...editForm, technicalSkills: v })} />
                            <Input label="Interests (; or ,)" value={editForm.interests} onChange={(v) => setEditForm({ ...editForm, interests: v })} />
                            <Input label="Availability (; or ,)" value={editForm.availability} onChange={(v) => setEditForm({ ...editForm, availability: v })} />
                            <Input label="Preferred teammates (emails)" value={editForm.preferredTeammates} onChange={(v) => setEditForm({ ...editForm, preferredTeammates: v })} />
                            <div className="col-span-2">
                              <Textarea label="Project ideas" value={editForm.projectIdeas} onChange={(v) => setEditForm({ ...editForm, projectIdeas: v })} />
                            </div>
                            <div className="col-span-2 flex items-center gap-4 flex-wrap">
                              <Check label="Consent to match" checked={editForm.consentToMatch} onChange={(v) => setEditForm({ ...editForm, consentToMatch: v })} />
                              <Check label="Consent to share contact" checked={editForm.consentToShareContact} onChange={(v) => setEditForm({ ...editForm, consentToShareContact: v })} />
                              <div className="ml-auto flex items-center gap-2">
                                <button
                                  onClick={cancelEdit}
                                  disabled={busy}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#888] disabled:opacity-40"
                                >
                                  <X className="w-3 h-3" /> Cancel
                                </button>
                                <button
                                  onClick={saveEdit}
                                  disabled={busy || !editForm.fullName || !editForm.email || !editForm.primaryRole}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41] disabled:opacity-40"
                                >
                                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
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

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-mono text-[#555] mb-1 uppercase">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs font-mono text-[#e0e0e0] resize-y"
      />
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
