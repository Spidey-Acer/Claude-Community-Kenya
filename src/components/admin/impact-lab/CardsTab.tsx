"use client"

import { useCallback, useEffect, useState } from "react"
import { ExternalLink, Eye, EyeOff, Loader2, Mail } from "lucide-react"
import { apiGet, apiSend } from "./api"
import { isShowcased, showcaseGrantedBy, type ShowcaseEntry } from "@/lib/impact-lab/results"

/**
 * Cards tab: every team's share card for the cohort's final run, grouped by
 * placing, so an organiser sees each card before publish and before any
 * email goes out.
 *
 * The card grid itself is read-only: the PNGs come from `results/card` and
 * the list from `results/cards`, both of which render the same `renderCard`
 * the public routes serve — what is on this screen is what a team will
 * download. Before publish the placings follow score order: the winners are
 * chosen on the Results tab and frozen at publish, and this tab does not
 * carry a second copy of that selection.
 *
 * The one write this tab performs is showcase consent: a per-team toggle
 * (plus "Showcase all" / "Clear all") that writes
 * `ResultsSnapshot.showcase` via `PATCH /api/admin/impact-lab/runs/[id]` —
 * see `handleSetShowcase` in that route. That flag, not anything on this
 * tab's own card data, is what `buildEventProjects` (event-projects.ts)
 * reads to decide whether a team's write-up, review and links appear on the
 * public Projects tab. It only applies once results are published (the
 * snapshot it writes onto does not exist before then), same gate
 * commendations already has.
 */

type CardGroup = "champion" | "winner" | "runner-up" | "third" | "built"

const GROUP_ORDER: CardGroup[] = ["champion", "winner", "runner-up", "third", "built"]
const GROUP_LABEL: Record<CardGroup, string> = {
  champion: "Champion",
  winner: "Track winners",
  "runner-up": "Runners-up",
  third: "Third",
  built: "Built",
}

interface CardTeam {
  teamId: string
  teamName: string
  projectName: string
  track: string
  placingLine: string
  /** Every card the team gets, primary first: one per honour (see `cardHonours`). */
  honours: { placingLine: string; label: string; slug: string }[]
  /** Score-order position across all tracks; `null` for a team that took part unscored. */
  overallRank: number | null
  group: CardGroup
  members: string[]
}

const ORDINALS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" }
function ordinal(rank: number): string {
  return ORDINALS[rank] ?? `${rank}th`
}

interface CardsData {
  published: boolean
  teams: CardTeam[]
}

interface PublishStatus {
  published: boolean
  publishedAt: string | null
}

interface NotifyCounts {
  queued: number
  sent: number
  failed: number
}

interface PreviewEmailData {
  html: string
}

/** The slice of `/api/admin/impact-lab/judging` this tab reads. */
interface JudgingFinalRun {
  finalRunId: string | null
}

/** The slice of a run's payload that carries showcase consent. */
interface RunShowcaseData {
  resultsSnapshot?: { showcase?: Record<string, true | ShowcaseEntry> } | null
}

/**
 * What `handleSetShowcase` (`runs/[id]/route.ts`) hands back: the run
 * payload plus the merged showcase map, same shape `handleSetCommendations`
 * already returns for `commendations`.
 */
interface ShowcasePatchResponse {
  showcase: Record<string, true | ShowcaseEntry>
}

/** HTML for an attribute value: the four characters that could end it or its element. */
function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function cardUrl(cohort: string, teamId: string, size: "square" | "portrait" | "story", honour: number): string {
  return `/api/admin/impact-lab/results/card?cohort=${encodeURIComponent(cohort)}&teamId=${encodeURIComponent(teamId)}&size=${size}&honour=${honour}`
}

/** `Object.keys(patch).length` may not exceed this in one PATCH — `showcaseSchema`'s own cap. */
const SHOWCASE_PATCH_MAX = 50

/** `patch` split into `SHOWCASE_PATCH_MAX`-sized pieces, in stable key order. */
function chunkPatch(patch: Record<string, boolean>): Record<string, boolean>[] {
  const entries = Object.entries(patch)
  const chunks: Record<string, boolean>[] = []
  for (let i = 0; i < entries.length; i += SHOWCASE_PATCH_MAX) {
    chunks.push(Object.fromEntries(entries.slice(i, i + SHOWCASE_PATCH_MAX)))
  }
  return chunks
}

