"use client"

import { useCallback, useEffect, useState } from "react"
import { ExternalLink, Loader2, Mail } from "lucide-react"
import { apiGet } from "./api"

/**
 * Cards tab: every team's share card for the cohort's final run, grouped by
 * placing, so an organiser sees each card before publish and before any
 * email goes out.
 *
 * Read-only. The PNGs come from `results/card` and the list from
 * `results/cards`, both of which render the same `renderCard` the public
 * routes serve — what is on this screen is what a team will download. Before
 * publish the placings follow score order: the winners are chosen on the
 * Results tab and frozen at publish, and this tab does not carry a second
 * copy of that selection.
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

/** HTML for an attribute value: the four characters that could end it or its element. */
function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function cardUrl(cohort: string, teamId: string, size: "square" | "portrait" | "story"): string {
  return `/api/admin/impact-lab/results/card?cohort=${encodeURIComponent(cohort)}&teamId=${encodeURIComponent(teamId)}&size=${size}`
}

export function CardsTab({ cohort }: { cohort: string }) {
  const [data, setData] = useState<CardsData | null>(null)
  const [status, setStatus] = useState<PublishStatus | null>(null)
  const [counts, setCounts] = useState<NotifyCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const q = `?cohort=${encodeURIComponent(cohort)}`
    try {
      const [cards, publish, notify] = await Promise.all([
        apiGet<CardsData>(`/api/admin/impact-lab/results/cards${q}`),
        apiGet<PublishStatus>(`/api/admin/impact-lab/results/publish${q}`),
        apiGet<NotifyCounts>(`/api/admin/impact-lab/results/notify${q}`),
      ])
      setData(cards)
      setStatus(publish)
      setCounts(notify)
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
    />
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
  cardSrc = cardUrl,
}: {
  cohort: string
  data: CardsData
  status: PublishStatus
  counts: NotifyCounts
  previewError: string | null
  onPreviewEmail: (teamId: string) => void
  cardSrc?: typeof cardUrl
}) {
  const publishedOn = status.publishedAt
    ? new Date(status.publishedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
    : null

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
                  className="space-y-3 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- rendered per request, must not be cached by the optimiser */}
                  <img
                    src={cardSrc(cohort, team.teamId, "square")}
                    width={1080}
                    height={1080}
                    loading="lazy"
                    alt={`${team.placingLine}: ${team.projectName}`}
                    className="block aspect-square w-full rounded border border-[#1e1e1e]"
                  />
                  <div>
                    <p className="text-sm font-mono font-semibold text-[#e0e0e0]">{team.projectName}</p>
                    <p className="text-[11px] font-mono text-[#888]">
                      {team.teamName} &middot; {team.placingLine}
                      {team.overallRank !== null ? ` \u00b7 ${ordinal(team.overallRank)} overall` : ""}
                    </p>
                    <p className="text-[11px] font-mono text-[#555]">
                      {team.members.length} member{team.members.length === 1 ? "" : "s"}
                      {team.members.length > 0 ? `: ${team.members.join(", ")}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={cardSrc(cohort, team.teamId, "portrait")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-[#1e1e1e] px-2 py-1 text-[11px] font-mono text-[#888] hover:border-[#333] hover:text-[#e0e0e0]"
                    >
                      <ExternalLink className="h-3 w-3" /> Portrait
                    </a>
                    <a
                      href={cardSrc(cohort, team.teamId, "story")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-[#1e1e1e] px-2 py-1 text-[11px] font-mono text-[#888] hover:border-[#333] hover:text-[#e0e0e0]"
                    >
                      <ExternalLink className="h-3 w-3" /> Story
                    </a>
                    <button
                      type="button"
                      onClick={() => onPreviewEmail(team.teamId)}
                      className="inline-flex items-center gap-1 rounded border border-[#00d4ff]/40 px-2 py-1 text-[11px] font-mono text-[#00d4ff] hover:bg-[#00d4ff]/10"
                    >
                      <Mail className="h-3 w-3" /> Preview email
                    </button>
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
