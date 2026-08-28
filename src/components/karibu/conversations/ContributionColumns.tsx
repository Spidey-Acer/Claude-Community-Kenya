/**
 * ContributionColumns — the three table-question columns on a Conversations
 * event page (stack on mobile). Each column lists its APPROVED/FEATURED
 * contributions as cards (name + county attribution), FEATURED pinned to
 * the top with a subtle marker, newest first otherwise. An empty column
 * reads as an honest invitation, not a dead end. Server component — display
 * only, the submit form is a separate section (ContributionForm).
 */

import { Reveal } from "@/components/karibu/motion/Reveal";
import type {
  ConversationsContributionView,
  ConversationsTableQuestion,
} from "@/lib/conversations/queries";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

interface ContributionColumnsProps {
  tableQuestions: ConversationsTableQuestion[];
  contributionsByQuestionKey: Record<string, ConversationsContributionView[]>;
}

export function ContributionColumns({
  tableQuestions,
  contributionsByQuestionKey,
}: ContributionColumnsProps) {
  if (tableQuestions.length === 0) return null;

  return (
    <section className={`${WRAP} pb-14`} aria-label="The three questions">
      <Reveal>
        <div className="mb-6 font-inter text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
          What Kenya is telling us
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {tableQuestions.map((q) => (
            <Column key={q.key} question={q} contributions={contributionsByQuestionKey[q.key] ?? []} />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function Column({
  question,
  contributions,
}: {
  question: ConversationsTableQuestion;
  contributions: ConversationsContributionView[];
}) {
  return (
    <div className="rounded-2xl border border-sand bg-paper-card p-5">
      <h3 className="mb-1.5 font-newsreader text-[19px] leading-[1.2] text-ink">{question.label}</h3>
      {question.description && (
        <p className="mb-4 font-inter text-[13.5px] leading-[1.5] text-ink-muted">
          {question.description}
        </p>
      )}
      {contributions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-sand-2 p-4 font-inter text-[13.5px] leading-[1.5] text-ink-muted">
          Nobody&apos;s answered this one yet &mdash; yours could be first.
        </p>
      ) : (
        <ul className="space-y-3" role="list">
          {contributions.map((c) => (
            <li
              key={c.id}
              className={`rounded-xl border p-4 ${
                c.featured ? "border-clay/40 bg-clay/5" : "border-sand-2 bg-paper"
              }`}
            >
              {c.featured && (
                <span className="mb-1.5 inline-block font-inter text-[10.5px] font-semibold uppercase tracking-[0.08em] text-clay">
                  Featured
                </span>
              )}
              <p className="mb-2 font-inter text-[14px] leading-[1.55] text-ink">{c.body}</p>
              <p className="font-inter text-[12px] text-ink-muted">
                {c.submitterName} · {c.county}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
