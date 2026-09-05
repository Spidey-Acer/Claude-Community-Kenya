"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Award, Medal, Trophy } from "lucide-react";
import type { SerializedRubric } from "@/lib/impact-lab/judging";
import type {
  AnnouncedWinner,
  PublicRankedTeam,
  ResultsTrackWinner,
  TeamCard,
  TeamReviewPayload,
  UnrankedTeam,
} from "@/lib/impact-lab/results";
import { REVIEW_PROVENANCE } from "@/lib/impact-lab/reviews";
import type { TeamJudgeNote } from "@/lib/impact-lab/reviews";
import { decidedByNote, yourTeamOverallLabel } from "./resultsViewCopy";

export interface ResultsViewProps {
  results: {
    publishedAt: string;
    overall: AnnouncedWinner[];
    trackWinners: ResultsTrackWinner[];
    ranking: PublicRankedTeam[];
    /**
     * Teams that took part and were never scored. Absent on snapshots
     * published before the finals ran in heats, so always read through `?? []`.
     */
    unranked?: UnrankedTeam[];
  };
  yourTeam?: {
    teamId: string;
    projectName: string;
    /**
     * Absent exactly when this team is in `results.unranked`: it took part,
     * no judge scored it, and there is no rank or criterion average to show.
     * The section says that in words rather than rendering zeros, which would
     * read as a result the team earned.
     */
    card?: TeamCard;
    /** True when this team took part but was not scored in the finals. */
    unranked?: true;
    judgeNotes?: TeamJudgeNote[];
    review?: TeamReviewPayload;
  };
  /**
   * This event's own rubric — criteria, scales, and the denominator to quote
   * totals against. Never the Impact Lab constant: a second event does not
   * share Impact Lab's five criteria or its 1-5 scale, and every number
   * rendered below (the criterion bars, the "/ N" denominators, the score
   * range) is only meaningful read against the rubric it was scored on.
   */
  rubric: SerializedRubric;
}

const ORDINALS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
};

function ordinal(rank: number): string {
  return ORDINALS[rank] ?? `${rank}th`;
}

// Spelled out, matching the original Impact Lab copy's "same five criteria"
// rather than switching to a numeral once a second rubric exists.
const CRITERIA_COUNT_WORDS: Record<number, string> = {
  1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
  6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
};

/**
 * Results view — the payoff page. Four sections, in a fixed order: winners
 * (announced champion + runners-up, then track winners), the caller's own
 * scorecard, the full ranking (position/project/track only), and the note
 * explaining how the two published things — the panel's announcement and the
 * scored ranking — relate to each other.
 *
 * The API has already stripped every other team's card and every `average`
 * from the ranking before this component ever sees it (see the route's own
 * doc comment) — nothing here re-derives or re-fetches a score.
 */
