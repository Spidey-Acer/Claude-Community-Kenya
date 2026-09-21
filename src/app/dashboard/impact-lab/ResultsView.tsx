"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { SerializedRubric } from "@/lib/impact-lab/judging";
import type {
  AnnouncedWinner,
  MemberRankedTeam,
  ResultsTrackWinner,
  TeamCard,
  TeamReviewPayload,
  UnrankedTeam,
} from "@/lib/impact-lab/results";
import type { WinnerCardCell, WinnerCards, YourTeamCards } from "@/lib/impact-lab/results-cards";
import { REVIEW_PROVENANCE } from "@/lib/impact-lab/reviews";
import type { TeamJudgeNote } from "@/lib/impact-lab/reviews";
import { CopyLinkButton } from "@/app/impact-lab/results/[slug]/CopyLinkButton";
import { decidedByNote, didNotSubmitLine, yourTeamOverallLabel, yourTeamTrackLabel } from "./resultsViewCopy";

export interface ResultsViewProps {
  results: {
    publishedAt: string;
    /**
     * `"podium"` (an overall podium was announced), `"tracks"` (one winner
     * per track, no overall podium), or `"champion"` (one overall champion
     * AND a winner for one or more tracks, announced together). Always
     * present — `buildMemberPayload` already defaults a missing snapshot
     * value to `"podium"` before this prop is built.
     */
    announcementMode: "podium" | "tracks" | "champion";
    overall: AnnouncedWinner[];
    trackWinners: ResultsTrackWinner[];
    ranking: MemberRankedTeam[];
    /**
     * Teams that took part and were never scored. Absent on snapshots
     * published before the finals ran in heats, so always read through `?? []`.
     */
    unranked?: UnrankedTeam[];
    /**
     * The winners as Build Day cards, attached by the route when a card URL
     * can be derived. Absent (or with `imageUrl: null` cells) on a server
     * without the signing secret: the rows then show captions alone.
     */
    cards?: WinnerCards;
  };
  /** True when the viewer was on a team in the run, ranked or not. */
  viewerHadTeam?: boolean;
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
    /** The team's own public cards, one per honour — see `buildYourTeamCards`. */
    cards?: YourTeamCards;
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

// Spelled out, matching the original Impact Lab copy's "same five criteria"
// rather than switching to a numeral once a second rubric exists.
const CRITERIA_COUNT_WORDS: Record<number, string> = {
  1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
  6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
};

const SECTION_LABEL = "font-mono text-xs uppercase tracking-wider text-text-dim";
const EYEBROW = "font-mono text-[11px] uppercase tracking-[0.12em] text-amber";
const BUTTON =
  "inline-flex w-full items-center justify-center whitespace-nowrap rounded border px-3 py-2.5 font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-primary motion-reduce:transition-none";
const BUTTON_SECONDARY = `${BUTTON} border-border-default text-text-secondary hover:border-green-primary/40 hover:text-green-primary`;
const BUTTON_PRIMARY = `${BUTTON} border-green-primary/40 bg-green-primary/10 text-green-primary hover:bg-green-primary/20`;

/** The square PNG of one of the team's cards, and the download paths beside it. */
function cardSources(url: string, index: number) {
  const query = index === 0 ? "" : `?honour=${index}`;
  return {
    square: `${url}/card/square${query}`,
    portrait: `${url}/card/portrait${query}`,
    story: `${url}/card/story${query}`,
  };
}

/**
 * The viewer's own cards, one block per honour, exactly as the public page
 * lays them out: the square image, then the downloads; share and copy link
 * on the first block only, since they act on the page, not one card.
 */
function YourTeamCardBlocks({ cards, projectName }: { cards: YourTeamCards; projectName: string }) {
  const linkedIn = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cards.url)}`;
  return (
    <div className="space-y-10">
      {cards.honours.map((honour, index) => {
        const src = cardSources(cards.url, index);
        return (
          <div key={honour.slug}>
            {index > 0 && (
              <p className="mb-4 text-center font-mono text-sm text-text-primary">Also: {honour.label}</p>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element -- rendered per request by the card route, never through the optimiser's cache */}
            <img
              src={src.square}
              width={1080}
              height={1080}
              alt={`${honour.placingLine}: ${projectName}`}
              className="mx-auto block aspect-square w-full max-w-[480px] rounded-xl border border-border-default"
            />
            <div className={`mt-4 grid grid-cols-1 gap-2 ${index === 0 ? "md:grid-cols-5" : "md:grid-cols-3"}`}>
              <a href={src.square} download className={BUTTON_SECONDARY}>
                Download square
              </a>
              <a href={src.portrait} download className={BUTTON_SECONDARY}>
                Download portrait
              </a>
              <a href={src.story} download className={BUTTON_SECONDARY}>
                Download story
              </a>
              {index === 0 && (
                <>
                  <a href={linkedIn} target="_blank" rel="noopener noreferrer" className={BUTTON_PRIMARY}>
                    Share on LinkedIn
                  </a>
                  <CopyLinkButton url={cards.url} className={BUTTON_SECONDARY} />
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** One winner's card with its caption; a caption alone when no image URL could be derived. */
function WinnerCard({ cell }: { cell: WinnerCardCell }) {
  return (
    <figure className="min-w-0">
      {cell.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- rendered per request by the card route, never through the optimiser's cache
        <img
          src={cell.imageUrl}
          width={1080}
          height={1080}
          loading="lazy"
          alt={`${cell.caption}: ${cell.projectName}`}
          className="block aspect-square w-full rounded-lg border border-border-default"
        />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-border-default bg-bg-secondary p-4">
          <span className="text-center font-mono text-sm font-semibold text-text-primary">{cell.projectName}</span>
        </div>
      )}
      <figcaption className="mt-2 truncate font-mono text-[11px] uppercase tracking-wider text-text-dim">
        {cell.caption} <span className="text-text-secondary">&middot; {cell.projectName}</span>
      </figcaption>
    </figure>
  );
}

/** A row of winner cards: three across, a column at phone width. */
function WinnerRow({ label, cells }: { label: string; cells: WinnerCardCell[] }) {
  if (cells.length === 0) return null;
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-text-dim">{label}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cells.map((cell, i) => (
          <WinnerCard key={`${cell.teamId}-${i}`} cell={cell} />
        ))}
      </div>
    </div>
  );
}

/**
 * Results view — the payoff page. In order: the viewer's own team (its
 * Build Day cards, its placing, then the scores, the judges' notes and the
 * community review in the results email's order), the winners as cards
 * (the overall podium row, then the track winners), the full ranking
 * (position, project, track, track position — never a score), and the
 * note explaining how the announced placings and the scored ranking relate.
 *
 * The API has already stripped every other team's card and every `average`
 * from the ranking before this component ever sees it (see the route's own
 * doc comment) — nothing here re-derives or re-fetches a score.
 */
export function ResultsView({ results, viewerHadTeam = false, yourTeam, rubric }: ResultsViewProps) {
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

  const ranked = yourTeam?.card ? yourTeam : undefined;
  const yourRow = ranked ? results.ranking.find((r) => r.teamId === ranked.teamId) : undefined;
  const hasAnnouncedOverall = results.overall.length > 0;
  const hasAnnouncedTrackWinner = results.trackWinners.some((w) => w.basis === "announced");
  const notSubmitted = ranked ? null : didNotSubmitLine(viewerHadTeam || yourTeam !== undefined);

  // Winners: the podium row and the track row as cards when the route
  // attached them; otherwise the same two rows from the announced names.
  const cards: WinnerCards = results.cards ?? {
    podium:
      results.announcementMode === "tracks"
        ? []
        : results.overall.map((w) => ({
            teamId: w.teamId,
            projectName: w.projectName,
            caption: results.announcementMode === "champion" ? "Champion" : `${w.rank === 1 ? "1st" : w.rank === 2 ? "2nd" : w.rank === 3 ? "3rd" : `${w.rank}th`} place`,
            imageUrl: null,
          })),
    tracks: results.trackWinners.map((w) => ({ teamId: w.teamId, projectName: w.projectName, caption: `${w.track} winner`, imageUrl: null })),
  };

  const criteriaPhrase = `the same ${CRITERIA_COUNT_WORDS[rubric.criteria.length] ?? rubric.criteria.length} criteria`;
  // "the demo criterion" only when this rubric actually has one keyed
  // "demo" (Impact Lab's does) — naming a criterion that does not exist
  // under a different rubric would be a plain factual error.
  const demoCriterionPhrase = rubric.criteria.some((c) => c.key === "demo")
    ? "the demo criterion"
    : "the relevant criteria";

  return (
    <motion.div className="space-y-10" variants={container} initial="hidden" animate="show">
      {/* ── 1. Your team ───────────────────────────────────────────────── */}
      {ranked && (
        <motion.section variants={item} aria-label="Your team's results" className="space-y-6">
          <h2 className={`${SECTION_LABEL} text-green-primary`}>{"// ./your-team"}</h2>

          {ranked.cards ? (
            <YourTeamCardBlocks cards={ranked.cards} projectName={ranked.projectName} />
          ) : (
            <p className="font-mono text-xl font-bold text-text-primary sm:text-2xl">{ranked.projectName}</p>
          )}

          <p className="text-center font-mono text-sm text-text-secondary">
            {[
              yourTeamOverallLabel(true, ranked.card?.rank ?? 0, results.ranking.length),
              yourRow ? yourTeamTrackLabel(yourRow.trackPosition, yourRow.trackOf, yourRow.track) : null,
            ]
              .filter((part): part is string => part !== null)
              .join(" · ")}
          </p>

          {/* Scores, as the results email lays them out: eyebrow, a row per
              criterion, the range. The placing line sits above, under the cards. */}
          {ranked.card && (
            <div className="rounded-lg border border-border-default bg-bg-secondary p-5">
              <p className={EYEBROW}>Your scores</p>

              {ranked.card.basis === "submission" && (
                <p className="mt-3 rounded border border-border-default bg-bg-card p-3 text-xs leading-relaxed text-text-secondary">
                  Your project was reviewed from your written submission against{" "}
                  {criteriaPhrase}. A live demo was not part of that review, which
                  is noted against {demoCriterionPhrase} below.
                </p>
              )}

              <div className="mt-4 divide-y divide-border-default">
                {rubric.criteria.map((criterion) => {
                  const value = ranked.card?.criterionAverages[criterion.key] ?? 0;
                  const span = criterion.max - criterion.min;
                  const pct =
                    span === 0
                      ? 100
                      : Math.max(0, Math.min(100, ((value - criterion.min) / span) * 100));
                  return (
                    <div key={criterion.key} className="py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-xs text-text-secondary">{criterion.label}</span>
                        <span className="font-mono text-sm text-text-primary">
                          {value.toFixed(1)} <span className="text-text-dim">/ {criterion.max}</span>
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={criterion.label}
                        aria-valuemin={criterion.min}
                        aria-valuemax={criterion.max}
                        aria-valuenow={value}
                        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-card"
                      >
                        <div className="h-full rounded-full bg-amber" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {ranked.card.low !== null && ranked.card.high !== null && (
                <p className="mt-3 font-mono text-[11px] text-text-dim">
                  Score range across judges: {ranked.card.low.toFixed(1)}–{ranked.card.high.toFixed(1)} / {rubric.totalOutOf}
                </p>
              )}
            </div>
          )}

          <Feedback judgeNotes={ranked.judgeNotes} review={ranked.review} />
        </motion.section>
      )}

      {notSubmitted && (
        <motion.section variants={item} aria-label="Your team">
          <p className="rounded-lg border border-border-default bg-bg-secondary p-4 font-mono text-sm text-text-secondary">
            {notSubmitted}
          </p>
          {/* An unscored team can still have been written to: a judge may
              have left a note without completing a sheet, and the review is
              written after publish. Those words are not withheld. */}
          {yourTeam && <div className="mt-6"><Feedback judgeNotes={yourTeam.judgeNotes} review={yourTeam.review} /></div>}
        </motion.section>
      )}

      {/* ── 2. Winners ─────────────────────────────────────────────────── */}
      {(cards.podium.length > 0 || cards.tracks.length > 0) && (
        <motion.section variants={item} aria-label="Winners" className="space-y-5">
          <h2 className={SECTION_LABEL}>{"// ./winners"}</h2>
          <WinnerRow label={results.announcementMode === "champion" ? "Overall" : "Podium"} cells={cards.podium} />
          <WinnerRow label="Track winners" cells={cards.tracks} />
        </motion.section>
      )}

      {/* ── 3. Full ranking ────────────────────────────────────────────── */}
      <motion.section variants={item} aria-label="Full ranking">
        <h2 className={`mb-3 ${SECTION_LABEL}`}>{"// ./full-ranking"}</h2>
        <div className="overflow-x-auto rounded-lg border border-border-default">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr className="border-b border-border-default bg-bg-secondary">
                {["Position", "Project", "Track", "Track position"].map((h) => (
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
                  <tr key={row.teamId} className={isSelf ? "bg-green-primary/10" : undefined}>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-text-dim">{row.rank}</td>
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
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-text-secondary">{row.track}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-text-secondary">
                      {row.trackPosition === 1 ? "1st" : row.trackPosition === 2 ? "2nd" : row.trackPosition === 3 ? "3rd" : `${row.trackPosition}th`} of {row.trackOf}
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
        <h2 className={`mb-3 ${SECTION_LABEL}`}>{"// ./how-these-results-were-decided"}</h2>
        <div className="space-y-3 rounded-lg border border-border-default bg-bg-secondary p-5 text-sm leading-relaxed text-text-secondary">
          <p className="font-mono text-sm font-semibold text-text-primary">How these results were decided</p>
          <p>
            Every project that was submitted has been reviewed against{" "}
            {criteriaPhrase} and ranked. Where the panel saw a live demo, their
            scores are the ones shown. Where a team submitted but the panel did
            not see it presented, the project was reviewed from the written
            submission instead.
          </p>
          <p>{decidedByNote(hasAnnouncedOverall, hasAnnouncedTrackWinner, results.announcementMode)}</p>
          <p>Scores are shown in full because you are entitled to see how your own work was assessed.</p>
        </div>
      </motion.section>
    </motion.div>
  );
}

/**
 * Written feedback, in the email's order: a judge's own note quoted under
 * that judge's name, then the community review signed by the community.
 * Two provenances, kept visibly apart; nothing here presents generated
 * words as a judge's.
 */
function Feedback({ judgeNotes, review }: { judgeNotes?: TeamJudgeNote[]; review?: TeamReviewPayload }) {
  if ((!judgeNotes || judgeNotes.length === 0) && !review) return null;
  return (
    <div className="space-y-4">
      {judgeNotes?.map((note) => (
        <figure key={`${note.judgeName}-${note.text.slice(0, 24)}`} className="border-l-2 border-amber bg-bg-secondary py-3 pl-4 pr-4">
          <figcaption className={EYEBROW}>Judge&apos;s note &middot; {note.judgeName}</figcaption>
          <blockquote className="mt-2 whitespace-pre-line font-serif text-base italic leading-relaxed text-text-primary">
            &ldquo;{note.text}&rdquo;
          </blockquote>
        </figure>
      ))}
      {review && (
        <div className="rounded-lg border border-amber/40 bg-bg-secondary p-5">
          <p className={EYEBROW}>Community review</p>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-text-secondary">
            {review.text.split(/\n\n+/).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          <p className="mt-4 font-mono text-xs text-text-primary">&mdash; {review.signedBy}</p>
          <p className="mt-1 font-mono text-[11px] leading-relaxed text-text-dim">{REVIEW_PROVENANCE}</p>
        </div>
      )}
    </div>
  );
}