export function CardsTab({ cohort }: { cohort: string }) {
  const [data, setData] = useState<CardsData | null>(null)
  const [status, setStatus] = useState<PublishStatus | null>(null)
  const [counts, setCounts] = useState<NotifyCounts | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [showcase, setShowcase] = useState<Record<string, true | ShowcaseEntry>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [showcaseError, setShowcaseError] = useState<string | null>(null)
  const [showcaseBusy, setShowcaseBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const q = `?cohort=${encodeURIComponent(cohort)}`
    try {
      const [cards, publish, notify, judging] = await Promise.all([
        apiGet<CardsData>(`/api/admin/impact-lab/results/cards${q}`),
        apiGet<PublishStatus>(`/api/admin/impact-lab/results/publish${q}`),
        apiGet<NotifyCounts>(`/api/admin/impact-lab/results/notify${q}`),
        apiGet<JudgingFinalRun>(`/api/admin/impact-lab/judging${q}`),
      ])
      setData(cards)
      setStatus(publish)
      setCounts(notify)
      setRunId(judging.finalRunId)
      // The showcase map lives on the run's resultsSnapshot, not on `cards`
      // — a second round trip, the same pattern `CheckedInField` uses for
      // `checkedInRecorded` on this same route.
      if (judging.finalRunId) {
        const run = await apiGet<RunShowcaseData>(`/api/admin/impact-lab/runs/${judging.finalRunId}`)
        setShowcase(run.resultsSnapshot?.showcase ?? {})
      } else {
        setShowcase({})
      }
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load cards.")
    } finally {
      setLoading(false)
    }
  }, [cohort])

  useEffect(() => {
    void load()
  }, [load])

  /**
   * Write one or more teams' showcase consent. Chunked to respect
   * `showcaseSchema`'s 50-team cap; each chunk's response carries the full
   * merged map, so the last one applied is the new source of truth — no
   * extra round trip to re-read it.
   */
  async function patchShowcase(patch: Record<string, boolean>) {
    if (!runId) return
    setShowcaseBusy(true)
    setShowcaseError(null)
    try {
      let next: Record<string, true | ShowcaseEntry> = showcase
      for (const chunk of chunkPatch(patch)) {
        const result = await apiSend<ShowcasePatchResponse>(`/api/admin/impact-lab/runs/${runId}`, "PATCH", {
          showcase: chunk,
        })
        next = result.showcase
      }
      setShowcase(next)
    } catch (e) {
      setShowcaseError(e instanceof Error ? e.message : "Could not save showcase consent.")
    } finally {
      setShowcaseBusy(false)
    }
  }

  /**
   * Opens the team's rendered email in a new tab. The tab is opened
   * synchronously on the click (popup blockers allow that) and, once
   * `preview-email` has answered, navigated to a blob page that holds the
   * email in a sandboxed iframe — the same sandbox the Results tab's inline
   * preview uses, so the template runs with no scripts and no origin either
   * way. The route returns JSON, not a page, so the tab cannot simply be
   * pointed at it.
   */
  async function previewEmail(teamId: string) {
    setPreviewError(null)
    const tab = window.open("about:blank", "_blank")
    if (!tab) {
      setPreviewError("The browser blocked the preview tab. Allow pop-ups for this site and try again.")
      return
    }
    try {
      const preview = await apiGet<PreviewEmailData>(
        `/api/admin/impact-lab/results/preview-email?cohort=${encodeURIComponent(cohort)}&teamId=${encodeURIComponent(teamId)}`
      )
      const wrapper = `<!doctype html><html><head><meta charset="utf-8"><title>Email preview</title><style>html,body{margin:0;height:100%;background:#0a0a0a}iframe{border:0;width:100%;height:100%}</style></head><body><iframe sandbox="" srcdoc="${escapeAttribute(preview.html)}"></iframe></body></html>`
      tab.location.href = URL.createObjectURL(new Blob([wrapper], { type: "text/html" }))
    } catch (e) {
      tab.close()
      setPreviewError(e instanceof Error ? e.message : "Could not render that team's email.")
    }
  }

  if (error) {
    return (
      <div className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]">
        {error}
      </div>
    )
  }

  if (loading || !data || !status || !counts) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#333]" />
      </div>
    )
  }

  return (
    <CardsView
      cohort={cohort}
      data={data}
      status={status}
      counts={counts}
      previewError={previewError}
      onPreviewEmail={(teamId) => void previewEmail(teamId)}
      showcase={showcase}
      showcaseBusy={showcaseBusy}
      showcaseError={showcaseError}
      onShowcaseChange={(patch) => void patchShowcase(patch)}
    />
  )
}

