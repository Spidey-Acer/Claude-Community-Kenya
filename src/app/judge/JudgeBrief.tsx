"use client";

import { ChevronDown } from "lucide-react";
import {
  criterionDescription,
  type JudgeBriefCriterion,
} from "@/lib/impact-lab/judge-brief";
import type { Track } from "@/lib/impact-lab/tracks";
import { BODY, CARD, CARD_PAD, EYEBROW, GHOST_BUTTON, TAP } from "./judge-ui";

/**
 * Everything a judge needs that is not the scorecard, on the same screen as
 * the scorecard.
 *
 * Judges take their briefing at 4:45 and start scoring at 5:00 from a phone,
 * standing up. A briefing sheet that lives in a PDF, a WhatsApp message or the
 * organiser's head is a sheet nobody re-reads at 5:12 when a team says something odd — so
 * tonight's flow, the rubric, the fixed track rules, the guardrail fails and
 * the panel rules live here, one tap from the team being scored.
 *
 * The rubric and the tracks are read from the event's live data, never
 * transcribed: a brief that quotes different weights from the scorecard beside
 * it is worse than no brief. The static sections are the organiser's words for
 * tonight and are deliberately hardcoded — they describe one evening's run of
 * show, not a configurable property of the system.
 */

/** Tonight's run of show, from the organiser. */
const TONIGHT: { time: string; what: string }[] = [
  {
    time: "4:00",
    what: "Submissions locked. Every team's written submission is on your scoring screen from then.",
  },
  {
    time: "4:45",
    what: "Judges' call at the judges' table. Briefing, recusals, demo order. Calibration: ten minutes on one July clip.",
  },
  {
    time: "5:00",
    what: "Presentations start. Five minutes per team, live demo only. Backup video plays only if the live demo dies in the first minute.",
  },
  {
    time: "After the last demo",
    what: "Scores lock. The panel settles track winners and the champion.",
  },
  { time: "Then", what: "Awards. Track winners, then the champion." },
];

/** What a total means, so two judges reading the same demo land in the same band. */
const BANDS: { range: string; meaning: string }[] = [
  { range: "90 plus", meaning: "You would show it to the beneficiary tomorrow." },
  { range: "70 to 89", meaning: "A real slice works and the person is nameable." },
  {
    range: "50 to 69",
    meaning: "Something runs but the beneficiary or the slice is fuzzy.",
  },
  {
    range: "Below 50",
    meaning: "Slideware, fantasy scope, or nobody nameable at the centre.",
  },
];

/** Track-specific breaches. Each one is scored down under Working demo. */
const GUARDRAIL_FAILS: string[] = [
  'Kazi says "you may have" or gives any diagnosis.',
  "Kilimo cites a scheme, figure or USSD code no document backs.",
  "Elimu puts a child in front of the tool or takes learner data.",
];

/** How the panel runs itself. */
const PANEL_RULES: string[] = [
  "Recusal: if you have a stake in a team, say so at the 4:45 judges' call and skip that team.",
  "Domain judges score only Impact and Beneficiary clarity.",
  "Anthropic's visiting team, Samari Gilbert, Courtney O'Donnell and Jack Stump, judge alongside the local panel; the same rubric applies to everyone.",
  "The panel's decision is final and the reasons stay in the room.",
];

