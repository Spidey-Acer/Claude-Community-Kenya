import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import {
  AUDIENCES,
  INTENTS,
  AUDIENCE_LABELS,
  INTENT_LABELS,
  type Audience,
  type Intent,
} from "@/lib/karibu/types"

export const dynamic = "force-dynamic"

/**
 * /admin/karibu — Onboarding funnel analytics dashboard.
 * Shows session stats, audience + intent breakdowns, 7-day trend, and
 * recent completions with JoinApplication linkage.
 */
export default async function KaribuAdminPage() {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(startOfToday)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6) // inclusive of today = 7 days

  // ── Single batch fetch for 7-day window (buckets computed below) ──────────
  const [
    allSessions,
    todayStarted,
    todayCompleted,
    totalCompleted,
    totalSessions,
    activePersonalised,
    recentCompletions,
  ] = await Promise.all([
    // Full 7-day window for trend; select minimal fields
    prisma.onboardingSession.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, completedAt: true, skipped: true, audience: true },
    }),
    // Today counts
    prisma.onboardingSession.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.onboardingSession.count({
      where: {
        completedAt: { gte: startOfToday },
        skipped: false,
        audience: { not: null },
      },
    }),
    // All-time counts for rate + breakdowns
    prisma.onboardingSession.count({
      where: { completedAt: { not: null }, skipped: false, audience: { not: null } },
    }),
    prisma.onboardingSession.count(),
    prisma.onboardingSession.count({ where: { audience: { not: null }, skipped: false } }),
    // Recent 10 completions
    prisma.onboardingSession.findMany({
      where: { skipped: false, audience: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: {
        id: true,
        audience: true,
        intent: true,
        city: true,
        completedAt: true,
        createdAt: true,
      },
    }),
  ])

  // Completion rate
  const completionRate =
    totalSessions === 0 ? 0 : Math.round((totalCompleted / totalSessions) * 100)

  // ── Audience breakdown ────────────────────────────────────────────────────
  const audienceCounts: Record<Audience, number> = {
    dev: 0,
    non_tech_pro: 0,
    student: 0,
    founder: 0,
    creator: 0,
  }
  // Re-use allSessions for audience counts (only 7-day; do a separate full-period count)
  // For audience breakdown we need all-time, so query separately
  const audienceRows = await prisma.onboardingSession.groupBy({
    by: ["audience"],
    where: { skipped: false, audience: { not: null }, completedAt: { not: null } },
    _count: { audience: true },
  })
  for (const row of audienceRows) {
    if (row.audience) audienceCounts[row.audience as Audience] = row._count.audience
  }

  // ── Intent breakdown ──────────────────────────────────────────────────────
  const intentCounts: Record<Intent, number> = {
    learn_basics: 0,
    find_event: 0,
    find_collaborators: 0,
    build: 0,
    hire_or_partner: 0,
    other: 0,
  }
  const intentRows = await prisma.onboardingSession.groupBy({
    by: ["intent"],
    where: { skipped: false, intent: { not: null }, completedAt: { not: null } },
    _count: { intent: true },
  })
  for (const row of intentRows) {
    if (row.intent) intentCounts[row.intent as Intent] = row._count.intent
  }

  // ── 7-day trend: bucket from in-memory `allSessions` ─────────────────────
  type DayBucket = { label: string; started: number; completed: number; skipped: number }
  const trendDays: DayBucket[] = []
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(startOfToday)
    dayStart.setDate(dayStart.getDate() - i)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    const label = dayStart.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    let started = 0, completed = 0, skipped = 0
    for (const s of allSessions) {
      if (s.createdAt >= dayStart && s.createdAt < dayEnd) {
        started++
        if (s.skipped) skipped++
        else if (s.completedAt) completed++
      }
    }
    trendDays.push({ label, started, completed, skipped })
  }
  // Reverse so newest first
  trendDays.reverse()

  // ── Linked check for recent completions ──────────────────────────────────
  const completionIds = recentCompletions.map((s) => s.id)
  const linkedApps = await prisma.joinApplication.findMany({
    where: { karibuSessionId: { in: completionIds } },
    select: { karibuSessionId: true },
  })
  const linkedSet = new Set(linkedApps.map((a) => a.karibuSessionId))

  // ── Relative time helper ──────────────────────────────────────────────────
  function relativeTime(date: Date | null): string {
    if (!date) return "—"
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60) return "just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  // Audience pill colours (cycling through token set)
  const AUDIENCE_COLORS: Record<Audience, { text: string; border: string; bg: string }> = {
    dev: { text: "#00ff41", border: "#00ff41", bg: "#00ff41" },
    non_tech_pro: { text: "#00d4ff", border: "#00d4ff", bg: "#00d4ff" },
    student: { text: "#ffb000", border: "#ffb000", bg: "#ffb000" },
    founder: { text: "#a855f7", border: "#a855f7", bg: "#a855f7" },
    creator: { text: "#ff6b6b", border: "#ff6b6b", bg: "#ff6b6b" },
  }

  return (
    <div>
      <AdminHeader title="Karibu" />
      <div className="p-6 max-w-6xl space-y-4">

        {/* ── Header stat tiles ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Today Started", value: todayStarted, color: "#888" },
            { label: "Today Completed", value: todayCompleted, color: "#00ff41" },
            { label: "Completion Rate", value: `${completionRate}%`, color: "#00d4ff" },
            { label: "Active Personalised", value: activePersonalised, color: "#ffb000" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-3">
              <div className="text-xl font-mono font-bold" style={{ color }}>{value}</div>
              <div className="text-[10px] font-mono text-[#555] uppercase tracking-wider mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Audience + Intent breakdown row ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Audience breakdown */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
            <h2 className="text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">
              Audience Breakdown (all-time completions)
            </h2>
            <div className="space-y-2">
              {AUDIENCES.map((aud) => {
                const count = audienceCounts[aud]
                const pct = totalCompleted === 0 ? 0 : Math.round((count / totalCompleted) * 100)
                const c = AUDIENCE_COLORS[aud]
                return (
                  <div key={aud}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-mono" style={{ color: c.text }}>
                        {AUDIENCE_LABELS[aud]}
                      </span>
                      <span className="text-[11px] font-mono text-[#555]">{count} · {pct}%</span>
                    </div>
                    <div className="h-1 rounded bg-[#1e1e1e] overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{ width: `${pct}%`, backgroundColor: c.bg, opacity: 0.7 }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Intent breakdown */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
            <h2 className="text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">
              Intent Breakdown (all-time completions)
            </h2>
            <div className="space-y-1.5">
              {INTENTS.map((intent) => {
                const count = intentCounts[intent]
                const pct = totalCompleted === 0 ? 0 : Math.round((count / totalCompleted) * 100)
                return (
                  <div key={intent} className="flex items-center justify-between py-1 border-b border-[#141414] last:border-0">
                    <span className="text-[11px] font-mono text-[#888]">{INTENT_LABELS[intent]}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[#555]">{pct}%</span>
                      <span className="text-[11px] font-mono font-bold text-[#aaa]">{count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── 7-day trend ──────────────────────────────────────────────── */}
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
          <h2 className="text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">
            7-Day Trend
          </h2>
          <div className="space-y-1">
            {/* Header row */}
            <div className="flex items-center gap-2 px-2 pb-1 border-b border-[#1e1e1e]">
              <span className="flex-1 text-[10px] font-mono text-[#444] uppercase tracking-wider">Date</span>
              <span className="w-16 text-right text-[10px] font-mono text-[#444] uppercase tracking-wider">Started</span>
              <span className="w-16 text-right text-[10px] font-mono text-[#00ff41]/50 uppercase tracking-wider">Done</span>
              <span className="w-16 text-right text-[10px] font-mono text-[#ff3333]/50 uppercase tracking-wider">Skipped</span>
            </div>
            {trendDays.map((day, idx) => (
              <div
                key={day.label}
                className="flex items-center gap-2 px-2 py-1.5 rounded"
                style={{ backgroundColor: idx % 2 === 0 ? "#111" : "transparent" }}
              >
                <span className="flex-1 text-[11px] font-mono text-[#666]">{day.label}</span>
                <span className="w-16 text-right text-[11px] font-mono text-[#888]">{day.started}</span>
                <span className="w-16 text-right text-[11px] font-mono text-[#00ff41]">{day.completed}</span>
                <span className="w-16 text-right text-[11px] font-mono text-[#ff3333]">{day.skipped}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Recent completions ────────────────────────────────────────── */}
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-x-auto">
          <div className="px-5 py-3 border-b border-[#1e1e1e]">
            <h2 className="text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">
              Recent Completions (last 10)
            </h2>
          </div>
          {recentCompletions.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-mono text-[#444]">No completions yet</p>
            </div>
          ) : (
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="px-4 py-2 text-left text-[10px] font-mono text-[#444] uppercase tracking-wider">When</th>
                  <th className="px-4 py-2 text-left text-[10px] font-mono text-[#444] uppercase tracking-wider">Audience</th>
                  <th className="px-4 py-2 text-left text-[10px] font-mono text-[#444] uppercase tracking-wider">Intent</th>
                  <th className="px-4 py-2 text-left text-[10px] font-mono text-[#444] uppercase tracking-wider">City</th>
                  <th className="px-4 py-2 text-left text-[10px] font-mono text-[#444] uppercase tracking-wider">Linked?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {recentCompletions.map((s) => {
                  const aud = s.audience as Audience | null
                  const c = aud ? AUDIENCE_COLORS[aud] : null
                  const isLinked = linkedSet.has(s.id)
                  return (
                    <tr key={s.id} className="hover:bg-[#111] transition-colors">
                      <td className="px-4 py-2.5 text-[11px] font-mono text-[#666]">
                        {relativeTime(s.completedAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        {aud && c ? (
                          <span
                            className="text-[11px] font-mono px-2 py-0.5 rounded border"
                            style={{
                              color: c.text,
                              borderColor: `${c.border}30`,
                              backgroundColor: `${c.bg}08`,
                            }}
                          >
                            {AUDIENCE_LABELS[aud]}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-[#444]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] font-mono text-[#777]">
                        {s.intent ? INTENT_LABELS[s.intent as Intent] : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] font-mono text-[#666]">
                        {s.city ?? "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {isLinked ? (
                          <span className="text-[#00ff41] text-sm">✓</span>
                        ) : (
                          <span className="text-[#333] text-sm">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  )
}
