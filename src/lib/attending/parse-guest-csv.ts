/**
 * Luma guest-list CSV reader for the organiser upload panel (runs in the browser).
 *
 * Reads a whole CSV, finds the email and approval-status columns by header,
 * and returns ONLY those two values per row. Every other column (name, phone,
 * registration answers, ticket data) is dropped here, before anything is sent.
 * Pure and dependency-free so it is unit-testable and has no network access.
 */

/** Status text sent for rows whose status equals the organiser's approved value. */
export const APPROVED_STATUS = "approved"
/** Default value counted as approved, shown in the confirm step. */
export const DEFAULT_APPROVED_VALUE = "approved"
/** Longest status text kept; anything longer is truncated. */
export const MAX_STATUS_LENGTH = 40

const EMAIL_HEADERS = ["email"]
const STATUS_HEADERS = ["approval_status", "status"]

export interface GuestRow {
  email: string
  status: string
}

export type ColumnDetection =
  | { ok: true; emailIndex: number; statusIndex: number }
  | { ok: false; headers: string[]; emailIndex: number | null; statusIndex: number | null }

export interface ExtractResult {
  guests: GuestRow[]
  /** Rows skipped because the email cell was empty. */
  skippedNoEmail: number
}

/** RFC 4180 parser: quoted commas, doubled quotes and quoted line breaks. Blank lines are dropped. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text

  const endCell = () => {
    row.push(cell)
    cell = ""
  }
  const endRow = () => {
    endCell()
    if (row.some((value) => value.trim() !== "")) rows.push(row)
    row = []
  }

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (inQuotes) {
      if (char === '"' && source[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        cell += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      endCell()
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++
      endRow()
    } else {
      cell += char
    }
  }
  if (cell !== "" || row.length > 0) endRow()
  return rows
}

function findHeader(headers: string[], candidates: string[]): number | null {
  for (const candidate of candidates) {
    const index = headers.findIndex((header) => header.trim().toLowerCase() === candidate)
    if (index !== -1) return index
  }
  return null
}

/** Finds the email and status columns by header; `ok: false` means show the column picker. */
export function detectColumns(headers: string[]): ColumnDetection {
  const emailIndex = findHeader(headers, EMAIL_HEADERS)
  const statusIndex = findHeader(headers, STATUS_HEADERS)
  if (emailIndex !== null && statusIndex !== null) return { ok: true, emailIndex, statusIndex }
  return { ok: false, headers, emailIndex, statusIndex }
}

/**
 * Keeps only email and status. A status equal (case-insensitive, trimmed) to
 * `approvedValue` is sent as "approved"; any other status keeps its own text.
 * `dataRows` excludes the header row.
 */
export function extractGuests(
  dataRows: string[][],
  emailIndex: number,
  statusIndex: number,
  approvedValue: string = DEFAULT_APPROVED_VALUE,
): ExtractResult {
  const wanted = approvedValue.trim().toLowerCase()
  const guests: GuestRow[] = []
  let skippedNoEmail = 0
  for (const row of dataRows) {
    const email = (row[emailIndex] ?? "").trim()
    if (email === "") {
      skippedNoEmail++
      continue
    }
    const rawStatus = (row[statusIndex] ?? "").trim()
    const status =
      rawStatus.toLowerCase() === wanted ? APPROVED_STATUS : rawStatus.slice(0, MAX_STATUS_LENGTH)
    guests.push({ email, status })
  }
  return { guests, skippedNoEmail }
}
