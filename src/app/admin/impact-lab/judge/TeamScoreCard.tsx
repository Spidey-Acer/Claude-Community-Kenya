"use client"

import { ExternalLink, Loader2 } from "lucide-react"
import {
  JUDGING_CRITERIA,
  MAX_SCORE,
  MIN_SCORE,
  SCORE_LABELS,
  weightedTotal,
  type ScoreSheet,
} from "@/lib/impact-lab/judging"

export interface JudgeTeam {
  teamId: string
  teamName: string
  memberCount: number
  submission: {
    teamId: string
    projectName: string
    pitch: string
    repoUrl: string
    demoUrl: string | null
  } | null
}

export interface Draft {
  scores: ScoreSheet
  feedback: string
}

interface TeamScoreCardProps {
  team: JudgeTeam
  draft: Draft
  saving: boolean
  unsaved: boolean
  saveError: string
  onScore: (criterionKey: string, value: number) => void
  onFeedback: (value: string) => void
  onSave: () => void
}

const SCALE = Array.from(
  { length: MAX_SCORE - MIN_SCORE + 1 },
  (_, i) => MIN_SCORE + i
)

/**
 * One team's scorecard — the five criteria as full-width, thumb-sized 1–5
 * rows (not a slider or a tooltip) so a judge standing up can read every
 * anchor label before tapping, and a running total that always comes from
 * `weightedTotal` rather than a second calculation living in this component.
 */
export function TeamScoreCard({
  team,
  draft,
  saving,
  unsaved,
  saveError,
  onScore,
  onFeedback,
  onSave,
}: TeamScoreCardProps) {
  const total = weightedTotal(draft.scores)

  return (
    <div className="space-y-5 p-4 sm:p-5">
      <div>
        <p className="text-sm font-mono font-semibold text-[#e0e0e0]">
          {team.submission?.projectName ?? "(no submission)"}
        </p>
        {team.submission?.pitch && (
          <p className="mt-1 text-[12px] font-mono leading-relaxed text-[#999]">
            {team.submission.pitch}
          </p>
        )}
        <p className="mt-1.5 text-[10px] font-mono text-[#555]">
          {team.teamName} · {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
        </p>
        {team.submission && (
          <div className="mt-2 flex flex-wrap gap-3">
            {team.submission.repoUrl && (
              <a
                href={team.submission.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] font-mono text-[#00d4ff] hover:underline"
              >
                repo <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
            {team.submission.demoUrl && (
              <a
                href={team.submission.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] font-mono text-[#00d4ff] hover:underline"
              >
                demo <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="space-y-5">
        {JUDGING_CRITERIA.map((criterion) => {
          const selected = draft.scores[criterion.key]
          return (
            <div key={criterion.key}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[12px] font-mono font-semibold text-[#e0e0e0]">
                  {criterion.label}
                </p>
                <span className="shrink-0 text-[10px] font-mono text-[#555]">
                  {criterion.weight} pts
                </span>
              </div>
              <p className="mt-0.5 text-[11px] font-mono leading-relaxed text-[#888]">
                {criterion.guidance}
              </p>

              <div
                role="radiogroup"
                aria-label={criterion.label}
                className="mt-2 grid grid-cols-1 gap-1.5"
              >
                {SCALE.map((value) => {
                  const isSelected = selected === value
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => onScore(criterion.key, value)}
                      className={`flex items-center gap-2.5 rounded border px-3 py-3 text-left text-[12px] font-mono transition-colors ${
                        isSelected
                          ? "border-[#00ff41]/50 bg-[#00ff41]/10 text-[#00ff41]"
                          : "border-[#1e1e1e] bg-[#111] text-[#999] hover:bg-[#161616]"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                          isSelected
                            ? "border-[#00ff41] text-[#00ff41]"
                            : "border-[#333] text-[#666]"
                        }`}
                      >
                        {value}
                      </span>
                      {SCORE_LABELS[value]}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-lg border border-[#1e1e1e] bg-[#111] p-3 text-center">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[#555]">
          Weighted total
        </p>
        <p className="text-2xl font-mono font-bold text-[#00ff41]">
          {total}
          <span className="text-sm text-[#444]"> / 100</span>
        </p>
      </div>

      <div>
        <label
          htmlFor={`feedback-${team.teamId}`}
          className="block text-[11px] font-mono text-[#888] mb-1"
        >
          Feedback for the team (optional)
        </label>
        <textarea
          id={`feedback-${team.teamId}`}
          value={draft.feedback}
          onChange={(e) => onFeedback(e.target.value)}
          rows={3}
          placeholder="What stood out, what to work on…"
          className="w-full rounded border border-[#1e1e1e] bg-[#0d0d0d] px-3 py-2 text-[12px] font-mono text-[#e0e0e0] placeholder:text-[#444] focus:outline-none focus:border-[#00ff41]/40"
        />
      </div>

      {saveError && (
        <div className="rounded border border-[#ff3333]/30 bg-[#ff3333]/10 px-3 py-2 text-[11px] font-mono text-[#ff3333]">
          {saveError}
        </div>
      )}

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#00ff41]/40 bg-[#00ff41]/10 py-3.5 text-[13px] font-mono font-semibold text-[#00ff41] transition-colors hover:bg-[#00ff41]/20 disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </>
        ) : unsaved ? (
          "Save score"
        ) : (
          "Saved — tap to resave"
        )}
      </button>
    </div>
  )
}
