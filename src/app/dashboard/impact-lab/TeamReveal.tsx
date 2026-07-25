"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Copy, Lightbulb, Mail, PartyPopper, Users } from "lucide-react";
import type { TeamRevealView } from "@/lib/impact-lab/member";
import { SubmitProject } from "./SubmitProject";

/**
 * The finalized team, as qualities rather than numbers — the API already
 * strips scores; this view shows teammates, roles, strengths, and direction.
 * This is the hero moment of the hackathon dashboard, so it carries a
 * one-time entrance animation (skipped entirely under prefers-reduced-motion).
 */
export function TeamReveal({ team }: { team: TeamRevealView }) {
  const prefersReducedMotion = useReducedMotion();

  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: prefersReducedMotion ? 0 : 0.08 },
    },
  };
  const item = prefersReducedMotion
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
      };

  return (
    <motion.div
      className="space-y-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <motion.section
        variants={item}
        className="relative overflow-hidden rounded-lg border border-green-primary/30 bg-bg-secondary p-6"
        aria-label="Your team"
      >
        {!prefersReducedMotion && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-primary/10 via-transparent to-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />
        )}
        <div className="relative flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-green-primary/30 bg-green-primary/10">
            <PartyPopper className="h-6 w-6 text-green-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wider text-green-primary mb-1">
              {"// ./your-team"}
            </p>
            <h2 className="font-mono text-2xl font-bold text-text-primary sm:text-3xl">
              {team.teamName}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {team.members.length} members &middot; see you at the hackathon.
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section variants={item} aria-label="Teammates">
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
                  <EmailAction email={member.email} />
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
      </motion.section>

      {team.summary && (
        <motion.section variants={item} aria-label="Why this team">
          <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-text-dim">
            {"// ./why-this-team"}
          </h3>
          <blockquote className="rounded-lg border border-green-primary/20 bg-green-primary/5 p-5 text-sm leading-relaxed text-text-secondary">
            {team.summary}
          </blockquote>
        </motion.section>
      )}

      {team.strengths.length > 0 && (
        <motion.section variants={item} aria-label="Team strengths">
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
        </motion.section>
      )}

      {team.projectDirection && (
        <motion.section variants={item} aria-label="Suggested project direction">
          <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-text-dim">
            {"// ./suggested-direction"}
          </h3>
          <div className="flex items-start gap-3 rounded-lg border border-amber/30 bg-amber/5 p-5">
            <Lightbulb className="h-5 w-5 shrink-0 text-amber" />
            <p className="text-sm text-text-secondary leading-relaxed">
              {team.projectDirection}
            </p>
          </div>
        </motion.section>
      )}

      <motion.section variants={item} aria-label="First 30 minutes">
        <h3 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-dim">
          <Users className="h-3.5 w-3.5 text-green-primary" />
          {"// ./first-30-minutes"}
        </h3>
        <ol className="space-y-2.5 rounded-lg border border-border-default bg-bg-secondary p-5 text-sm text-text-secondary">
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 font-mono text-xs text-green-primary">1.</span>
            <span>Find your teammates in the room — say hi, sit together.</span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 font-mono text-xs text-green-primary">2.</span>
            <span>
              Agree on your track&apos;s problem — pick one angle from the
              suggested direction above and commit to it.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 font-mono text-xs text-green-primary">3.</span>
            <span>Set up a group chat so you can coordinate for the rest of the build.</span>
          </li>
        </ol>
      </motion.section>

      <SubmitProject />
    </motion.div>
  );
}

/** Mailto link + copy-to-clipboard affordance for a teammate's email. */
function EmailAction({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (permissions, insecure context) —
      // the mailto link next to this button still works either way.
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <a
        href={`mailto:${email}`}
        className="inline-flex items-center gap-1.5 font-mono text-[11px] text-text-secondary hover:text-green-primary transition-colors"
      >
        <Mail className="h-3 w-3" />
        {email}
      </a>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Email copied" : `Copy ${email} to clipboard`}
        className="rounded p-1 text-text-dim transition-colors hover:text-green-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-primary/60"
      >
        {copied ? (
          <Check className="h-3 w-3 text-green-primary" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </span>
  );
}
