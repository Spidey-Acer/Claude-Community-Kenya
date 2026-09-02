"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Copy, Lightbulb, Mail, PartyPopper, UserCheck, Users } from "lucide-react";
import type { TeamRevealView } from "@/lib/impact-lab/member";
import { csrfHeaders } from "@/lib/csrf-client";
import { useRouter } from "next/navigation";
import { SubmitProject } from "./SubmitProject";
import { TeamRoster } from "./TeamRoster";
import type { MatchProfileTrack } from "./MatchProfileForm";
import { useOwnTrack } from "./useOwnTrack";

interface TeamResponse {
  success?: boolean;
  team?: TeamRevealView;
}

const TEAMMATE_POLL_INTERVAL_MS = 30_000;

/**
 * The finalized team, as qualities rather than numbers — the API already
 * strips scores; this view shows teammates, roles, strengths, and direction.
 * This is the hero moment of the hackathon dashboard, so it carries a
 * one-time entrance animation (skipped entirely under prefers-reduced-motion).
 */
export function TeamReveal({
  team,
  cohortActive = true,
  cohort,
  tracks = [],
}: {
  team: TeamRevealView;
  cohortActive?: boolean;
  /** The event this team belongs to — appended as `?cohort=` on every fetch. */
  cohort?: string;
  /** The active event's declared tracks — used to label the team's track and
   * detect a mismatch against the caller's own current choice. */
  tracks?: MatchProfileTrack[];
}) {
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();
  const cohortQuery = cohort ? `?cohort=${encodeURIComponent(cohort)}` : "";
  const { trackKey: ownTrackKey } = useOwnTrack(cohort, tracks);
  const teamTrackLabel = tracks.find((t) => t.key === team.trackKey)?.label ?? null;
  const ownTrackLabel = tracks.find((t) => t.key === ownTrackKey)?.label ?? "not chosen";
  const trackMismatch =
    tracks.length > 0 && team.trackKey && ownTrackKey !== (team.trackKey ?? "");

  // Seeded from the team payload (the caller is always one of the members),
  // then flipped locally the moment the check-in call succeeds — no reload
  // needed to show the confirmed state.
  const [checkedIn, setCheckedIn] = useState(
    () => team.members.find((m) => m.isSelf)?.checkedIn ?? false
  );
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Someone is staring at this screen waiting for "has my teammate arrived
  // yet?" to change on its own — a snapshot from page load isn't enough.
  // Polled independently of `checkedIn` above (which stays purely local —
  // it's the source of truth for the user's own check-in and must never be
  // overwritten by a background fetch racing the tap that just set it).
  // Keyed by teammate id, self excluded on purpose.
  const [teammateCheckedIn, setTeammateCheckedIn] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        team.members.filter((m) => !m.isSelf).map((m) => [m.id, m.checkedIn])
      )
  );

  useEffect(() => {
    // Nobody is arriving at a finished event, so polling for teammate
    // check-ins would be a background request every 30s, forever, for a
    // value that can no longer change.
    if (!cohortActive) return;
    const interval = setInterval(() => {
      fetch(`/api/impact-lab/team${cohortQuery}`)
        .then((res) => (res.ok ? (res.json() as Promise<TeamResponse>) : null))
        .then((json) => {
          if (!json?.success || !json.team) return; // keep showing current data, retry next tick
          setTeammateCheckedIn((prev) => {
            const next = { ...prev };
            for (const m of json.team!.members) {
              if (!m.isSelf) next[m.id] = m.checkedIn;
            }
            return next;
          });
        })
        // A failed background refresh must not blank or error out a screen
        // someone is mid-read of — just leave what's on screen and retry
        // on the next tick.
        .catch(() => {});
    }, TEAMMATE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [cohortActive, cohortQuery]);

  async function handleCheckIn() {
    setCheckingIn(true);
    setCheckInError(null);
    try {
      const res = await fetch(`/api/impact-lab/check-in${cohortQuery}`, {
        method: "POST",
        headers: await csrfHeaders(),
      });
      const json: { success?: boolean; error?: string } = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Check-in failed");
      }
      setCheckedIn(true);
    } catch (e) {
      setCheckInError(e instanceof Error ? e.message : "Check-in failed");
    } finally {
      setCheckingIn(false);
    }
  }

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
            <h2 className="flex flex-wrap items-center gap-2 font-mono text-2xl font-bold text-text-primary sm:text-3xl">
              {team.teamName}
              {typeof team.table === "number" && (
                <span className="rounded border border-amber/40 bg-amber/10 px-2.5 py-0.5 font-mono text-base uppercase tracking-wider text-amber">
                  Table {team.table}
                </span>
              )}
              {teamTrackLabel && (
                <span className="rounded border border-cyan/30 bg-cyan/10 px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider text-cyan">
                  {teamTrackLabel}
                </span>
              )}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {team.members.length} members
              {cohortActive
                ? " · see you at the hackathon."
                : " · this is your record from the event."}
            </p>
            {cohortActive && trackMismatch && (
              <p className="mt-2 font-mono text-[11px] text-amber">
                You chose {ownTrackLabel}; your team is in {teamTrackLabel}. Changes
                apply at the next confirmation.
              </p>
            )}
          </div>
          <div className="shrink-0">
            {!cohortActive ? (
              checkedIn ? (
                <span className="inline-flex items-center gap-1.5 rounded border border-border-default bg-bg-card px-3 py-1.5 font-mono text-xs font-semibold text-text-dim">
                  <UserCheck className="h-3.5 w-3.5" />
                  Attended
                </span>
              ) : null
            ) : checkedIn ? (
              <span className="inline-flex items-center gap-1.5 rounded border border-green-primary/40 bg-green-primary/10 px-3 py-1.5 font-mono text-xs font-semibold text-green-primary">
                <UserCheck className="h-3.5 w-3.5" />
                You&apos;re checked in
              </span>
            ) : (
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="inline-flex items-center gap-1.5 rounded border border-green-primary/40 bg-green-primary/10 px-3 py-1.5 font-mono text-xs font-semibold text-green-primary transition-colors hover:bg-green-primary/20 disabled:opacity-50"
              >
                <UserCheck className="h-3.5 w-3.5" />
                {checkingIn ? "Checking in…" : "I'm here — check in"}
              </button>
            )}
          </div>
        </div>
        {checkInError && (
          <p role="alert" className="relative mt-3 font-mono text-xs text-red">
            {checkInError}
          </p>
        )}
      </motion.section>

      <motion.section variants={item} aria-label="Teammates">
        <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-text-dim">
          {"// ./teammates"}
        </h3>
        <ul className="space-y-3">
          {team.members.map((member) => {
            // Self reflects the locally-updated state (no reload needed
            // right after checking in); teammates reflect the polled server
            // view, falling back to the initial payload before the first poll.
            const memberCheckedIn = member.isSelf
              ? checkedIn
              : teammateCheckedIn[member.id] ?? member.checkedIn;
            return (
            <li
              key={member.id}
              className="flex flex-wrap items-center gap-3 rounded border border-border-default bg-bg-secondary px-4 py-3"
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${
                  memberCheckedIn ? "bg-green-primary" : "bg-text-dim/40"
                }`}
              />
              <span className="font-mono text-sm text-text-primary">
                {member.fullName}
              </span>
              {member.isSelf && (
                <span className="rounded border border-green-primary/30 bg-green-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-green-primary">
                  you
                </span>
              )}
              <span
                className={`font-mono text-[10px] uppercase tracking-wider ${
                  memberCheckedIn ? "text-green-primary" : "text-text-dim"
                }`}
              >
                {memberCheckedIn ? "here" : "not yet here"}
              </span>
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
            );
          })}
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

      {/* Roster edits and project submission are event-time actions. After the
          cohort closes the team is a record, not a thing you can still change,
          so both affordances go rather than sitting there failing on submit. */}
      {cohortActive && (
        <>
          <TeamRoster
            members={team.members}
            cohort={cohort}
            onChanged={() => {
              // The roster lives in the server-rendered payload, so a change is
              // only visible after a refetch — reload rather than patch local
              // state, so everyone sees the same roster the server now holds.
              router.refresh();
            }}
          />

          <SubmitProject cohort={cohort} />
        </>
      )}
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
