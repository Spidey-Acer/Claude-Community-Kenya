/**
 * "Meet the judges" for the participant dashboard.
 *
 * Who is judging is the question every team asks in the last hour, and the
 * answer used to live in a WhatsApp message and the organiser's head. Putting
 * it under the team card means a team can read a judge's background before
 * they pitch to them, which is the whole point: a build aimed at the person in
 * front of you beats a build aimed at nobody.
 *
 * Renders nothing when the panel has not been published — an empty heading
 * over an empty list would read as "no judges", which is not what it means.
 */

import { JUDGE_KIND_LABEL, judgeInitials, type Judge } from "@/lib/impact-lab/roster";

/** Body copy: slightly larger on phones, which is where this is read. */
const BODY = "text-[15px] sm:text-sm leading-relaxed text-text-secondary";

export function JudgesPanel({ judges }: { judges: Judge[] }) {
  if (judges.length === 0) return null;

  return (
    <section
      className="rounded-lg border border-border-default bg-bg-secondary p-4 sm:p-5"
      aria-label="Meet the judges"
    >
      <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim mb-2">
        {"// ./judges"}
      </p>
      <h2 className="font-mono text-base font-bold text-text-primary">
        Meet the judges
      </h2>

      <ul className="mt-4 space-y-4">
        {judges.map((judge) => (
          <li
            key={judge.id}
            className="rounded-lg border border-border-default bg-bg-primary p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <Avatar judge={judge} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-bold text-text-primary break-words">
                  {judge.name}
                </p>
                <p className="mt-0.5 font-mono text-xs text-text-dim break-words">
                  {judge.title}
                </p>
                {judge.organisation && (
                  <p className="mt-0.5 font-mono text-xs text-text-dim break-words">
                    {judge.organisation}
                  </p>
                )}
                <span className="mt-2 inline-block rounded-full border border-green-primary/30 bg-green-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-green-primary">
                  {JUDGE_KIND_LABEL[judge.kind]}
                </span>
              </div>
            </div>
            {judge.bio && <p className={`${BODY} mt-3 break-words`}>{judge.bio}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * A 48px circle: the judge's headshot when they supplied one, their initials
 * otherwise. A plain `<img>` rather than `next/image` because a headshot URL
 * is typed in by an organiser and can point at any host — `next/image` refuses
 * a src whose hostname is not in `next.config.ts`, which would blank the
 * avatar at the worst possible moment.
 */
function Avatar({ judge }: { judge: Judge }) {
  if (judge.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- organiser-supplied URL on an arbitrary host; next/image would reject it
      <img
        src={judge.photoUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full border border-border-default object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-green-primary/30 bg-green-primary/10 font-mono text-sm font-bold text-green-primary"
    >
      {judgeInitials(judge.name)}
    </span>
  );
}