/**
 * One team's showcase toggle. `checked` reflects the last value the server
 * confirmed — no optimistic flip — so a failed write never leaves the
 * switch showing a state the snapshot does not actually hold. `by` labels
 * who set it — the team itself, from their own dashboard toggle
 * (`POST /api/impact-lab/showcase`), or an organiser here — so the desk can
 * tell "we turned this on for them" apart from "they opted in themselves"
 * at a glance. Absent (not showcased, or showcased under the legacy `true`
 * shape) prints nothing.
 */
function ShowcaseSwitch({
  checked,
  by,
  busy,
  onChange,
}: {
  checked: boolean
  by: "team" | "organiser" | null
  busy: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={busy}
        onClick={() => onChange(!checked)}
        title="Showcase on event page"
        className={
          checked
            ? "inline-flex items-center gap-1 rounded border border-[#00ff41]/40 bg-[#00ff41]/10 px-2 py-1 text-[11px] font-mono text-[#00ff41] hover:bg-[#00ff41]/20 disabled:opacity-40"
            : "inline-flex items-center gap-1 rounded border border-[#1e1e1e] bg-[#1a1a1a] px-2 py-1 text-[11px] font-mono text-[#888] hover:bg-[#222] disabled:opacity-40"
        }
      >
        {checked ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        Showcase on event page
      </button>
      {checked && by && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#555]">
          &middot; {by}
        </span>
      )}
    </span>
  )
}

/**
 * "Showcased: N of M", plus "Showcase all" / "Clear all" — each armed by one
 * click and applied by a second, inline, rather than a browser `confirm()`
 * dialog (which a popup blocker or an automated test can silently swallow).
 * Clicking the OTHER bulk action, or navigating away from the confirm state
 * via any other control, simply leaves it armed until clicked again or the
 * component unmounts — there is nothing destructive about a stray click on
 * an already-armed button, since it takes the same action either way.
 */
