"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { AlertTriangle, Loader2, Plus, Trash2, X } from "lucide-react"
import { apiGet, apiSend } from "./api"

/**
 * Admin surface for the tenancy platform's events: every event across every
 * organisation, its lifecycle status, and the controls to create one and
 * move it through DRAFT → LIVE → CLOSED → ARCHIVED.
 *
 * The transition buttons shown per row are a client-side convenience only —
 * a mirror of `canTransition` in event-lifecycle.ts for which buttons make
 * sense to offer. The server re-checks every request (LIVE→DRAFT rejects
 * once people have registered, for instance), so a shown button can still
 * fail; its refusal reason renders next to the row instead of being hidden
 * or translated into something friendlier.
 */

type EventStatus = "DRAFT" | "LIVE" | "CLOSED" | "ARCHIVED"

/** Mirrors src/lib/impact-lab/tracks.ts's `Track` — the client's own copy
 * so this file doesn't need to import the (server-flavoured) zod schema. */
interface Track {
  key: string
  label: string
  description?: string
  aliases: string[]
}

interface EventRow {
  id: string
  organisationId: string
  organisationName: string
  cohort: string
  name: string
  status: EventStatus
  titleLead: string
  titleAccent: string
  dates: string
  location: string
  formatNote: string
  groundRules: string | null
  tracks: Track[]
  conversationsEventId: string | null
  createdAt: string
}

const splitAliases = (v: string): string[] =>
  v.split(/[;,]/).map((s) => s.trim().toLowerCase()).filter(Boolean)

const EMPTY_TRACK: Track = { key: "", label: "", description: "", aliases: [] }

interface OrganisationOption {
  id: string
  slug: string
  name: string
}

interface ConversationsEventOption {
  id: string
  title: string
  slug: string
}

interface EventsData {
  events: EventRow[]
  organisations: OrganisationOption[]
  conversationsEvents: ConversationsEventOption[]
}

const STATUS_COLOR: Record<EventStatus, string> = {
  LIVE: "#00ff41",
  DRAFT: "#666666",
  CLOSED: "#ffb000",
  ARCHIVED: "#ff3333",
}

const TRANSITIONS: Record<EventStatus, { to: EventStatus; label: string }[]> = {
  DRAFT: [{ to: "LIVE", label: "Launch" }],
  LIVE: [
    { to: "CLOSED", label: "Close" },
    { to: "DRAFT", label: "Back to draft" },
  ],
  CLOSED: [
    { to: "LIVE", label: "Reopen" },
    { to: "ARCHIVED", label: "Archive" },
  ],
  ARCHIVED: [{ to: "CLOSED", label: "Unarchive" }],
}

const FIELD =
  "w-full rounded border border-[#1e1e1e] bg-[#111] px-2 py-1.5 text-[11px] font-mono text-[#e0e0e0] placeholder:text-[#444] focus:border-[#00ff41] focus:outline-none disabled:cursor-not-allowed disabled:text-[#666]"
const LEGEND = "text-[10px] font-mono uppercase tracking-wider text-[#555]"

const EMPTY_FORM = {
  organisationId: "",
  cohort: "",
  name: "",
  titleLead: "",
  titleAccent: "",
  dates: "",
  location: "",
  formatNote: "",
  groundRules: "",
}

