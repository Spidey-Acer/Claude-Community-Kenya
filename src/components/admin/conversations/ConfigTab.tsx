"use client"

import { useState, useTransition } from "react"
import { Loader2, Plus, X, Save } from "lucide-react"
import { csrfHeaders } from "@/lib/csrf-client"
import type { FramingStat, TableQuestion, SeedProblem, ConversationsPageData } from "./types"

/** Config tab: hero lines, stat wall, the three table questions, seed
 * problems, and the contributions-open toggle. Attaches a page inline if
 * this event doesn't have one yet, instead of sending Peter back to the list. */
export function ConfigTab({
  eventId,
  page,
  onPageChange,
}: {
  eventId: string
  page: ConversationsPageData | null
  onPageChange: (page: ConversationsPageData) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function attach() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/conversations", {
          method: "POST",
          headers: await csrfHeaders(),
          body: JSON.stringify({ eventId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to attach page")
        onPageChange(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  if (!page) {
    return (
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6 text-center space-y-3">
        <p className="text-xs font-mono text-[#666]">
          No Conversations page attached to this event yet.
        </p>
        {error && <p className="text-[11px] font-mono text-[#ff3333]">{error}</p>}
        <button
          onClick={attach}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-xs font-mono font-semibold text-[#00ff41] transition-all disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Attach Conversations page
        </button>
      </div>
    )
  }

  return <ConfigForm eventId={eventId} page={page} onSaved={onPageChange} />
}

function ConfigForm({
  eventId, page, onSaved,
}: {
  eventId: string
  page: ConversationsPageData
  onSaved: (page: ConversationsPageData) => void
}) {
  const [heroHeadline, setHeroHeadline] = useState(page.heroHeadline)
  const [heroSubline, setHeroSubline] = useState(page.heroSubline)
  const [framingStats, setFramingStats] = useState<FramingStat[]>((page.framingStats as FramingStat[]) ?? [])
  const [tableQuestions, setTableQuestions] = useState<TableQuestion[]>((page.tableQuestions as TableQuestion[]) ?? [])
  const [seedProblems, setSeedProblems] = useState<SeedProblem[]>((page.seedProblems as SeedProblem[]) ?? [])
  const [contributionsOpen, setContributionsOpen] = useState(page.contributionsOpen)
  const [reportSummary, setReportSummary] = useState(page.reportSummary ?? "")
  const [reportUrl, setReportUrl] = useState(page.reportUrl ?? "")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function save() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/conversations/${eventId}`, {
          method: "PUT",
          headers: await csrfHeaders(),
          body: JSON.stringify({
            heroHeadline,
            heroSubline,
            framingStats,
            tableQuestions,
            seedProblems,
            contributionsOpen,
            // Trimmed-empty means "clear the field" (null), not "store empty string".
            reportSummary: reportSummary.trim() || null,
            reportUrl: reportUrl.trim() || null,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to save config")
        onSaved(data.data)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">{error}</div>
      )}
      {saved && (
        <div className="p-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41]">Saved.</div>
      )}

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4 space-y-3">
        <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Hero</h2>
        <TextField label="Headline" value={heroHeadline} onChange={setHeroHeadline} maxLength={200} />
        <TextField label="Subline" value={heroSubline} onChange={setHeroSubline} maxLength={300} />
      </div>

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4 space-y-3">
        <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Framing Stats</h2>
        <FramingStatsEditor items={framingStats} onChange={setFramingStats} />
      </div>

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4 space-y-3">
        <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Table Questions</h2>
        <TableQuestionsEditor items={tableQuestions} onChange={setTableQuestions} />
      </div>

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4 space-y-3">
        <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Seed Problems</h2>
        <SeedProblemsEditor items={seedProblems} onChange={setSeedProblems} />
      </div>

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4 space-y-3">
        <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Report</h2>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-[11px] font-mono text-[#555]">Report summary</label>
            <span className="text-[10px] font-mono text-[#444]">{reportSummary.length}/1200</span>
          </div>
          <textarea
            value={reportSummary}
            onChange={(e) => setReportSummary(e.target.value)}
            placeholder="Short written brief, paragraphs separated by a blank line…"
            rows={5}
            maxLength={1200}
            className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] placeholder:text-[#444] focus:outline-none focus:border-[#00ff41]/50 resize-y"
          />
        </div>
        <TextField label="Report URL (https only)" value={reportUrl} onChange={setReportUrl} maxLength={500} />
      </div>

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4 flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Contributions Open</h2>
          <p className="text-[10px] font-mono text-[#444] mt-1">Turn off to stop taking new problem statements.</p>
        </div>
        <button
          onClick={() => setContributionsOpen((v) => !v)}
          className={`px-3 py-1.5 rounded text-[11px] font-mono font-semibold border transition-all ${
            contributionsOpen
              ? "bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]"
              : "bg-[#1a1a1a] border-[#222] text-[#666]"
          }`}
        >
          {contributionsOpen ? "Open" : "Closed"}
        </button>
      </div>

      <button
        onClick={save}
        disabled={isPending}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-3 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-xs font-mono font-semibold text-[#00ff41] transition-all disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save config
      </button>
    </div>
  )
}

function TextField({
  label, value, onChange, maxLength,
}: { label: string; value: string; onChange: (v: string) => void; maxLength: number }) {
  return (
    <div>
      <label className="block text-[11px] font-mono text-[#555] mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50"
      />
    </div>
  )
}

function FramingStatsEditor({ items, onChange }: { items: FramingStat[]; onChange: (v: FramingStat[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 bg-[#111] border border-[#1a1a1a] rounded-lg p-2.5">
          <div className="flex-1 space-y-1.5">
            <input
              value={item.line}
              onChange={(e) => onChange(items.map((it, j) => (j === i ? { ...it, line: e.target.value } : it)))}
              placeholder="Stat line"
              maxLength={300}
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2.5 py-1.5 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50"
            />
            <input
              value={item.source}
              onChange={(e) => onChange(items.map((it, j) => (j === i ? { ...it, source: e.target.value } : it)))}
              placeholder="Source"
              maxLength={200}
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2.5 py-1.5 text-[11px] font-mono text-[#888] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50"
            />
          </div>
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove stat ${i + 1}`} className="p-1.5 text-[#555] hover:text-[#ff3333] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, { line: "", source: "" }])}
        className="flex items-center gap-1.5 text-[11px] font-mono text-[#555] hover:text-[#00ff41] transition-colors"
      >
        <Plus className="w-3 h-3" />
        Add stat
      </button>
    </div>
  )
}

function TableQuestionsEditor({ items, onChange }: { items: TableQuestion[]; onChange: (v: TableQuestion[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 bg-[#111] border border-[#1a1a1a] rounded-lg p-2.5">
          <div className="flex-1 space-y-1.5">
            <div className="flex gap-1.5">
              <input
                value={item.key}
                onChange={(e) => onChange(items.map((it, j) => (j === i ? { ...it, key: e.target.value } : it)))}
                placeholder="key"
                maxLength={40}
                className="w-24 bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2.5 py-1.5 text-[11px] font-mono text-[#00d4ff] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50"
              />
              <input
                value={item.label}
                onChange={(e) => onChange(items.map((it, j) => (j === i ? { ...it, label: e.target.value } : it)))}
                placeholder="Label"
                maxLength={120}
                className="flex-1 bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2.5 py-1.5 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50"
              />
            </div>
            <input
              value={item.description}
              onChange={(e) => onChange(items.map((it, j) => (j === i ? { ...it, description: e.target.value } : it)))}
              placeholder="Description"
              maxLength={300}
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2.5 py-1.5 text-[11px] font-mono text-[#888] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50"
            />
          </div>
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove question ${i + 1}`} className="p-1.5 text-[#555] hover:text-[#ff3333] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, { key: "", label: "", description: "" }])}
        className="flex items-center gap-1.5 text-[11px] font-mono text-[#555] hover:text-[#00ff41] transition-colors"
      >
        <Plus className="w-3 h-3" />
        Add question
      </button>
    </div>
  )
}

function SeedProblemsEditor({ items, onChange }: { items: SeedProblem[]; onChange: (v: SeedProblem[]) => void }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 bg-[#111] border border-[#1a1a1a] rounded-lg p-2.5">
          <div className="flex-1 space-y-1.5">
            <div className="flex gap-1.5">
              <input
                value={item.title}
                onChange={(e) => onChange(items.map((it, j) => (j === i ? { ...it, title: e.target.value } : it)))}
                placeholder="Title"
                maxLength={150}
                className="flex-1 bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2.5 py-1.5 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50"
              />
              <input
                value={item.questionKey}
                onChange={(e) => onChange(items.map((it, j) => (j === i ? { ...it, questionKey: e.target.value } : it)))}
                placeholder="key"
                maxLength={40}
                className="w-24 bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2.5 py-1.5 text-[11px] font-mono text-[#00d4ff] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50"
              />
            </div>
            <textarea
              value={item.statement}
              onChange={(e) => onChange(items.map((it, j) => (j === i ? { ...it, statement: e.target.value } : it)))}
              placeholder="Statement"
              rows={2}
              maxLength={600}
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2.5 py-1.5 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50 resize-none"
            />
            <input
              value={item.buildWedge ?? ""}
              onChange={(e) => onChange(items.map((it, j) => (j === i ? { ...it, buildWedge: e.target.value } : it)))}
              placeholder="Build wedge (optional)"
              maxLength={300}
              className="w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded px-2.5 py-1.5 text-[11px] font-mono text-[#888] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50"
            />
          </div>
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove seed ${i + 1}`} className="p-1.5 text-[#555] hover:text-[#ff3333] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, { title: "", statement: "", questionKey: "" }])}
        className="flex items-center gap-1.5 text-[11px] font-mono text-[#555] hover:text-[#00ff41] transition-colors"
      >
        <Plus className="w-3 h-3" />
        Add seed problem
      </button>
    </div>
  )
}