function ShowcaseHeader({
  showcasedCount,
  total,
  busy,
  error,
  onShowcaseAll,
  onClearAll,
}: {
  showcasedCount: number
  total: number
  busy: boolean
  error: string | null
  onShowcaseAll: () => void
  onClearAll: () => void
}) {
  const [armed, setArmed] = useState<"all" | "clear" | null>(null)

  function run(action: "all" | "clear") {
    if (armed !== action) {
      setArmed(action)
      return
    }
    setArmed(null)
    if (action === "all") onShowcaseAll()
    else onClearAll()
  }

  return (
    <div className="space-y-2 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[11px] font-mono text-[#e0e0e0]">
          Showcased: <span className="text-[#00ff41]">{showcasedCount}</span> of {total}
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("all")}
          className={
            armed === "all"
              ? "rounded border border-[#00ff41]/60 bg-[#00ff41]/20 px-2 py-1 text-[11px] font-mono text-[#00ff41] disabled:opacity-40"
              : "rounded border border-[#1e1e1e] bg-[#1a1a1a] px-2 py-1 text-[11px] font-mono text-[#888] hover:bg-[#222] disabled:opacity-40"
          }
        >
          {armed === "all" ? "Click again to showcase all" : "Showcase all"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run("clear")}
          className={
            armed === "clear"
              ? "rounded border border-[#ff3333]/60 bg-[#ff3333]/20 px-2 py-1 text-[11px] font-mono text-[#ff3333] disabled:opacity-40"
              : "rounded border border-[#1e1e1e] bg-[#1a1a1a] px-2 py-1 text-[11px] font-mono text-[#888] hover:bg-[#222] disabled:opacity-40"
          }
        >
          {armed === "clear" ? "Click again to clear all" : "Clear all"}
        </button>
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#333]" />}
      </div>
      {error && (
        <p role="alert" className="text-[11px] font-mono text-[#ff3333]">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * The populated tab, split from the fetching so it renders from known
 * data. `cardSrc` lets a harness point the images somewhere other than the
 * admin route.
 */
export function CardsView({
  cohort,
  data,
  status,
  counts,
  previewError,
  onPreviewEmail,
  showcase,
  showcaseBusy,
  showcaseError,
  onShowcaseChange,
  cardSrc = cardUrl,
}: {
  cohort: string
  data: CardsData
  status: PublishStatus
  counts: NotifyCounts
  previewError: string | null
  onPreviewEmail: (teamId: string) => void
  /** teamId to its consent entry for every team showcased — team-granted, organiser-granted, or legacy `true`. */
  showcase: Record<string, true | ShowcaseEntry>
  showcaseBusy: boolean
  showcaseError: string | null
  /** teamId to next value, one or many at once (bulk actions patch every team in one call). */
  onShowcaseChange: (patch: Record<string, boolean>) => void
  cardSrc?: typeof cardUrl
}) {
  const publishedOn = status.publishedAt
    ? new Date(status.publishedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
    : null
  const showcasedCount = data.teams.filter((t) => isShowcased({ showcase }, t.teamId)).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Share cards</h2>
        <p className="mt-1 text-[11px] font-mono text-[#888]">
          {status.published ? (
            <>
              Results published {publishedOn}. Emails:{" "}
              <span className="text-[#00ff41]">{counts.sent} sent</span>, {counts.queued} queued
              {counts.failed > 0 ? <span className="text-[#ff3333]">, {counts.failed} failed</span> : null}.
            </>
          ) : (
            <>
              Not published. Placings below follow score order; the winners chosen on the Results
              tab are applied when you publish.
            </>
          )}{" "}
          Every card here is the PNG a team downloads from its public page.
        </p>
      </div>

      {previewError && (
        <div
          role="alert"
          className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 p-2 text-[11px] font-mono text-[#ff3333]"
        >
          {previewError}
        </div>
      )}

      {status.published && data.teams.length > 0 && (
        <ShowcaseHeader
          showcasedCount={showcasedCount}
          total={data.teams.length}
          busy={showcaseBusy}
          error={showcaseError}
          onShowcaseAll={() =>
            onShowcaseChange(Object.fromEntries(data.teams.map((t) => [t.teamId, true])))
          }
          onClearAll={() =>
            onShowcaseChange(Object.fromEntries(data.teams.map((t) => [t.teamId, false])))
          }
        />
      )}

      {data.teams.length === 0 && (
        <p className="p-8 text-center text-sm font-mono text-[#555]">
          No team in this run has a result yet.
        </p>
      )}

      {GROUP_ORDER.map((group) => {
        const teams = data.teams.filter((t) => t.group === group)
        if (teams.length === 0) return null
        return (
          <section key={group} className="space-y-3">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-[#555]">
              {GROUP_LABEL[group]} <span className="text-[#333]">({teams.length})</span>
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {teams.map((team) => (
                <article
                  key={team.teamId}
                  className={`space-y-3 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-3 ${team.honours.length > 1 ? "sm:col-span-2" : ""}`}
                >
                  {/* One card per honour, side by side for a team with two. */}
                  <div className="flex gap-3">
                    {team.honours.map((honour, index) => (
                      <div key={honour.slug} className="min-w-0 flex-1 space-y-2">
                        {/* eslint-disable-next-line @next/next/no-img-element -- rendered per request, must not be cached by the optimiser */}
                        <img
                          src={cardSrc(cohort, team.teamId, "square", index)}
                          width={1080}
                          height={1080}
                          loading="lazy"
                          alt={`${honour.placingLine}: ${team.projectName}`}
                          className="block aspect-square w-full rounded border border-[#1e1e1e]"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          {team.honours.length > 1 && (
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#555]">{honour.placingLine}</span>
                          )}
                          <a
                            href={cardSrc(cohort, team.teamId, "portrait", index)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-[#1e1e1e] px-2 py-1 text-[11px] font-mono text-[#888] hover:border-[#333] hover:text-[#e0e0e0]"
                          >
                            <ExternalLink className="h-3 w-3" /> Portrait
                          </a>
                          <a
                            href={cardSrc(cohort, team.teamId, "story", index)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-[#1e1e1e] px-2 py-1 text-[11px] font-mono text-[#888] hover:border-[#333] hover:text-[#e0e0e0]"
                          >
                            <ExternalLink className="h-3 w-3" /> Story
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-mono font-semibold text-[#e0e0e0]">{team.projectName}</p>
                    <p className="text-[11px] font-mono text-[#888]">
                      {team.teamName} &middot; {team.honours.map((h) => h.placingLine).join(" + ")}
                      {team.overallRank !== null ? ` \u00b7 ${ordinal(team.overallRank)} overall` : ""}
                    </p>
                    <p className="text-[11px] font-mono text-[#555]">
                      {team.members.length} member{team.members.length === 1 ? "" : "s"}
                      {team.members.length > 0 ? `: ${team.members.join(", ")}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onPreviewEmail(team.teamId)}
                      className="inline-flex items-center gap-1 rounded border border-[#00d4ff]/40 px-2 py-1 text-[11px] font-mono text-[#00d4ff] hover:bg-[#00d4ff]/10"
                    >
                      <Mail className="h-3 w-3" /> Preview email
                    </button>
                    {status.published && (
                      <ShowcaseSwitch
                        checked={isShowcased({ showcase }, team.teamId)}
                        by={showcaseGrantedBy({ showcase }, team.teamId)}
                        busy={showcaseBusy}
                        onChange={(next) => onShowcaseChange({ [team.teamId]: next })}
                      />
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
