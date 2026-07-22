"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Clock, Pencil, SearchX } from "lucide-react";
import type {
  MemberProfile,
  MemberTeamStatus,
  TeamRevealView,
} from "@/lib/impact-lab/member";
import { SOCIAL_LINKS } from "@/lib/constants";
import { MatchProfileForm } from "./MatchProfileForm";
import { TeamReveal } from "./TeamReveal";

interface ProfileResponse {
  success?: boolean;
  registered?: boolean;
  profile?: MemberProfile;
  error?: string;
}

interface TeamResponse {
  success?: boolean;
  status?: MemberTeamStatus;
  team?: TeamRevealView;
  error?: string;
}

type Phase =
  | "loading"
  | "error"
  | "not-registered"
  | "profile"
  | "unassigned"
  | "revealed";

/**
 * Client state machine for /dashboard/impact-lab. The server page has already
 * enforced session + verified email; this component derives one of the four
 * spec states from GET /api/impact-lab/profile and GET /api/impact-lab/team:
 * not-registered, profile form, waiting (profile saved, teams pending), reveal.
 */
export function ImpactLabClient({ sessionEmail }: { sessionEmail: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [team, setTeam] = useState<TeamRevealView | null>(null);
  const [editing, setEditing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/impact-lab/profile"), fetch("/api/impact-lab/team")])
      .then(async ([profileRes, teamRes]) => {
        const profileJson: ProfileResponse = await profileRes.json();
        const teamJson: TeamResponse = await teamRes.json();
        if (!active) return;
        if (!profileRes.ok || !profileJson.success || !teamRes.ok || !teamJson.success) {
          setPhase("error");
          return;
        }

        if (teamJson.status === "revealed" && teamJson.team) {
          setTeam(teamJson.team);
          setPhase("revealed");
          return;
        }
        if (!profileJson.registered || !profileJson.profile) {
          setPhase("not-registered");
          return;
        }
        setProfile(profileJson.profile);
        setPhase(teamJson.status === "unassigned" ? "unassigned" : "profile");
      })
      .catch(() => {
        if (active) setPhase("error");
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (phase === "loading") {
    return (
      <p
        className="font-mono text-sm text-text-dim"
        role="status"
        aria-live="polite"
      >
        $ loading impact-lab<span className="animate-pulse">_</span>
      </p>
    );
  }

  if (phase === "error") {
    return (
      <div className="rounded-lg border border-red/30 bg-red/10 p-5">
        <p className="flex items-center gap-2 font-mono text-sm text-red">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Couldn&apos;t load your Impact Lab status.
        </p>
        <button
          onClick={() => {
            setPhase("loading");
            setReloadKey((k) => k + 1);
          }}
          className="mt-3 inline-flex items-center gap-1.5 rounded border border-border-default bg-bg-card px-4 py-1.5 text-xs font-mono text-text-secondary hover:border-green-primary/40 hover:text-green-primary transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  if (phase === "revealed" && team) {
    return <TeamReveal team={team} />;
  }

  if (phase === "not-registered") {
    return (
      <section
        className="rounded-lg border border-amber/30 bg-bg-secondary p-6"
        aria-label="Registration not found"
      >
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-amber/30 bg-amber/10">
            <SearchX className="h-5 w-5 text-amber" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-mono text-base font-bold text-text-primary">
              No hackathon registration found
            </h2>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              We couldn&apos;t find an Impact Lab registration under{" "}
              <span className="font-mono text-text-primary">{sessionEmail}</span>.
              Make sure this account uses the same email you registered with on
              Luma. Registered with a different address, or just signed up on
              site? Message the organizers and we&apos;ll sort it out.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={SOCIAL_LINKS.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded border border-green-primary/40 bg-green-primary/10 px-4 py-1.5 text-xs font-mono font-semibold text-green-primary hover:bg-green-primary/20 transition-colors"
              >
                Discord
              </a>
              <a
                href={SOCIAL_LINKS.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded border border-green-primary/40 bg-green-primary/10 px-4 py-1.5 text-xs font-mono font-semibold text-green-primary hover:bg-green-primary/20 transition-colors"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!profile) return null;

  if (phase === "unassigned") {
    return (
      <div className="space-y-6">
        <section
          className="rounded-lg border border-amber/30 bg-bg-secondary p-6"
          aria-label="Team status"
        >
          <h2 className="font-mono text-base font-bold text-text-primary">
            Teams are finalized
          </h2>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed">
            {profile.consentToMatch
              ? "You weren't placed on a team this round. Reach out to the organizers on "
              : "Your matching profile wasn't completed before the deadline, so the matcher couldn't include you this round. Reach out to the organizers on "}
            <a
              href={SOCIAL_LINKS.discord}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-primary hover:underline"
            >
              Discord
            </a>{" "}
            or{" "}
            <a
              href={SOCIAL_LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-primary hover:underline"
            >
              WhatsApp
            </a>{" "}
            and we&apos;ll find you a spot.
          </p>
        </section>

        <section
          className="rounded-lg border border-border-default bg-bg-secondary p-5"
          aria-label="Your matching profile"
        >
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim mb-2">
            {"// ./matching-profile"}
          </p>
          <p className="font-mono text-sm text-text-primary">
            {profile.fullName}
          </p>
          <p className="mt-1 font-mono text-xs text-text-dim">
            {profile.primaryRole} &middot;{" "}
            {profile.experienceLevel.toLowerCase()}
          </p>
          {profile.technicalSkills.length > 0 && (
            <p className="mt-1 font-mono text-xs text-text-dim">
              {profile.technicalSkills.join(", ")}
            </p>
          )}
        </section>
      </div>
    );
  }

  // phase === "profile": teams not final yet. A profile counts as complete
  // once the member has opted in to matching (imported rows start at false).
  const profileComplete = profile.consentToMatch;

  if (profileComplete && !editing) {
    return (
      <div className="space-y-6">
        <section
          className="rounded-lg border border-green-primary/20 bg-bg-secondary p-6"
          aria-label="Profile status"
        >
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-green-primary/30 bg-green-primary/10">
              <Clock className="h-5 w-5 text-green-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-mono text-base font-bold text-text-primary">
                Profile saved — you&apos;re in the matching pool
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Teams drop Saturday morning. Check back here.
              </p>
            </div>
          </div>
        </section>

        <section
          className="rounded-lg border border-border-default bg-bg-secondary p-5"
          aria-label="Your matching profile"
        >
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim mb-2">
                {"// ./matching-profile"}
              </p>
              <p className="font-mono text-sm text-text-primary">
                {profile.fullName}
              </p>
              <p className="mt-1 font-mono text-xs text-text-dim">
                {profile.primaryRole} &middot;{" "}
                {profile.experienceLevel.toLowerCase()}
              </p>
              {profile.technicalSkills.length > 0 && (
                <p className="mt-1 font-mono text-xs text-text-dim">
                  {profile.technicalSkills.join(", ")}
                </p>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded border border-border-default bg-bg-card px-3 py-1.5 text-xs font-mono text-text-secondary hover:border-green-primary/40 hover:text-green-primary transition-colors"
            >
              <Pencil className="h-3 w-3" />
              Edit profile
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <MatchProfileForm
      profile={profile}
      onSaved={(saved) => {
        setProfile(saved);
        setEditing(false);
      }}
      onCancel={profileComplete ? () => setEditing(false) : undefined}
    />
  );
}