export function ResultsView({ results, yourTeam, rubric }: ResultsViewProps) {
  const prefersReducedMotion = useReducedMotion();

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 } },
  };
  const item = prefersReducedMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
      };

  const [champion, ...runnersUp] = results.overall;
  // An unscored team has no ranking row, so its track has to come from the
  // unranked list instead — otherwise its own card would omit the track it
  // spent the day building in.
  const yourTrack = yourTeam
    ? (results.ranking.find((r) => r.teamId === yourTeam.teamId)?.track ??
      (results.unranked ?? []).find((r) => r.teamId === yourTeam.teamId)?.track)
    : undefined;

  // Whether an overall ranking was actually announced. `results.overall` is
  // `[]` both in "tracks" mode (one winner per track, no overall podium —
  // see `results.ts`'s own doc comment) and when a podium run announced zero
  // winners — `yourTeam.card.rank` is still populated in both cases (pure
  // score order), so a rank claim below has to be gated on this, not on
  // whether a card exists.
  const hasAnnouncedOverall = results.overall.length > 0;
  const hasAnnouncedTrackWinner = results.trackWinners.some((w) => w.basis === "announced");

  const criteriaPhrase = `the same ${CRITERIA_COUNT_WORDS[rubric.criteria.length] ?? rubric.criteria.length} criteria`;
  // "the demo criterion" only when this rubric actually has one keyed
  // "demo" (Impact Lab's does) — naming a criterion that does not exist
  // under a different rubric would be a plain factual error.
  const demoCriterionPhrase = rubric.criteria.some((c) => c.key === "demo")
    ? "the demo criterion"
    : "the relevant criteria";

  return (
    <motion.div className="space-y-8" variants={container} initial="hidden" animate="show">
      {/* ── 1. Winners ─────────────────────────────────────────────────── */}
      {(champion || results.trackWinners.length > 0) && (
        <motion.section variants={item} aria-label="Winners">
          <h2 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-dim">
            <Trophy className="h-3.5 w-3.5 text-amber" />
            {"// ./winners"}
          </h2>

          {champion && (
            <div className="relative overflow-hidden rounded-lg border border-amber/30 bg-amber/10 p-6">
              <div className="relative flex flex-wrap items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded border border-amber/40 bg-amber/15">
                  <Trophy className="h-7 w-7 text-amber" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-amber">
                    Champion
                  </p>
                  <p className="mt-1 truncate font-mono text-xl font-bold text-text-primary sm:text-2xl">
                    {champion.projectName}
                  </p>
                </div>
              </div>
            </div>
          )}

          {runnersUp.length > 0 && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {runnersUp.map((winner) => (
                <div
                  key={winner.teamId}
                  className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-secondary p-4"
                >
                  <Medal className="h-5 w-5 shrink-0 text-text-dim" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-text-dim">
                      {ordinal(winner.rank)} place
                    </p>
                    <p className="truncate font-mono text-sm font-semibold text-text-primary">
                      {winner.projectName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.trackWinners.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-text-dim">
                Track winners
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {results.trackWinners.map((winner) => (
                  <div
                    key={winner.track}
                    className="flex items-start gap-2 rounded border border-border-default bg-bg-secondary p-3"
                  >
                    <Award className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[10px] uppercase tracking-wider text-text-dim">
                        {winner.track}
                      </p>
                      <p className="truncate font-mono text-xs font-semibold text-text-primary">
                        {winner.projectName}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.section>
      )}

      {/* ── 2. Your team ───────────────────────────────────────────────── */}
      {yourTeam && (
        <motion.section
          variants={item}
          aria-label="Your team's results"
          className="rounded-lg border border-green-primary/30 bg-bg-secondary p-6"
        >
          <p className="font-mono text-[11px] uppercase tracking-wider text-green-primary mb-1">
            {"// ./your-results"}
          </p>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-mono text-xl font-bold text-text-primary sm:text-2xl">
              {yourTeam.projectName}
            </h2>
            <span className="font-mono text-xs text-text-dim">
              {[
                yourTeamOverallLabel(Boolean(yourTeam.card), hasAnnouncedOverall, yourTeam.card?.rank ?? 0),
                yourTrack,
              ]
                .filter((part): part is string => Boolean(part))
                .join(" · ")}
            </span>
          </div>

          {!yourTeam.card && (
            <p className="mt-3 rounded border border-border-default bg-bg-card p-3 text-sm leading-relaxed text-text-secondary">
              Your team was not scored in the finals. The panel judged in
              heats and did not reach every table, so there is no rank or
              scorecard for your project — not a low one. Your submission
              stands as part of the event.
            </p>
          )}

          {yourTeam.card && yourTeam.card.basis === "submission" && (
            <p className="mt-3 rounded border border-border-default bg-bg-card p-3 text-xs leading-relaxed text-text-secondary">
              Your project was reviewed from your written submission against{" "}
              {criteriaPhrase}. A live demo was not part of that review, which
              is noted against {demoCriterionPhrase} below.
            </p>
          )}

          {yourTeam.card && (
            <div className="mt-5 space-y-3">
            {rubric.criteria.map((criterion) => {
              const value = yourTeam.card?.criterionAverages[criterion.key] ?? 0;
              const span = criterion.max - criterion.min;
              const pct =
                span === 0
                  ? 100
                  : Math.max(0, Math.min(100, ((value - criterion.min) / span) * 100));
              return (
                <div key={criterion.key}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xs text-text-secondary">
                      {criterion.label}
                    </span>
                    <span className="font-mono text-xs text-text-dim">
                      {value.toFixed(1)} / {criterion.max}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={criterion.label}
                    aria-valuemin={criterion.min}
                    aria-valuemax={criterion.max}
                    aria-valuenow={value}
                    className="mt-1 h-2 w-full overflow-hidden rounded-full bg-bg-card"
                  >
                    <div
                      className="h-full rounded-full bg-green-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            </div>
          )}

          {yourTeam.card &&
            yourTeam.card.low !== null &&
            yourTeam.card.high !== null && (
              <p className="mt-4 font-mono text-[11px] text-text-dim">
                Score range across judges: {yourTeam.card.low.toFixed(1)}–
                {yourTeam.card.high.toFixed(1)} / {rubric.totalOutOf}
              </p>
            )}

          {/* Written feedback. Two streams with two provenances, kept visibly
              apart: a judge's own note is quoted under that judge's name; the
              community review is signed by the community and says so. Nothing
              here ever presents generated words as a judge's. */}
          {yourTeam.judgeNotes && yourTeam.judgeNotes.length > 0 && (
            <div className="mt-6 space-y-3">
              {yourTeam.judgeNotes.map((note) => (
                <figure
                  key={`${note.judgeName}-${note.text.slice(0, 24)}`}
                  className="rounded border border-amber/30 bg-amber/5 p-4"
                >
                  <figcaption className="font-mono text-[11px] uppercase tracking-wider text-amber">
                    Judge&apos;s note — {note.judgeName}
                  </figcaption>
                  <blockquote className="mt-2 whitespace-pre-line text-sm italic leading-relaxed text-text-primary">
                    &ldquo;{note.text}&rdquo;
                  </blockquote>
                </figure>
              ))}
            </div>
          )}

          {yourTeam.review && (
            <div className="mt-6 rounded border border-border-default bg-bg-card p-5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-cyan">
                Impact Lab review
              </p>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-text-secondary">
                {yourTeam.review.text.split(/\n\n+/).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
              <p className="mt-4 font-mono text-xs text-text-primary">
                — {yourTeam.review.signedBy}
              </p>
              <p className="mt-1 font-mono text-[11px] leading-relaxed text-text-dim">
                {REVIEW_PROVENANCE}
              </p>
            </div>
          )}
        </motion.section>
      )}

      {/* ── 3. Full ranking ────────────────────────────────────────────── */}
      <motion.section variants={item} aria-label="Full ranking">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-text-dim">
          {"// ./full-ranking"}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border-default">
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr className="border-b border-border-default bg-bg-secondary">
                {["Position", "Project", "Track"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="whitespace-nowrap px-4 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-text-dim"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {results.ranking.map((row) => {
                const isSelf = row.teamId === yourTeam?.teamId;
                return (
                  <tr
                    key={row.teamId}
                    className={isSelf ? "bg-green-primary/10" : undefined}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-text-dim">
                      {row.rank}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-text-primary">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {row.projectName}
                        {isSelf && (
                          <span className="rounded border border-green-primary/40 bg-green-primary/10 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-green-primary">
                            you
                          </span>
                        )}
                        {row.basis === "submission" && (
                          <span className="rounded border border-border-default bg-bg-card px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-text-dim">
                            Reviewed from submission
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-text-secondary">
                      {row.track}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.section>

      {/* ── 4. The note ────────────────────────────────────────────────── */}
      <motion.section variants={item} aria-label="How these results were decided">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-text-dim">
          {"// ./how-these-results-were-decided"}
        </h2>
        <div className="space-y-3 rounded-lg border border-border-default bg-bg-secondary p-5 text-sm leading-relaxed text-text-secondary">
          <p className="font-mono text-sm font-semibold text-text-primary">
            How these results were decided
          </p>
          <p>
            Every project that was submitted has been reviewed against{" "}
            {criteriaPhrase} and ranked. Where the panel saw a live demo, their
            scores are the ones shown. Where a team submitted but the panel did
            not see it presented, the project was reviewed from the written
            submission instead.
          </p>
          <p>{decidedByNote(hasAnnouncedOverall, hasAnnouncedTrackWinner)}</p>
          <p>
            Scores are shown in full because you are entitled to see how your
            own work was assessed.
          </p>
        </div>
      </motion.section>
    </motion.div>
  );
}
