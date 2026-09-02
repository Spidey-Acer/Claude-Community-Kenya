"use client";

import { ExternalLink } from "lucide-react";
import {
  submissionLinks,
  type JudgeTeamRow,
} from "@/lib/impact-lab/judge-team";
import {
  scoreTotal,
  type JudgingRubric,
  type ScoreSheet,
} from "@/lib/impact-lab/judging";
import { CriterionRadioGroup } from "./CriterionRadioGroup";
import { BODY, CARD, CARD_PAD, EYEBROW, FOCUS_RING, PRIMARY_BUTTON, TAP } from "./judge-ui";

/**
 * Everything a judge needs about one team, on one surface: what the team
 * wrote, who is standing in front of them, the criteria, and Save.
 *
 * Rendered exactly once — inline under its row on a phone, in the right-hand
 * pane on a laptop. The action bar carrying the live total and Save is pinned
 * above the pitch timer on a phone (`bottom-12` clears the timer's collapsed
 * `h-12`) and sticks to the bottom of the detail pane on a laptop.
 */

/**
 * The three written answers, in the order a judge reads them at a table: who
 * it is for, what is actually real, and where the AI sits. Declared once
 * rather than repeated inline so the labels cannot drift from the fields.
 */
const WRITTEN_ANSWERS: {
  key: "problemTackled" | "worksVsMocked" | "claudeUsage";
  heading: string;
}[] = [
  { key: "problemTackled", heading: "Who it helps" },
  { key: "worksVsMocked", heading: "What works vs mocked" },
  { key: "claudeUsage", heading: "Where Claude sits" },
];

/** Claude's optional read of a submission. Observations and questions, never a score. */
export interface AssistResult {
  readsAs: string;
  observations: { criterion: string; note: string }[];
  questionsToAsk: string[];
  watchFor: string;
}