export function JudgeBrief({
  tracks,
  criteria,
}: {
  /** The event's declared tracks. Empty is normal for an event without them. */
  tracks: Track[];
  /** The live rubric, as the judge-events endpoint sent it. */
  criteria: JudgeBriefCriterion[];
}) {
  return (
    <div className="space-y-8 pb-4">
      <Section title="Tonight" eyebrow="// ./run-of-show">
        <ol className="space-y-3">
          {TONIGHT.map((slot) => (
            <li key={slot.time} className="flex flex-col gap-0.5">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-green-primary">
                {slot.time}
              </span>
              <span className={BODY}>{slot.what}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="How to score" eyebrow="// ./how-to-score">
        <p className={BODY}>
          Each criterion is scored 1 to 5. A 1 means &ldquo;not shown&rdquo; and
          earns none of that criterion&rsquo;s weight; a 5 earns all of it.
        </p>
        <p className={`${BODY} mt-3`}>
          Score every team on all criteria unless you are a domain judge (see
          the panel rules below).
        </p>
        <p className={`${BODY} mt-3`}>
          Live demo only. A backup video plays only if the live demo dies in the
          first minute.
        </p>
        <p className={`${BODY} mt-3 border-l-2 border-green-primary/40 pl-3`}>
          The sijui rule: a build that says &ldquo;I don&rsquo;t know&rdquo;
          correctly beats one that guesses.
        </p>
      </Section>

      <Section title="The rubric" eyebrow="// ./rubric">
        {criteria.length === 0 ? (
          <p className={BODY}>
            This event&rsquo;s rubric did not load. Reload the page before you
            score anything.
          </p>
        ) : (
          <ul className="space-y-3">
            {criteria.map((criterion) => (
              <li
                key={criterion.key}
                className={`${CARD} ${CARD_PAD}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-sm font-bold text-text-primary break-words">
                    {criterion.label}
                  </span>
                  <span className="shrink-0 font-mono text-sm text-green-primary">
                    {criterion.weight}
                  </span>
                </div>
                {criterionDescription(criterion.key, criterion.guidance) && (
                  <p className={`${BODY} mt-1.5`}>
                    {criterionDescription(criterion.key, criterion.guidance)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="What high and low look like" eyebrow="// ./bands">
        <ul className="space-y-2.5">
          {BANDS.map((band) => (
            <li key={band.range} className="flex flex-col gap-0.5">
              <span className="font-mono text-xs uppercase tracking-wider text-text-primary">
                {band.range}
              </span>
              <span className={BODY}>{band.meaning}</span>
            </li>
          ))}
        </ul>
      </Section>

      {tracks.length > 0 && (
        <Section title="The three tracks" eyebrow="// ./tracks">
          <div className="space-y-3">
            {tracks.map((track) => (
              <TrackCard key={track.key} track={track} />
            ))}
          </div>
        </Section>
      )}

      <Section
        title="Guardrail fails, scored under Working demo"
        eyebrow="// ./guardrails"
      >
        <Bullets items={GUARDRAIL_FAILS} />
        <p className={`${BODY} mt-4 border-l-2 border-amber/50 pl-3`}>
          The Kazi reading: the build stores nothing about the patient. The
          clinic&rsquo;s own records are the clinic&rsquo;s business and not
          part of the build. Do not fail a team for a nurse copying the note
          into a clinic file.
        </p>
      </Section>

      <Section title="Panel rules" eyebrow="// ./panel">
        <Bullets items={PANEL_RULES} />
      </Section>

      <Section title="Take it with you" eyebrow="// ./downloads">
        <div className="flex flex-col gap-3 print:hidden">
          <a
            href="/judges/impact-lab-02-judges-guide.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex ${TAP} items-center justify-center rounded-lg border border-green-primary/40 bg-green-primary/10 px-4 py-3 text-center font-mono text-sm uppercase tracking-wider text-green-primary hover:bg-green-primary/20`}
          >
            Download the judges&rsquo; guide (PDF)
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className={`${GHOST_BUTTON} px-4 py-3 text-sm`}
          >
            Print this page
          </button>
        </div>
      </Section>
    </div>
  );
}

/** One titled block of the brief. */
function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  /** Path-style marker above the heading, matching the participant guide. */
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title}>
      <p className={`${EYEBROW} mb-2`}>{eyebrow}</p>
      <h2 className="font-mono text-base font-bold text-text-primary break-words">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** A square-bullet list, the same marker the participant track guide uses. */
function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="mt-[0.5rem] h-1.5 w-1.5 shrink-0 bg-green-primary"
          />
          <span className={`${BODY} text-text-primary`}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * One track, collapsed. Native `<details>` rather than React state: three
 * closed cards on a phone is the whole requirement, and the browser already
 * does that accessibly without a re-render.
 */
function TrackCard({ track }: { track: Track }) {
  const rules = track.rules ?? [];
  // `description` is the one-liner every legacy track has; it stands in until
  // an organiser writes the longer `problem`.
  const problem = track.problem?.trim() || track.description?.trim() || "";

  return (
    <details className={`group ${CARD}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-start gap-3 p-4 marker:content-none sm:p-5">
        <ChevronDown
          aria-hidden="true"
          className="mt-1 h-4 w-4 shrink-0 text-text-dim transition-transform group-open:rotate-180"
        />
        <span className="min-w-0">
          <span className="block font-mono text-base font-bold text-text-primary break-words">
            {track.label}
          </span>
          {track.englishName && (
            <span className="mt-0.5 block text-sm text-text-secondary break-words">
              {track.englishName}
            </span>
          )}
        </span>
      </summary>

      <div className="space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
        {track.beneficiary?.trim() && (
          <Block label="Who it helps">
            <p className={BODY}>{track.beneficiary}</p>
          </Block>
        )}

        {problem && (
          <Block label="The problem">
            <p className={BODY}>{problem}</p>
          </Block>
        )}

        {rules.length > 0 && (
          <Block label="Fixed rules">
            <Bullets items={rules} />
          </Block>
        )}

        {track.judgesAsk?.trim() && (
          <Block label="What you ask">
            <p className={`${BODY} border-l-2 border-green-primary/40 pl-3 italic`}>
              {track.judgesAsk}
            </p>
          </Block>
        )}
      </div>
    </details>
  );
}

/** An eyebrow-labelled block inside a track card. */
function Block({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className={`${EYEBROW} mb-1.5`}>{label}</p>
      {children}
    </div>
  );
}
