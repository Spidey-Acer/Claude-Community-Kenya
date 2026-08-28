/**
 * SeedDrawer — collapsed "if your table is stuck" examples on a
 * Conversations event page. A native <details> so it works with JS
 * disabled; framed explicitly as examples, never a menu to pick from.
 * Server component.
 */

import type { ConversationsSeedProblem } from "@/lib/conversations/queries";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

export function SeedDrawer({ seedProblems }: { seedProblems: ConversationsSeedProblem[] }) {
  if (seedProblems.length === 0) return null;

  return (
    <section className={`${WRAP} pb-14`} aria-label="Example problem statements">
      <details className="group rounded-2xl border border-sand bg-paper-card p-5">
        <summary className="cursor-pointer list-none font-inter text-[15px] font-semibold text-ink marker:content-none">
          <span className="mr-2 inline-block transition-transform group-open:rotate-90">→</span>
          If your table is stuck &mdash; what a sharp problem sounds like
        </summary>
        <p className="mb-4 mt-3 font-inter text-[13px] text-ink-muted">
          These are examples to prime the conversation, not a menu to choose
          from. The strongest contribution is the one only your table could
          have written.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {seedProblems.map((p, i) => (
            <div key={i} className="rounded-xl border border-sand-2 bg-paper p-4">
              <h4 className="mb-1.5 font-newsreader text-[16px] text-ink">{p.title}</h4>
              <p className="mb-2 font-inter text-[13.5px] leading-[1.5] text-ink-soft">{p.statement}</p>
              {p.buildWedge && (
                <p className="font-inter text-[12px] italic text-ink-muted">{p.buildWedge}</p>
              )}
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
