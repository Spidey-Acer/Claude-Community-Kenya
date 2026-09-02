"use client";

/**
 * "Meet the judges" on the public event page.
 *
 * Same content as the participant dashboard's panel, in the Karibu paper
 * theme rather than the dashboard's dark one — the two share the labels and
 * the initials helper, and nothing else worth sharing.
 *
 * Fetched from the client, not server-rendered, because the event page is ISR
 * with a 30-minute window: a judge confirmed an hour before judging would not
 * appear on a statically-rendered page until it happened to revalidate. One
 * fetch on mount, no polling — a venue full of phones sits behind one IP and
 * the read rate limit is per-IP.
 */

import { useEffect, useState } from "react";
import { JUDGE_KIND_LABEL, judgeInitials, type Judge } from "@/lib/impact-lab/roster";

interface JudgesResponse {
  success?: boolean;
  judges?: Judge[];
}

export function KaribuJudgesSection({ cohort }: { cohort: string }) {
  const [judges, setJudges] = useState<Judge[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`/api/impact-lab/judges?cohort=${encodeURIComponent(cohort)}`)
      .then((res) => (res.ok ? (res.json() as Promise<JudgesResponse>) : null))
      .then((json) => {
        if (active && json?.success && Array.isArray(json.judges)) setJudges(json.judges);
      })
      // A panel that fails to load leaves the section absent. This is one
      // optional block on a page whose main job is the event itself, and an
      // error box in its place would be worse than nothing.
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [cohort]);

  if (judges.length === 0) return null;

  return (
    <div className="mt-9">
      <h2 className="mb-4 font-newsreader text-[24px] font-medium text-ink">
        Meet the judges
      </h2>
      <div className="space-y-3">
        {judges.map((judge) => (
          <div key={judge.id} className="rounded-2xl border border-sand bg-paper-card p-5">
            <div className="flex items-start gap-4">
              <Avatar judge={judge} />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-newsreader text-[19px] text-ink">{judge.name}</span>
                  <span className="font-inter text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                    {JUDGE_KIND_LABEL[judge.kind]}
                  </span>
                </div>
                <p className="font-inter text-[14px] text-ink-muted">{judge.title}</p>
                {judge.organisation && (
                  <p className="font-inter text-[14px] text-ink-muted">{judge.organisation}</p>
                )}
                {judge.bio && (
                  <p className="mt-2 font-inter text-[14.5px] leading-[1.55] text-ink-soft">
                    {judge.bio}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A 48px circle: the headshot when one was supplied, initials otherwise. A
 * plain `<img>` rather than `next/image` — an organiser types these URLs in
 * and they can point at any host, which `next/image` would refuse outright.
 */
function Avatar({ judge }: { judge: Judge }) {
  if (judge.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- organiser-supplied URL on an arbitrary host; next/image would reject it
      <img
        src={judge.photoUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full border border-sand object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-sand bg-paper font-inter text-[15px] font-semibold text-ink-muted"
    >
      {judgeInitials(judge.name)}
    </span>
  );
}
