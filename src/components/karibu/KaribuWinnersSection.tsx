/**
 * "The winners" on the public event page, once a cohort's results are
 * published.
 *
 * The same two rows the participant dashboard shows (the overall podium,
 * then the track winners) as the public square cards, restyled for the
 * Karibu paper theme; each card links to that team's public card page.
 * Under the rows, the organiser commendations. Everything here comes from
 * `buildEventResults`, which is the whole of what the page may read: no
 * ranking, no scores, no attendance.
 *
 * Presentational and static: the snapshot is immutable once published, so
 * it is server-rendered with the page rather than fetched like the judges,
 * and nothing moves.
 */

import Link from "next/link";
import type { EventResults, EventWinnerCard } from "@/lib/impact-lab/event-results";

const HEADING = "font-newsreader text-[24px] font-medium text-ink";

export function KaribuWinnersSection({ results }: { results: EventResults }) {
  const { podium, tracks, commendations, emailedOn } = results;
  if (podium.length === 0 && tracks.length === 0) return null;

  return (
    // `scroll-mt` clears the sticky nav when the band's link lands on #results.
    <section id="results" aria-labelledby="results-heading" className="mt-9 scroll-mt-24">
      <h2 id="results-heading" className={`mb-4 ${HEADING}`}>
        The winners
      </h2>
      <div className="space-y-6">
        <WinnerRow label="Overall" cells={podium} />
        <WinnerRow label="Track winners" cells={tracks} />
      </div>

      {commendations.length > 0 && (
        <ul className="mt-6 space-y-2">
          {commendations.map((c, i) => (
            <li key={`${c.projectName}-${i}`} className="font-inter text-[15px] leading-[1.6] text-ink-soft">
              <span className="font-semibold text-ink">Judges&apos; commendation: {c.projectName}.</span> {c.text}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 font-inter text-[14px] leading-[1.6] text-ink-muted">
        Every team&apos;s card is on their dashboard; results were emailed on {emailedOn}.
      </p>
    </section>
  );
}

/** A row of winner cards: three across, a single column at phone width. */
function WinnerRow({ label, cells }: { label: string; cells: EventWinnerCard[] }) {
  if (cells.length === 0) return null;
  return (
    <div>
      <p className="mb-2.5 font-inter text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cells.map((cell, i) => (
          <li key={`${cell.teamId}-${i}`} className="min-w-0">
            <WinnerCard cell={cell} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** One card with its caption ("Champion · Gleam"); a paper tile when no card image can be derived. */
function WinnerCard({ cell }: { cell: EventWinnerCard }) {
  const face = cell.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- rendered per request by the card route, never through the optimiser's cache
    <img
      src={cell.imageUrl}
      width={1080}
      height={1080}
      loading="lazy"
      alt={`${cell.caption}: ${cell.projectName}`}
      className="block aspect-square w-full rounded-xl border border-sand"
    />
  ) : (
    <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-sand bg-paper-card p-5">
      <span className="text-center font-newsreader text-[22px] text-ink">{cell.projectName}</span>
    </div>
  );

  return (
    <figure className="min-w-0">
      {cell.href ? (
        <Link href={cell.href} className="block rounded-xl">
          {face}
        </Link>
      ) : (
        face
      )}
      <figcaption className="mt-2 truncate font-inter text-[13.5px] text-ink-soft">
        <span className="font-semibold text-ink">{cell.caption}</span> · {cell.projectName}
      </figcaption>
    </figure>
  );
}
