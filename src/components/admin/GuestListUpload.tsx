"use client"

/**
 * Admin panel for an event's Luma guest list (the "I'm attending" card).
 *
 * The browser reads the CSV, keeps only email and approval status, and shows a
 * confirm step (event title, row count, the value counted as approved). Nothing
 * is sent until the organiser confirms. Merge adds and updates; "Replace list"
 * deletes the event's rows first. "Delete guest list now" wipes at once.
 */

import { useState } from "react"
import { Loader2, Trash2, Upload } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"
import {
  DEFAULT_APPROVED_VALUE,
  detectColumns,
  extractGuests,
  parseCsv,
  type GuestRow,
} from "@/lib/attending/parse-guest-csv"

interface GuestListUploadProps {
  eventId: string
  eventTitle: string
}

/** Counts-only response from the guests route. */
interface GuestResponse {
  success: boolean
  error?: string
  created: number
  updated: number
  deleted: number
}

interface ParsedFile {
  headers: string[]
  dataRows: string[][]
}

const FIELD = "bg-[#0a0a0a] border border-[#222] rounded px-2 py-1 text-[11px] font-mono text-[#ccc]"
const BUTTON =
  "flex items-center gap-1.5 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#ccc] disabled:opacity-50"

export function GuestListUpload({ eventId, eventTitle }: GuestListUploadProps) {
  const [file, setFile] = useState<ParsedFile | null>(null)
  const [emailIndex, setEmailIndex] = useState<number | null>(null)
  const [statusIndex, setStatusIndex] = useState<number | null>(null)
  const [approvedValue, setApprovedValue] = useState(DEFAULT_APPROVED_VALUE)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const columnsChosen = emailIndex !== null && statusIndex !== null
  const extracted =
    file && columnsChosen
      ? extractGuests(file.dataRows, emailIndex, statusIndex, approvedValue)
      : null
  const approvedCount = extracted?.guests.filter((guest) => guest.status === "approved").length ?? 0

  async function handleFile(selected: File | undefined) {
    setMessage(null)
    setError(null)
    if (!selected) return
    const [headers, ...dataRows] = parseCsv(await selected.text())
    if (!headers) {
      setError("That file has no rows.")
      return
    }
    const detected = detectColumns(headers)
    setFile({ headers, dataRows })
    setEmailIndex(detected.emailIndex)
    setStatusIndex(detected.statusIndex)
  }

  async function send(method: "POST" | "DELETE", body?: { mode: string; guests: GuestRow[] }) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/events/${eventId}/guests`, {
        method,
        headers: await csrfHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = (await response.json()) as GuestResponse
      if (!response.ok) throw new Error(data.error ?? "Request failed")
      return data
    } finally {
      setBusy(false)
    }
  }

  async function upload(mode: "merge" | "replace") {
    if (!extracted) return
    try {
      const data = await send("POST", { mode, guests: extracted.guests })
      setMessage(`Done. Added ${data.created}, updated ${data.updated}, removed ${data.deleted}.`)
      setFile(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  async function wipe() {
    if (!window.confirm("Delete the whole guest list for this event now?")) return
    try {
      const data = await send("DELETE")
      setMessage(`Deleted ${data.deleted} guest rows.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-3">
      <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">
        Attending card guest list
      </h2>
      <p className="text-[11px] font-mono text-[#888]">
        Upload the Luma guest CSV. Only email and approval status are read; emails are scrambled on
        the server and deleted 2 days after the event.
      </p>
      <label className={`${BUTTON} w-fit cursor-pointer`}>
        <Upload className="w-3 h-3" />
        Choose CSV
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
      </label>

      {file && (
        <div className="space-y-2 text-[11px] font-mono text-[#ccc]">
          <ColumnPicker
            headers={file.headers}
            emailIndex={emailIndex}
            statusIndex={statusIndex}
            onEmail={setEmailIndex}
            onStatus={setStatusIndex}
          />
          <label className="flex items-center gap-2">
            Counted as approved:
            <input
              className={FIELD}
              value={approvedValue}
              onChange={(event) => setApprovedValue(event.target.value)}
            />
          </label>
          {extracted && (
            <div className="space-y-2">
              <p>
                Event: {eventTitle}. Rows with an email: {extracted.guests.length} (
                {extracted.skippedNoEmail} skipped, no email). Counted as approved: {approvedCount}.
              </p>
              <div className="flex gap-2">
                <button className={BUTTON} disabled={busy} onClick={() => upload("merge")}>
                  {busy && <Loader2 className="w-3 h-3 animate-spin" />}Confirm merge
                </button>
                <button className={BUTTON} disabled={busy} onClick={() => upload("replace")}>
                  Confirm replace list
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {message && <p className="text-[11px] font-mono text-[#00ff41]">{message}</p>}
      {error && <p className="text-[11px] font-mono text-[#ff3333]">{error}</p>}
      <button
        className={`${BUTTON} text-[#ff3333] border-[#ff3333]/30`}
        disabled={busy}
        onClick={wipe}
      >
        <Trash2 className="w-3 h-3" />
        Delete guest list now
      </button>
    </div>
  )
}

interface ColumnPickerProps {
  headers: string[]
  emailIndex: number | null
  statusIndex: number | null
  onEmail: (index: number | null) => void
  onStatus: (index: number | null) => void
}

/** Two selects so the organiser can name the columns when headers were not recognised. */
function ColumnPicker({ headers, emailIndex, statusIndex, onEmail, onStatus }: ColumnPickerProps) {
  const options = headers.map((header, index) => (
    <option key={index} value={index}>
      {header || `(column ${index + 1})`}
    </option>
  ))
  const toIndex = (value: string) => (value === "" ? null : Number(value))
  return (
    <div className="flex flex-wrap gap-3">
      <label className="flex items-center gap-2">
        Email column
        <select className={FIELD} value={emailIndex ?? ""} onChange={(e) => onEmail(toIndex(e.target.value))}>
          <option value="">Choose</option>
          {options}
        </select>
      </label>
      <label className="flex items-center gap-2">
        Status column
        <select className={FIELD} value={statusIndex ?? ""} onChange={(e) => onStatus(toIndex(e.target.value))}>
          <option value="">Choose</option>
          {options}
        </select>
      </label>
    </div>
  )
}