export function TeamDetail({
  team,
  rubric,
  sheet,
  feedback,
  savedAtLabel,
  dirty,
  saving,
  error,
  assist,
  assisting,
  onScore,
  onFeedback,
  onSave,
  onAskClaude,
}: {
  team: JudgeTeamRow;
  rubric: JudgingRubric;
  sheet: ScoreSheet;
  feedback: string;
  /** Clock time of the last successful save, or null if never saved. */
  savedAtLabel: string | null;
  /** Whether this sheet has been edited since that save. */
  dirty: boolean;
  saving: boolean;
  error: string | null;
  assist: AssistResult | undefined;
  assisting: boolean;
  onScore: (criterionKey: string, value: number) => void;
  onFeedback: (text: string) => void;
  onSave: () => void;
  onAskClaude: () => void;
}) {
  const total = scoreTotal(sheet, rubric);
  const scoredCount = rubric.criteria.filter(
    (criterion) => typeof sheet[criterion.key] === "number"
  ).length;
  const links = submissionLinks(team.submission);

  return (
    <div className="pb-4">
      <TeamIdentity team={team} />

      {team.submission ? (
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="font-mono text-lg font-bold text-text-primary break-words">
              {team.submission.projectName}
            </h3>
            <p className={`${BODY} mt-1.5`}>{team.submission.pitch}</p>
          </div>

          {WRITTEN_ANSWERS.map((answer) => {
            const text = team.submission?.[answer.key]?.trim();
            if (!text) return null;
            return (
              <div key={answer.key} className={`${CARD} ${CARD_PAD}`}>
                <p className={EYEBROW}>{answer.heading}</p>
                <p className={`${BODY} mt-1.5 whitespace-pre-line`}>{text}</p>
              </div>
            );
          })}

          {links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${TAP} ${FOCUS_RING} inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-card px-3 py-2 font-mono text-xs uppercase tracking-wider text-text-secondary transition-colors hover:border-green-primary/40 hover:text-green-primary`}
                >
                  {link.label}
                  <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={`mt-4 ${CARD} ${CARD_PAD}`}>
          <p className={EYEBROW}>No written submission</p>
          <p className={`${BODY} mt-1.5`}>
            This team did not file the form. Score the live demo on what you see
            and hear — a missing form is not itself a mark against them.
          </p>
        </div>
      )}

      <MemberList team={team} />

      <div className="mt-5">
        <ClaudeAssist
          assist={assist}
          assisting={assisting}
          hasSubmission={team.submission !== null}
          onAsk={onAskClaude}
        />
      </div>

      <div className="mt-6 space-y-6">
        {rubric.criteria.map((criterion) => (
          <CriterionRadioGroup
            key={criterion.key}
            criterion={criterion}
            value={sheet[criterion.key]}
            scoreLabels={rubric.scoreLabels}
            onChange={(value) => onScore(criterion.key, value)}
          />
        ))}
      </div>

      <div className="mt-6">
        <label htmlFor={`fb-${team.teamId}`} className={EYEBROW}>
          What should this team hear? (optional)
        </label>
        <textarea
          id={`fb-${team.teamId}`}
          rows={3}
          value={feedback}
          onChange={(event) => onFeedback(event.target.value)}
          className={`mt-2 w-full rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-[15px] text-text-primary ${FOCUS_RING} focus:border-green-primary`}
        />
      </div>

      <SaveBar
        total={total}
        totalOutOf={rubric.totalOutOf}
        scoredCount={scoredCount}
        criteriaCount={rubric.criteria.length}
        savedAtLabel={savedAtLabel}
        dirty={dirty}
        saving={saving}
        error={error}
        onSave={onSave}
      />
    </div>
  );
}

/** Table, team name and track — the detail pane's own heading on a laptop. */
function TeamIdentity({ team }: { team: JudgeTeamRow }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {team.table !== null && (
        <span className="font-mono text-base font-bold text-text-primary">
          Table {team.table}
        </span>
      )}
      <span className="font-mono text-xs uppercase tracking-wider text-text-dim">
        {team.teamName}
      </span>
      <span className="rounded-full border border-border-default px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-text-dim">
        {team.trackLabel}
      </span>
    </div>
  );
}

/**
 * Who is presenting. Roles are shown because they tell a judge who to put a
 * technical question to, and the leader is marked because that is the person
 * who should answer for the team.
 */
function MemberList({ team }: { team: JudgeTeamRow }) {
  if (team.members.length === 0) {
    return (
      <div className="mt-5">
        <p className={EYEBROW}>The team</p>
        <p className={`${BODY} mt-1.5`}>
          {team.memberCount} member{team.memberCount === 1 ? "" : "s"}. Their
          profiles are not on this run.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5">
      <p className={EYEBROW}>
        The team · {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
      </p>
      <ul className="mt-2 space-y-1.5">
        {team.members.map((member) => (
          <li key={member.id} className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[15px] text-text-primary">{member.fullName}</span>
            <span className="font-mono text-xs uppercase tracking-wider text-text-dim">
              {member.primaryRole}
            </span>
            {member.isLeader && (
              <span className="font-mono text-xs uppercase tracking-wider text-green-primary">
                Leader
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Optional reading help. Returns observations and questions, never scores — a
 * suggested number would anchor the judge before they had formed a view.
 */
function ClaudeAssist({
  assist,
  assisting,
  hasSubmission,
  onAsk,
}: {
  assist: AssistResult | undefined;
  assisting: boolean;
  hasSubmission: boolean;
  onAsk: () => void;
}) {
  if (!assist) {
    return (
      <button
        type="button"
        onClick={onAsk}
        disabled={assisting || !hasSubmission}
        className={`w-full ${TAP} ${FOCUS_RING} rounded-lg border border-cyan/30 bg-cyan/5 px-3 py-2.5 font-mono text-xs uppercase tracking-wider text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-40`}
      >
        {assisting
          ? "Reading the submission…"
          : hasSubmission
            ? "Ask Claude to read this submission"
            : "Nothing submitted to read"}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-cyan/30 bg-cyan/5 p-4">
      <p className="font-mono text-xs uppercase tracking-wider text-cyan">
        Reading help · not a score
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-text-primary">
        {assist.readsAs}
      </p>
      <ul className="mt-3 space-y-2">
        {assist.observations.map((observation) => (
          <li key={observation.criterion} className="text-sm leading-relaxed">
            <span className="text-text-dim">{observation.criterion}: </span>
            <span className="text-text-secondary">{observation.note}</span>
          </li>
        ))}
      </ul>
      <p className={`${EYEBROW} mt-3`}>Ask them</p>
      <ul className="mt-1 list-disc space-y-1 pl-4">
        {assist.questionsToAsk.map((question) => (
          <li key={question} className="text-sm text-text-secondary">
            {question}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-amber">Watch for: {assist.watchFor}</p>
      <p className="mt-3 text-xs text-text-dim">
        Claude read only what this team wrote. The score is yours.
      </p>
    </div>
  );
}

/**
 * The live total and Save, always reachable.
 *
 * Pinned above the pitch timer on a phone because the criteria are taller than
 * a phone screen and a Save button at the bottom of that scroll is a Save
 * button that gets missed between demos.
 */
function SaveBar({
  total,
  totalOutOf,
  scoredCount,
  criteriaCount,
  savedAtLabel,
  dirty,
  saving,
  error,
  onSave,
}: {
  total: number;
  totalOutOf: number;
  scoredCount: number;
  criteriaCount: number;
  savedAtLabel: string | null;
  dirty: boolean;
  saving: boolean;
  error: string | null;
  onSave: () => void;
}) {
  const state = saving
    ? "Saving…"
    : dirty
      ? "Not saved yet"
      : savedAtLabel
        ? `Saved ${savedAtLabel}`
        : "Not scored";

  return (
    <div className="fixed inset-x-0 bottom-12 z-20 border-t border-border-default bg-bg-primary/95 px-4 py-3 backdrop-blur lg:sticky lg:bottom-0 lg:px-0">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 lg:max-w-none">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-xl font-bold tabular-nums text-text-primary">
            {total} / {totalOutOf}
          </span>
          <span
            aria-live="polite"
            className={`font-mono text-xs uppercase tracking-wider ${
              dirty ? "text-amber" : savedAtLabel ? "text-green-primary" : "text-text-dim"
            }`}
          >
            {state} · {scoredCount}/{criteriaCount}
          </span>
        </div>
        <button type="button" onClick={onSave} disabled={saving} className={PRIMARY_BUTTON}>
          {saving ? "Saving…" : "Save score"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
