"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2, Plus, Circle, CircleDot, Download, Copy, Check, BookOpenText } from "lucide-react"
import Link from "next/link"
import { csrfHeaders } from "@/lib/csrf-client"
import { ModerationQueue } from "./ModerationQueue"
import type { QuestionSessionData as Session } from "./types"

/** How long a "Copied" confirmation stays visible before reverting to the
 * button's normal label — long enough to read, short enough to not linger. */
const COPY_CONFIRMATION_MS = 2000

/**
 * Q&A tab: create/open/close EventQuestionSession rows for this event, the
 * same 2-tap moderation queue scoped to questions, and the stage-day export
 * tools (CSV download, clipboard copy, read view) an organiser needs while
 * standing on stage reading questions live.
 */
export function QaTab({
  eventId,
  eventSlug,
  initialSessions,
}: {
  eventId: string
  eventSlug: string
  initialSessions: Session[]
}) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(sessions.length === 0)
  const [title, setTitle] = useState("Ask Anthropic's team")
  const [prompt, setPrompt] = useState("")
  const [origin, setOrigin] = useState("")
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // window is unavailable during SSR — the public submit link is only ever
  // shown for copy/reference, so filling it in after mount is fine.
  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  function createSession(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/questions/sessions", {
          method: "POST",
          headers: await csrfHeaders(),
          body: JSON.stringify({ eventId, title, prompt, isOpen: false }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to create session")
        setSessions((prev) => [{ ...data.data, counts: { pending: 0, approved: 0, rejected: 0 } }, ...prev])
        setShowCreate(false)
        setTitle("Ask Anthropic's team")
        setPrompt("")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  function toggleOpen(session: Session) {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/questions/sessions", {
          method: "PATCH",
          headers: await csrfHeaders(),
          body: JSON.stringify({ id: session.id, isOpen: !session.isOpen }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to update session")
        setSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, ...data.data } : s)))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  async function copyToClipboard(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), COPY_CONFIRMATION_MS)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't copy to clipboard")
    }
  }

  async function copyApprovedQuestions(session: Session) {
    setError(null)
    try {
      const res = await fetch(`/api/admin/questions/sessions/${session.id}/export?status=approved`)
      const csvText = await res.text()
      if (!res.ok) throw new Error("Failed to load approved questions")
      const questions = parseQuestionColumn(csvText)
      const numbered = questions.map((q, i) => `${i + 1}. ${q}`).join("\n")
      await copyToClipboard(`copy-${session.id}`, numbered)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Q&amp;A Sessions</h2>
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1 text-[11px] font-mono text-[#00ff41] hover:underline"
            >
              <Plus className="w-3 h-3" />
              New session
            </button>
          )}
        </div>

        {error && (
          <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
            {error}
          </div>
        )}

        {showCreate && (
          <form onSubmit={createSession} className="space-y-2 bg-[#111] border border-[#1a1a1a] rounded-lg p-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Session title"
              required
              maxLength={150}
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50"
            />
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Helper copy above the form, e.g. 'Type your question for the Anthropic team.'"
              required
              rows={2}
              maxLength={1000}
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#888] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[11px] font-mono font-semibold text-[#00ff41] transition-all disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Create
              </button>
            </div>
          </form>
        )}

        {sessions.length === 0 && !showCreate ? (
          <p className="text-xs font-mono text-[#333] py-4 text-center">No sessions yet.</p>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const publicUrl = `${origin}/events/${eventSlug}`
              const copyKey = `copy-${session.id}`
              const urlKey = `url-${session.id}`
              return (
                <div key={session.id} className="bg-[#111] border border-[#1a1a1a] rounded-lg p-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-mono text-[#ccc] font-semibold truncate">{session.title}</div>
                      <div className="text-[10px] font-mono text-[#555] truncate">{session.prompt}</div>
                    </div>
                    <button
                      onClick={() => toggleOpen(session)}
                      disabled={isPending}
                      className={`flex items-center gap-1.5 shrink-0 px-3 py-2 rounded text-[11px] font-mono font-semibold border transition-all disabled:opacity-50 ${
                        session.isOpen
                          ? "bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]"
                          : "bg-[#1a1a1a] border-[#222] text-[#666]"
                      }`}
                    >
                      {session.isOpen ? <CircleDot className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                      {session.isOpen ? "Open" : "Closed"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <CountPill label="Pending" value={session.counts.pending} color="#ffb000" />
                    <CountPill label="Approved" value={session.counts.approved} color="#00ff41" />
                    <CountPill label="Rejected" value={session.counts.rejected} color="#ff3333" />
                  </div>

                  <div className="flex items-center gap-1.5 bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2 py-1.5">
                    <span className="text-[10px] font-mono text-[#555] shrink-0">Submit at:</span>
                    <span className="text-[10px] font-mono text-[#00d4ff] truncate flex-1">{publicUrl}</span>
                    <button
                      onClick={() => copyToClipboard(urlKey, publicUrl)}
                      className="shrink-0 text-[#555] hover:text-[#ccc] transition-colors"
                      aria-label="Copy public submission URL"
                    >
                      {copiedKey === urlKey ? <Check className="w-3.5 h-3.5 text-[#00ff41]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] font-mono text-[#444]">Form is only visible while the session is Open.</p>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`/api/admin/questions/sessions/${session.id}/export?status=approved`}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-[11px] font-mono font-semibold text-[#00ff41] transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download approved
                    </a>
                    <a
                      href={`/api/admin/questions/sessions/${session.id}/export?status=all`}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[11px] font-mono font-semibold text-[#888] transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download all
                    </a>
                    <button
                      onClick={() => copyApprovedQuestions(session)}
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/30 rounded text-[11px] font-mono font-semibold text-[#00d4ff] transition-all"
                    >
                      {copiedKey === copyKey ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied {session.counts.approved}
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy approved
                        </>
                      )}
                    </button>
                    <Link
                      href={`/admin/conversations/${eventId}/questions/${session.id}`}
                      target="_blank"
                      className="flex items-center justify-center gap-1.5 px-2.5 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[11px] font-mono font-semibold text-[#888] transition-all"
                    >
                      <BookOpenText className="w-3.5 h-3.5" />
                      Read view
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
        <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">
          Question Moderation
        </h2>
        <ModerationQueue eventId={eventId} kindFilter="question" />
      </div>
    </div>
  )
}

function CountPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span
      className="px-2 py-1 rounded text-[10px] font-mono font-semibold border"
      style={{ color, borderColor: `${color}4d`, backgroundColor: `${color}1a` }}
    >
      {label} {value}
    </span>
  )
}

/**
 * Pulls the "question" column out of the export route's CSV text for the
 * clipboard-copy action, undoing toCsv's RFC-4180 quoting. Good enough for
 * this one column — a full CSV parser would be overkill for a same-origin
 * response we just generated ourselves.
 */
function parseQuestionColumn(csvText: string): string[] {
  const lines = csvText.split(/\r\n/).filter(Boolean)
  const [, ...dataLines] = lines // drop header row
  return dataLines.map((line) => unquoteCsvCell(splitCsvLine(line)[2] ?? ""))
}

/** Splits one CSV line on commas that aren't inside a quoted field. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      cells.push(current)
      current = ""
    } else {
      current += char
    }
  }
  cells.push(current)
  return cells
}

/** Strips the formula-injection guard prefix the export route adds. */
function unquoteCsvCell(cell: string): string {
  return /^'[=+\-@\t\r]/.test(cell) ? cell.slice(1) : cell
}
