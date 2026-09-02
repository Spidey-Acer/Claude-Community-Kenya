"use client"

import { useState } from "react"
import { Settings, ShieldCheck, Trophy, MessagesSquare } from "lucide-react"
import { ConfigTab } from "./ConfigTab"
import { ModerationTab } from "./ModerationTab"
import { ResultTab } from "./ResultTab"
import { QaTab } from "./QaTab"
import type { ConversationsPageData, QuestionSessionData } from "./types"

type Tab = "config" | "moderation" | "result" | "qa"

const TABS: { value: Tab; label: string; icon: typeof Settings }[] = [
  { value: "config", label: "Config", icon: Settings },
  { value: "moderation", label: "Moderate", icon: ShieldCheck },
  { value: "result", label: "Result", icon: Trophy },
  { value: "qa", label: "Q&A", icon: MessagesSquare },
]

/**
 * Tab shell for one event's Conversations Live admin surface. Holds the
 * ConversationsPage in state so Config/Result edits reflect immediately
 * without a full page reload — this is used from a phone at the venue.
 */
export function ConversationsManager({
  event,
  initialPage,
  initialSessions,
}: {
  event: { id: string; slug: string; title: string }
  initialPage: ConversationsPageData | null
  initialSessions: QuestionSessionData[]
}) {
  const [tab, setTab] = useState<Tab>(initialPage ? "moderation" : "config")
  const [page, setPage] = useState<ConversationsPageData | null>(initialPage)

  return (
    <div className="space-y-4">
      {/* Horizontally scrollable at 390px rather than wrapping — keeps every
          tab reachable with a thumb without shrinking labels illegibly. */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex items-center gap-1.5 shrink-0 px-3 py-2 rounded text-xs font-mono font-semibold border transition-all ${
              tab === value
                ? "bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]"
                : "bg-[#111] border-[#1e1e1e] text-[#666] hover:text-[#ccc]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "config" && <ConfigTab eventId={event.id} page={page} onPageChange={setPage} />}
      {tab === "moderation" && <ModerationTab eventId={event.id} />}
      {tab === "result" && (
        page ? (
          <ResultTab eventId={event.id} initialResult={page.result} />
        ) : (
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6 text-center">
            <p className="text-xs font-mono text-[#666]">Attach a Conversations page in Config before publishing a result.</p>
          </div>
        )
      )}
      {tab === "qa" && <QaTab eventId={event.id} eventSlug={event.slug} initialSessions={initialSessions} />}
    </div>
  )
}
