"use client"

import { ExternalLink, Loader2 } from "lucide-react"
import {
  scoreTotal,
  type JudgingCriterion,
  type JudgingRubric,
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
  rubric: JudgingRubric
  draft: Draft
  saving: boolean
  unsaved: boolean
  saveError: string
  onScore: (criterionKey: string, value: number) => void
  onFeedback: (value: string) => void
  onSave: () => void
}

/** Every selectable value for one criterion, built from its own min/max. */
function scaleFor(criterion: JudgingCriterion): number[] {
  return Array.from(
    { length: criterion.max - criterion.min + 1 },
    (_, i) => criterion.min + i
  )
}

// The labeled 1–5 Impact Lab scale stays a single stacked column so its
// anchor text is legible. An unlabeled scale (Afretec, up to 1–10) has no
// text to make room for, so it packs into a numeric grid instead — capped at
// 5 columns so it wraps into extra rows rather than overflowing sideways.
function gridColsClass(criterion: JudgingCriterion, labeled: boolean): string {
  if (labeled) return "grid-cols-1"
  return criterion.max - criterion.min + 1 <= 4 ? "grid-cols-4" : "grid-cols-5"
}

/**
 * One team's scorecard. The scale — how many buttons, what they're labeled —
 * comes entirely from the rubric passed in, because a fixed five-button 1–5
 * row cannot represent a criterion the panel scored out of 10. A running
 * total that always comes from `scoreTotal(draft.scores, rubric)` rather than
 * a second calculation living in this component.
 */
export function TeamScoreCard({
  team,
  rubric,
  draft,
  saving,
  unsaved,
  saveError,
  onScore,
  onFeedback,
  onSave,
}: TeamScoreCardProps) {
  const total = scoreTotal(draft.scores, rubric)
  const totalLabel = rubric.scoring === "points" ? "Total" : "Weighted total"

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
        {rubric.criteria.map((criterion) => {
          const selected = draft.scores[criterion.key]
          const labels = rubric.scoreLabels
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
                className={`mt-2 grid gap-1.5 ${gridColsClass(criterion, !!labels)}`}
              >
                {scaleFor(criterion).map((value) => {
                  const isSelected = selected === value
                  const anchor = labels?.[value]
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={
                        anchor
                          ? `${criterion.label}: ${value} — ${anchor}`
                          : `${criterion.label}: ${value} of ${criterion.max}`
                      }
                      onClick={() => onScore(criterion.key, value)}
                      className={`flex items-center gap-2.5 rounded border py-3 text-[12px] font-mono transition-colors ${
                        labels ? "px-3 text-left" : "justify-center px-1"
                      } ${
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
                      {anchor}
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
          {totalLabel}
        </p>
        <p className="text-2xl font-mono font-bold text-[#00ff41]">
          {total}
          <span className="text-sm text-[#444]"> / {rubric.totalOutOf}</span>
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
