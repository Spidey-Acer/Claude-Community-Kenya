/**
 * Minimal, dependency-free CSV serialization for participant and team exports.
 * Values containing a comma, quote, or newline are quoted and inner quotes
 * doubled, per RFC 4180.
 */

export type CsvCell = string | number | boolean | null | undefined

function escapeCell(value: CsvCell): string {
  const text = value == null ? "" : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","))
  return lines.join("\r\n")
}
