"use client";

import { Lightbulb, Mail, Users } from "lucide-react";
import type { TeamRevealView } from "@/lib/impact-lab/member";

/**
 * The finalized team, as qualities rather than numbers — the API already
 * strips scores; this view shows teammates, roles, strengths, and direction.
 */
export function TeamReveal({ team }: { team: TeamRevealView }) {
  return (
    <div className="space-y-6">
      <section
        className="rounded-lg border border-green-primary/30 bg-bg-secondary p-6"
        aria-label="Your team"
      >
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-green-primary/30 bg-green-primary/10">
            <Users className="h-6 w-6 text-green-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wider text-green-primary mb-1">
              {"// ./your-team"}
            </p>
            <h2 className="font-mono text-2xl font-bold text-text-primary">
              {team.teamName}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {team.members.length} members &middot; see you at the hackathon.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Teammates">
        <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-text-dim">
          {"// ./teammates"}
        </h3>
        <ul className="space-y-3">
          {team.members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center gap-3 rounded border border-border-default bg-bg-secondary px-4 py-3"
            >
              <span className="font-mono text-sm text-text-primary">
                {member.fullName}
              </span>
              {member.isSelf && (
                <span className="rounded border border-green-primary/30 bg-green-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-green-primary">
                  you
                </span>
              )}
              {member.primaryRole && (
                <span className="rounded border border-border-default bg-bg-card px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-dim">
                  {member.primaryRole}
                </span>
              )}
              {member.suggestedInternalRole && (
                <span className="rounded border border-cyan/30 bg-cyan/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cyan">
                  {member.suggestedInternalRole}
                </span>
              )}
              <span className="ml-auto">
                {member.email ? (
                  <a
                    href={`mailto:${member.email}`}
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] text-text-secondary hover:text-green-primary transition-colors"
                  >
                    <Mail className="h-3 w-3" />
                    {member.email}
                  </a>
                ) : !member.isSelf ? (
                  <span className="font-mono text-[11px] text-text-dim">
                    contact private
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 font-mono text-[10px] text-text-dim">
          Emails appear only for teammates who chose to share their contact.
        </p>
      </section>

      {team.strengths.length > 0 && (
        <section aria-label="Team strengths">
          <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-text-dim">
            {"// ./strengths"}
          </h3>
          <ul className="space-y-2 rounded-lg border border-border-default bg-bg-secondary p-5">
            {team.strengths.map((strength) => (
              <li
                key={strength}
                className="flex items-start gap-2 text-sm text-text-secondary"
              >
                <span aria-hidden="true" className="font-mono text-green-primary">
                  +
                </span>
                {strength}
              </li>
            ))}
          </ul>
        </section>
      )}

      {team.projectDirection && (
        <section aria-label="Suggested project direction">
          <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-text-dim">
            {"// ./suggested-direction"}
          </h3>
          <div className="flex items-start gap-3 rounded-lg border border-amber/30 bg-amber/5 p-5">
            <Lightbulb className="h-5 w-5 shrink-0 text-amber" />
            <p className="text-sm text-text-secondary leading-relaxed">
              {team.projectDirection}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
