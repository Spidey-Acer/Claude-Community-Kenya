/**
 * The side rail of the revealed-phase dashboard: everything a team asks an
 * organiser during the build, read off the event record instead of a
 * WhatsApp scroll-back. Tonight's format, what the judges score, the house
 * rules, who the judges are, where and when.
 *
 * Deliberately quieter than the main column. One column, hairline
 * separators, sentence-case headings, 12 to 13px mono body: the team card is
 * the loud thing on this page and the countdown is the loud thing on the
 * rail. Nothing here is hardcoded to an event; a section with no content on
 * the record is simply not rendered.
 */

import type { Judge } from "@/lib/impact-lab/roster";
import { JudgesPanel } from "./JudgesPanel";
import { splitLines, splitRules } from "./night-rail-copy";

/** The event fields the rail reads. All organiser-typed, all free text. */
export interface NightRailEvent {
  formatNote: string;
  groundRules: string | null;
  location: string;
  dates: string;
}

/** The judging rubric reduced to what a participant needs to see. */
export interface NightRailRubric {
  label: string;
  criteria: { key: string; label: string; max: number }[];
  totalOutOf: number;
}

const HEADING = "font-mono text-[13px] font-semibold text-text-primary";
const BODY = "font-mono text-[13px] leading-relaxed text-text-secondary break-words lg:text-xs";

export function NightRail({
  event,
  rubric,
  judges,
}: {
  event: NightRailEvent | null;
  rubric: NightRailRubric | null;
  judges: Judge[];
}) {
  const format = splitLines(event?.formatNote);
  const rules = splitRules(event?.groundRules);
  const where = [event?.location, event?.dates].filter(
    (line): line is string => Boolean(line && line.trim())
  );
  const criteria = rubric?.criteria ?? [];

  if (format.length === 0 && criteria.length === 0 && rules.length === 0 && judges.length === 0 && where.length === 0) {
    return null;
  }

  return (
    <aside aria-label="Tonight at a glance" className="divide-y divide-border-default/60">
      {format.length > 0 && (
        <RailSection id="night-rail-tonight" title="Tonight">
          {format.map((paragraph, i) => (
            <p key={i} className={`${BODY} ${i > 0 ? "mt-2" : ""}`}>
              {paragraph}
            </p>
          ))}
        </RailSection>
      )}

      {criteria.length > 0 && rubric && (
        <RailSection id="night-rail-judged-on" title="Judged on">
          <dl className="space-y-1.5">
            {criteria.map((c) => (
              <div key={c.key} className="flex items-baseline justify-between gap-3">
                <dt className={BODY}>{c.label}</dt>
                <dd className="shrink-0 font-mono text-[13px] tabular-nums text-text-primary lg:text-xs">
                  {c.max}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2.5 border-t border-border-default/60 pt-2 font-mono text-[13px] text-text-dim lg:text-xs">
            Scored out of{" "}
            <span className="tabular-nums text-text-secondary">{rubric.totalOutOf}</span>
          </p>
        </RailSection>
      )}

      {rules.length > 0 && (
        <RailSection id="night-rail-house-rules" title="House rules">
          <ul className="space-y-1.5">
            {rules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span
                  aria-hidden="true"
                  className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-green-primary/70"
                />
                <span className={BODY}>{rule}</span>
              </li>
            ))}
          </ul>
        </RailSection>
      )}

      {judges.length > 0 && (
        <RailSection id="night-rail-judges" title="Judges">
          <JudgesPanel judges={judges} variant="rail" />
        </RailSection>
      )}

      {where.length > 0 && (
        <RailSection id="night-rail-where" title="Where">
          {where.map((line, i) => (
            <p key={i} className={`${BODY} ${i > 0 ? "mt-0.5" : ""}`}>
              {line}
            </p>
          ))}
        </RailSection>
      )}
    </aside>
  );
}

/** One labelled block of the rail. The divider between blocks comes from the parent. */
function RailSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="py-5 first:pt-0 last:pb-0">
      <h2 id={id} className={`${HEADING} mb-2.5`}>
        {title}
      </h2>
      {children}
    </section>
  );
}