export function EventsTab() {
  const [data, setData] = useState<EventsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [transitioning, setTransitioning] = useState<string | null>(null)
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [linking, setLinking] = useState<string | null>(null)

  // Tracks editor: one cohort open at a time, edited as a local draft and
  // written back with a single PATCH on Save.
  const [editingTracksCohort, setEditingTracksCohort] = useState<string | null>(null)
  const [trackDraft, setTrackDraft] = useState<Track[]>([])
  const [tracksSaving, setTracksSaving] = useState(false)
  const [tracksError, setTracksError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await apiGet<EventsData>("/api/admin/impact-lab/events"))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const transition = async (cohort: string, to: EventStatus) => {
    setTransitioning(cohort)
    setRowErrors((prev) => {
      if (!(cohort in prev)) return prev
      const next = { ...prev }
      delete next[cohort]
      return next
    })
    try {
      await apiSend("/api/admin/impact-lab/events", "PATCH", { cohort, status: to })
      await load()
    } catch (e) {
      setRowErrors((prev) => ({
        ...prev,
        [cohort]: e instanceof Error ? e.message : "Could not change status",
      }))
    } finally {
      setTransitioning(null)
    }
  }

  const linkConversationsEvent = async (cohort: string, conversationsEventId: string | null) => {
    setLinking(cohort)
    setRowErrors((prev) => {
      if (!(cohort in prev)) return prev
      const next = { ...prev }
      delete next[cohort]
      return next
    })
    try {
      await apiSend("/api/admin/impact-lab/events", "PATCH", { cohort, conversationsEventId })
      await load()
    } catch (e) {
      setRowErrors((prev) => ({
        ...prev,
        [cohort]: e instanceof Error ? e.message : "Could not link the report",
      }))
    } finally {
      setLinking(null)
    }
  }

  const startEditTracks = (event: EventRow) => {
    setTracksError(null)
    setEditingTracksCohort(event.cohort)
    setTrackDraft(event.tracks.length > 0 ? event.tracks.map((t) => ({ ...t })) : [{ ...EMPTY_TRACK }])
  }

  const cancelEditTracks = () => {
    setEditingTracksCohort(null)
    setTrackDraft([])
    setTracksError(null)
  }

  const saveTracks = async () => {
    if (!editingTracksCohort) return
    setTracksSaving(true)
    setTracksError(null)
    try {
      // Drop fully-blank rows (an organiser who added a row and abandoned it)
      // rather than sending an invalid key to the server.
      const tracks = trackDraft
        .filter((t) => t.key.trim() || t.label.trim())
        .map((t) => ({
          key: t.key.trim(),
          label: t.label.trim(),
          ...(t.description?.trim() ? { description: t.description.trim() } : {}),
          aliases: t.aliases,
        }))
      await apiSend("/api/admin/impact-lab/events", "PATCH", { cohort: editingTracksCohort, tracks })
      setEditingTracksCohort(null)
      setTrackDraft([])
      await load()
    } catch (e) {
      setTracksError(e instanceof Error ? e.message : "Failed to save tracks")
    } finally {
      setTracksSaving(false)
    }
  }

  const createEvent = async () => {
    setCreating(true)
    setFormError(null)
    try {
      await apiSend("/api/admin/impact-lab/events", "POST", {
        organisationId: form.organisationId,
        cohort: form.cohort,
        name: form.name,
        titleLead: form.titleLead,
        titleAccent: form.titleAccent,
        dates: form.dates,
        location: form.location,
        formatNote: form.formatNote,
        ...(form.groundRules.trim() ? { groundRules: form.groundRules } : {}),
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      await load()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create event")
    } finally {
      setCreating(false)
    }
  }

  const formValid =
    form.organisationId.trim() !== "" &&
    form.cohort.trim() !== "" &&
    form.name.trim() !== "" &&
    form.titleLead.trim() !== "" &&
    form.titleAccent.trim() !== "" &&
    form.dates.trim() !== "" &&
    form.location.trim() !== "" &&
    form.formatNote.trim() !== ""

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#333]" />
      </div>
    )
  }

  if (!data) {
    return (
      <div
        role="alert"
        className="space-y-2 rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-3 text-[11px] font-mono text-[#ff3333]"
      >
        <p>{error ?? "No data"}</p>
        <button
          onClick={() => void load()}
          className="rounded border border-[#ff3333]/40 px-3 py-1.5 text-[#ff3333] hover:bg-[#ff3333]/10"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-mono text-[#555]">
          {data.events.length} event{data.events.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-1.5 rounded border border-[#00ff41]/30 bg-[#00ff41]/10 px-3 py-1.5 text-[11px] font-mono text-[#00ff41] hover:bg-[#00ff41]/20"
        >
          <Plus className="h-3 w-3" /> New event
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]"
        >
          {error}
        </div>
      )}

      {showForm && (
        <div className="space-y-3 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-4">
          <p className={LEGEND}>New event</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className={LEGEND} htmlFor="event-org">
                Organisation
              </label>
              <select
                id="event-org"
                value={form.organisationId}
                onChange={(e) => setForm({ ...form, organisationId: e.target.value })}
                className={FIELD}
              >
                <option value="">Select an organisation…</option>
                {data.organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={LEGEND} htmlFor="event-cohort">
                Cohort slug
              </label>
              <input
                id="event-cohort"
                value={form.cohort}
                onChange={(e) => setForm({ ...form, cohort: e.target.value })}
                placeholder="afretec-makerthon-2026-08"
                className={FIELD}
              />
              <p className="text-[10px] font-mono text-[#444]">
                Lowercase letters, digits and hyphens only.
              </p>
            </div>
            <div className="space-y-1">
              <label className={LEGEND} htmlFor="event-name">
                Name
              </label>
              <input
                id="event-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={FIELD}
              />
            </div>
            <div className="space-y-1">
              <label className={LEGEND} htmlFor="event-dates">
                Dates
              </label>
              <input
                id="event-dates"
                value={form.dates}
                onChange={(e) => setForm({ ...form, dates: e.target.value })}
                placeholder="8–9 Aug 2026"
                className={FIELD}
              />
            </div>
            <div className="space-y-1">
              <label className={LEGEND} htmlFor="event-title-lead">
                Title lead
              </label>
              <input
                id="event-title-lead"
                value={form.titleLead}
                onChange={(e) => setForm({ ...form, titleLead: e.target.value })}
                className={FIELD}
              />
            </div>
            <div className="space-y-1">
              <label className={LEGEND} htmlFor="event-title-accent">
                Title accent
              </label>
              <input
                id="event-title-accent"
                value={form.titleAccent}
                onChange={(e) => setForm({ ...form, titleAccent: e.target.value })}
                className={FIELD}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className={LEGEND} htmlFor="event-location">
                Location
              </label>
              <input
                id="event-location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className={FIELD}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className={LEGEND} htmlFor="event-format-note">
                Format note
              </label>
              <textarea
                id="event-format-note"
                rows={2}
                value={form.formatNote}
                onChange={(e) => setForm({ ...form, formatNote: e.target.value })}
                className={`${FIELD} resize-y`}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className={LEGEND} htmlFor="event-ground-rules">
                Ground rules (optional)
              </label>
              <textarea
                id="event-ground-rules"
                rows={2}
                value={form.groundRules}
                onChange={(e) => setForm({ ...form, groundRules: e.target.value })}
                className={`${FIELD} resize-y`}
              />
            </div>
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]"
            >
              {formError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={createEvent}
              disabled={creating || !formValid}
              className="flex items-center gap-1.5 rounded border border-[#00ff41]/40 bg-[#00ff41]/10 px-4 py-2 text-[11px] font-mono text-[#00ff41] hover:bg-[#00ff41]/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Create draft
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setForm(EMPTY_FORM)
                setFormError(null)
              }}
              disabled={creating}
              className="rounded border border-[#1e1e1e] px-3 py-2 text-[11px] font-mono text-[#666] hover:text-[#e0e0e0] disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-[#1e1e1e] bg-[#0d0d0d]">
        {data.events.length === 0 ? (
          <div className="p-8 text-center text-sm font-mono text-[#555]">
            No events yet — create one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  {["Name", "Organisation", "Cohort", "Status", "Tracks", "Report", "Created", ""].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-mono font-semibold uppercase tracking-wider text-[#555]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {data.events.map((event) => (
                  <Fragment key={event.id}>
                    <tr className="hover:bg-[#111]">
                      <td className="px-4 py-3 text-sm font-mono text-[#e0e0e0]">{event.name}</td>
                      <td className="px-4 py-3 text-[11px] font-mono text-[#888]">
                        {event.organisationName}
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-[#666]">{event.cohort}</td>
                      <td className="px-4 py-3">
                        <span
                          className="rounded border px-2 py-0.5 text-[10px] font-mono"
                          style={{
                            color: STATUS_COLOR[event.status],
                            borderColor: `${STATUS_COLOR[event.status]}40`,
                          }}
                        >
                          {event.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() =>
                            editingTracksCohort === event.cohort
                              ? cancelEditTracks()
                              : startEditTracks(event)
                          }
                          className="rounded border border-[#1e1e1e] px-2 py-1 text-[10px] font-mono text-[#888] hover:border-[#ffb000]/40 hover:text-[#ffb000]"
                        >
                          {event.tracks.length > 0 ? `${event.tracks.length} track${event.tracks.length === 1 ? "" : "s"}` : "None"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          aria-label={`Linked Conversations event for ${event.name}`}
                          value={event.conversationsEventId ?? ""}
                          onChange={(e) =>
                            void linkConversationsEvent(event.cohort, e.target.value || null)
                          }
                          disabled={linking === event.cohort}
                          className="w-full max-w-[180px] rounded border border-[#1e1e1e] bg-[#111] px-2 py-1 text-[10px] font-mono text-[#888] focus:border-[#00ff41]/50 focus:outline-none disabled:opacity-40"
                        >
                          <option value="">None</option>
                          {data.conversationsEvents.map((ce) => (
                            <option key={ce.id} value={ce.id}>
                              {ce.title}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-mono text-[#666]">
                        {new Date(event.createdAt).toLocaleDateString("en-KE", { dateStyle: "medium" })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {TRANSITIONS[event.status].map(({ to, label }) => (
                            <button
                              key={to}
                              onClick={() => void transition(event.cohort, to)}
                              disabled={transitioning === event.cohort}
                              className="rounded border border-[#1e1e1e] px-2.5 py-1 text-[10px] font-mono text-[#888] hover:border-[#00ff41]/40 hover:text-[#00ff41] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {transitioning === event.cohort ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                label
                              )}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                    {rowErrors[event.cohort] && (
                      <tr className="bg-[#0a0a0a]">
                        <td colSpan={8} className="px-4 py-2">
                          <p
                            role="alert"
                            className="flex items-start gap-2 text-[11px] font-mono text-[#ff3333]"
                          >
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                            {rowErrors[event.cohort]}
                          </p>
                        </td>
                      </tr>
                    )}
                    {editingTracksCohort === event.cohort && (
                      <tr className="bg-[#0a0a0a]">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="space-y-3">
                            <p className={LEGEND}>
                              Tracks for {event.name} — participants pick one at registration;
                              matching keeps every team within a single track.
                            </p>
                            {trackDraft.map((track, i) => (
                              <div
                                key={i}
                                className="grid grid-cols-1 gap-2 rounded border border-[#1e1e1e] p-3 sm:grid-cols-[1fr_1fr_2fr_auto]"
                              >
                                <div className="space-y-1">
                                  <label className={LEGEND}>Key</label>
                                  <input
                                    value={track.key}
                                    onChange={(e) => {
                                      const next = [...trackDraft]
                                      next[i] = { ...track, key: e.target.value }
                                      setTrackDraft(next)
                                    }}
                                    placeholder="jobs"
                                    className={FIELD}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className={LEGEND}>Label</label>
                                  <input
                                    value={track.label}
                                    onChange={(e) => {
                                      const next = [...trackDraft]
                                      next[i] = { ...track, label: e.target.value }
                                      setTrackDraft(next)
                                    }}
                                    placeholder="Work & Jobs"
                                    className={FIELD}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className={LEGEND}>Aliases (registration answers, ; or ,)</label>
                                  <input
                                    value={track.aliases.join(", ")}
                                    onChange={(e) => {
                                      const next = [...trackDraft]
                                      next[i] = { ...track, aliases: splitAliases(e.target.value) }
                                      setTrackDraft(next)
                                    }}
                                    placeholder="work-and-jobs, employment"
                                    className={FIELD}
                                  />
                                </div>
                                <div className="flex items-end justify-end">
                                  <button
                                    onClick={() => setTrackDraft(trackDraft.filter((_, j) => j !== i))}
                                    aria-label={`Remove track ${track.label || i + 1}`}
                                    className="rounded border border-[#1e1e1e] p-2 text-[#ff3333]/70 hover:text-[#ff3333]"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="space-y-1 sm:col-span-3">
                                  <label className={LEGEND}>Description (optional)</label>
                                  <input
                                    value={track.description ?? ""}
                                    onChange={(e) => {
                                      const next = [...trackDraft]
                                      next[i] = { ...track, description: e.target.value }
                                      setTrackDraft(next)
                                    }}
                                    className={FIELD}
                                  />
                                </div>
                              </div>
                            ))}

                            {tracksError && (
                              <p role="alert" className="text-[11px] font-mono text-[#ff3333]">
                                {tracksError}
                              </p>
                            )}

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setTrackDraft([...trackDraft, { ...EMPTY_TRACK }])}
                                className="flex items-center gap-1.5 rounded border border-[#1e1e1e] px-3 py-1.5 text-[11px] font-mono text-[#888] hover:border-[#00ff41]/40 hover:text-[#00ff41]"
                              >
                                <Plus className="h-3 w-3" /> Add track
                              </button>
                              <button
                                onClick={() => void saveTracks()}
                                disabled={tracksSaving}
                                className="flex items-center gap-1.5 rounded border border-[#00ff41]/40 bg-[#00ff41]/10 px-3 py-1.5 text-[11px] font-mono text-[#00ff41] hover:bg-[#00ff41]/20 disabled:opacity-40"
                              >
                                {tracksSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                Save tracks
                              </button>
                              <button
                                onClick={cancelEditTracks}
                                disabled={tracksSaving}
                                className="flex items-center gap-1.5 rounded border border-[#1e1e1e] px-3 py-1.5 text-[11px] font-mono text-[#666] hover:text-[#e0e0e0] disabled:opacity-40"
                              >
                                <X className="h-3 w-3" /> Cancel
                              </button>
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
