"use client"

import { useState, useTransition } from "react"
import { Loader2, Plus, Circle, CircleDot } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"
import { ModerationQueue } from "./ModerationQueue"
import type { QuestionSessionData as Session } from "./types"

/**
 * Q&A tab: create/open/close EventQuestionSession rows for this event, plus
 * the same 2-tap moderation queue scoped to questions. Works even when no
 * ConversationsPage is attached — this is how the Impact Lab event runs its
 * "Ask Anthropic's team" session.
 */
export function QaTab({ eventId, initialSessions }: { eventId: string; initialSessions: Session[] }) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(sessions.length === 0)
  const [title, setTitle] = useState("Ask Anthropic's team")
  const [prompt, setPrompt] = useState("")

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
        setSessions((prev) => [data.data, ...prev])
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
        setSessions((prev) => prev.map((s) => (s.id === session.id ? data.data : s)))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
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
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between gap-3 bg-[#111] border border-[#1a1a1a] rounded-lg p-3">
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
            ))}
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
