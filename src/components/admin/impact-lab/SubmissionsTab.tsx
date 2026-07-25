"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Download, AlertTriangle, ExternalLink } from "lucide-react"
import { apiGet, apiSend } from "./api"

interface AdminSubmission {
  id: string
  runId: string
  teamId: string
  teamName: string
  projectName: string
  pitch: string
  description: string
  worksVsMocked: string
  claudeUsage: string
  track: string
  problemTackled: string
  repoUrl: string
  demoUrl: string | null
  videoUrl: string | null
  slidesUrl: string | null
  screenshotUrl: string | null
  status: string
  lastEditedByEmail: string
  updatedAt: string
  isStale: boolean
}

interface MissingTeam {
  teamId: string
  teamName: string
  members: string[]
}

interface SubmissionsData {
  finalRunId: string | null
  closeAt: string | null
  teamCount: number
  staleRunIds: string[]
  submissions: AdminSubmission[]
  missing: MissingTeam[]
}

/** ISO → the value a datetime-local input expects, in the browser's zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SubmissionsTab({ cohort }: { cohort: string }) {
  const [data, setData] = useState<SubmissionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deadline, setDeadline] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<SubmissionsData>(
        `/api/admin/impact-lab/submissions?cohort=${cohort}`
      )
      setData(res)
      setDeadline(toLocalInput(res.closeAt))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load submissions")
    } finally {
      setLoading(false)
    }
  }, [cohort])

  useEffect(() => {
    void load()
  }, [load])

  async function saveDeadline() {
    if (!data?.finalRunId) return
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/admin/impact-lab/runs/${data.finalRunId}`, "PATCH", {
        submissionsCloseAt: deadline ? new Date(deadline).toISOString() : null,
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save the deadline")
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(id: string, status: string) {
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/admin/impact-lab/submissions/${id}`, "PATCH", { status })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-[#333]" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
        {error ?? "No data"}
      </div>
    )
  }

  const forRun = data.submissions.filter((s) => !s.isStale)

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
          {error}
        </div>
      )}

      {data.staleRunIds.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-2 p-2 bg-[#ffb000]/10 border border-[#ffb000]/30 rounded text-[11px] font-mono text-[#ffb000]"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {data.submissions.filter((s) => s.isStale).length} submission(s) belong to an
            earlier final run and are detached from the teams currently published. Re-marking
            a run final does not move submissions — check before judging. These submissions
            are excluded from the judging CSV download; the teams that made them need to
            resubmit or be re-added before judging.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 p-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg">
        <div>
          <div className="text-xl font-mono font-bold text-[#00ff41]">
            {forRun.length}
            <span className="text-[#444]"> / {data.teamCount}</span>
          </div>
          <div className="text-[10px] font-mono text-[#555] uppercase tracking-wider">
            teams submitted
          </div>
        </div>

        <div>
          <label
            htmlFor="submissions-deadline"
            className="block text-[10px] font-mono text-[#555] mb-1 uppercase"
          >
            Submissions close
          </label>
          <div className="flex items-center gap-2">
            <input
              id="submissions-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="bg-[#111] border border-[#1e1e1e] rounded px-2 py-1.5 text-xs font-mono text-[#e0e0e0]"
            />
            <button
              onClick={saveDeadline}
              disabled={busy || !data.finalRunId}
              className="px-3 py-1.5 bg-[#161616] hover:bg-[#1e1e1e] border border-[#2a2a2a] rounded text-[11px] font-mono text-[#888] disabled:opacity-40"
            >
              Save
            </button>
          </div>
          <p className="mt-1 text-[10px] font-mono text-[#555]">
            Blank means open with no deadline.
          </p>
        </div>

        <a
          href={`/api/admin/impact-lab/submissions/export?cohort=${cohort}`}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-[11px] font-mono text-[#888]"
        >
          <Download className="h-3 w-3" /> Download CSV
        </a>
      </div>

      {data.missing.length > 0 && (
        <div className="p-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg">
          <p className="text-[10px] font-mono text-[#555] uppercase tracking-wider mb-2">
            Not yet submitted ({data.missing.length})
          </p>
          <ul className="space-y-1">
            {data.missing.map((m) => (
              <li key={m.teamId} className="text-[11px] font-mono text-[#888]">
                <span className="text-[#e0e0e0]">{m.teamName}</span>
                <span className="text-[#555]"> — {m.members.join(", ")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
        {data.submissions.length === 0 ? (
          <p className="p-8 text-center text-sm font-mono text-[#555]">
            No submissions yet
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                {["Team", "Project", "Track", "Links", "Status", "Updated", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {data.submissions.map((s) => (
                <tr key={s.id} className="hover:bg-[#111] align-top">
                  <td className="px-4 py-3 text-[11px] font-mono text-[#e0e0e0]">
                    {s.teamName}
                    {s.isStale && (
                      <span className="ml-1.5 text-[9px] uppercase text-[#ffb000]">stale</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[11px] font-mono text-[#e0e0e0]">{s.projectName}</div>
                    <div className="text-[10px] font-mono text-[#666]">{s.pitch}</div>
                  </td>
                  <td className="px-4 py-3 text-[10px] font-mono text-[#888]">{s.track}</td>
                  <td className="px-4 py-3 space-y-0.5">
                    {[
                      ["repo", s.repoUrl],
                      ["demo", s.demoUrl],
                      ["video", s.videoUrl],
                      ["slides", s.slidesUrl],
                    ]
                      .filter(([, url]) => Boolean(url))
                      .map(([label, url]) => (
                        <a
                          key={label}
                          href={url as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] font-mono text-[#00d4ff] hover:underline"
                        >
                          {label} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ))}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Status for ${s.teamName}`}
                      value={s.status}
                      disabled={busy || s.isStale}
                      onChange={(e) => setStatus(s.id, e.target.value)}
                      className="bg-[#111] border border-[#1e1e1e] rounded px-1.5 py-1 text-[10px] font-mono text-[#e0e0e0] disabled:opacity-40"
                    >
                      {["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED"].map((v) => (
                        <option key={v} value={v}>
                          {v.toLowerCase().replace("_", " ")}
                        </option>
                      ))}
                    </select>
                    {s.isStale && (
                      <p className="mt-1 text-[9px] font-mono text-[#ffb000]">
                        excluded from CSV
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[10px] font-mono text-[#555]">
                    {new Date(s.updatedAt).toLocaleString()}
                    <div className="text-[9px] text-[#444]">{s.lastEditedByEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                      aria-expanded={expanded === s.id}
                      className="text-[10px] font-mono text-[#666] hover:text-[#999]"
                    >
                      {expanded === s.id ? "hide" : "detail"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {expanded &&
        (() => {
          const s = data.submissions.find((x) => x.id === expanded)
          if (!s) return null
          return (
            <div className="p-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg space-y-3">
              <p className="text-[10px] font-mono text-[#555] uppercase tracking-wider">
                {s.teamName} — {s.projectName}
              </p>
              {[
                ["Problem", s.problemTackled],
                ["What it does", s.description],
                ["Works vs mocked", s.worksVsMocked],
                ["How they used Claude", s.claudeUsage],
              ].map(([label, body]) => (
                <div key={label}>
                  <p className="text-[10px] font-mono text-[#555] uppercase">{label}</p>
                  <p className="text-[11px] font-mono leading-relaxed text-[#aaa] whitespace-pre-wrap">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          )
        })()}
    </div>
  )
}
