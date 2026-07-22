/**
 * Minimal, dependency-free CSV serialization for participant and team exports.
 * Values containing a comma, quote, or newline are quoted and inner quotes
 * doubled, per RFC 4180.
 */

export type CsvCell = string | number | boolean | null | undefined

function escapeCell(value: CsvCell): string {
  let text = value == null ? "" : String(value)
  // Neutralize spreadsheet formula injection: a cell starting with =, +, -, @,
  // or a control char is evaluated as a formula by Excel/Sheets on open (e.g. a
  // participant named `=HYPERLINK(...)`). Prefix a single quote so it stays
  // literal text. Applied before RFC-4180 quoting.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","))
  return lines.join("\r\n")
}
