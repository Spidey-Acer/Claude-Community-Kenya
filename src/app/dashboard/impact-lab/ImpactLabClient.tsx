"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Laptop,
  Pencil,
  SearchX,
  Sparkles,
  Users,
} from "lucide-react";
import type {
  MemberProfile,
  MemberTeamStatus,
  TeamRevealView,
} from "@/lib/impact-lab/member";
import { SOCIAL_LINKS } from "@/lib/constants";
import { MatchProfileForm, type MatchProfileTrack } from "./MatchProfileForm";
import { TeamReveal } from "./TeamReveal";
import { ResultsView, type ResultsViewProps } from "./ResultsView";
import { ConversationsReportCard } from "./ConversationsReportCard";
import type { ConversationsReportView } from "@/lib/conversations/queries";

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

interface ResultsResponse {
  success?: boolean;
  published?: boolean;
  results?: ResultsViewProps["results"];
  yourTeam?: ResultsViewProps["yourTeam"];
  rubric?: ResultsViewProps["rubric"];
  error?: string;
}

type Phase =
  | "loading"
  | "error"
  | "not-registered"
  | "profile"
  | "unassigned"
  | "revealed"
  | "results";

interface InviteEvent {
  cohort: string;
  name: string;
}

/**
 * Client state machine for /dashboard/impact-lab. The server page has already
 * enforced session + verified email; this component derives one of the four
 * spec states from GET /api/impact-lab/profile and GET /api/impact-lab/team:
 * not-registered, profile form, waiting (profile saved, teams pending), reveal.
 */
export function ImpactLabClient({
  sessionEmail,
  cohortActive,
  cohortLabel,
  cohort,
  tracks,
  inviteEvent,
  conversationsReport,
}: {
  sessionEmail: string;
  cohortActive: boolean;
  /** Name of the event now running, so registration copy can say which one. */
  cohortLabel: string;
  /**
   * The event these API calls read — appended as `?cohort=` on every fetch.
   * Undefined when the caller has no resolvable event (nothing to scope to).
   */
  cohort?: string;
  /** The active event's declared tracks, passed straight to MatchProfileForm. */
  tracks?: MatchProfileTrack[];
  /**
   * A different event, currently open for registration, that the caller is
   * not yet a member of — set only when the caller already has an event of
   * their own (`cohort` above may be an old, closed one). Additive: renders
   * as a banner above whatever `cohort`'s own state is showing, never in
   * place of it. Null when there's nothing more to invite the caller into.
   */
  inviteEvent?: InviteEvent | null;
  /** The Claude Conversations report for this cohort's linked event, if any. */
  conversationsReport?: ConversationsReportView | null;
}) {
  const router = useRouter();
  const cohortQuery = cohort ? `?cohort=${encodeURIComponent(cohort)}` : "";
  const [phase, setPhase] = useState<Phase>("loading");
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [team, setTeam] = useState<TeamRevealView | null>(null);
  const [results, setResults] = useState<ResultsViewProps | null>(null);
  const [editing, setEditing] = useState(false);
  // An object payload distinguishes registering into `inviteEvent` (from the
  // additive banner, which can appear over any phase) from `true` — the
  // not-registered card's own flow, registering into `cohort` itself. Holding
  // the target cohort in state (captured at click time) rather than a literal
  // tag keeps the two paths mutually exclusive by construction in `onSaved`
  // below — there's no way to reach the invite's navigation branch without an
  // actual cohort to navigate to.
  const [registering, setRegistering] = useState<boolean | { cohort: string }>(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/impact-lab/profile${cohortQuery}`),
      fetch(`/api/impact-lab/team${cohortQuery}`),
      // Caught here, not left to reject Promise.all: the results endpoint is
      // rate-limited per client IP (100/60s), and hackathon venues put dozens
      // of participants behind one NAT address. A burst right after the
      // results email goes out can 429 this single fetch — that must not
      // black out profile/team, which have nothing to do with results.
      fetch(`/api/impact-lab/results${cohortQuery}`).catch(() => null),
    ])
      .then(async ([profileRes, teamRes, resultsRes]) => {
        const profileJson: ProfileResponse = await profileRes.json();
        const teamJson: TeamResponse = await teamRes.json();
        // Soft-fail only: a missing/non-ok/malformed results response
        // degrades to "not published yet" instead of failing the page.
        // Profile and team below keep their existing all-or-nothing checks.
        let resultsJson: ResultsResponse = { success: true, published: false };
        if (resultsRes && resultsRes.ok) {
          try {
            const parsed: ResultsResponse = await resultsRes.json();
            if (parsed.success) resultsJson = parsed;
          } catch {
            // Malformed body — treat as not published, same as a 429.
          }
        }
        if (!active) return;
        if (
          !profileRes.ok ||
          !profileJson.success ||
          !teamRes.ok ||
          !teamJson.success
        ) {
          setPhase("error");
          return;
        }

        // Results published takes precedence over the team reveal — once
        // results are out, the hackathon is over and this is what matters.
        // `rubric` travels on every response the route sends (see its own
        // doc comment), so its absence here means a malformed payload —
        // treated the same as "not published yet" rather than rendering the
        // results view with no criteria to show.
        if (resultsJson.published && resultsJson.results && resultsJson.rubric) {
          setResults({
            results: resultsJson.results,
            yourTeam: resultsJson.yourTeam,
            rubric: resultsJson.rubric,
          });
          setPhase("results");
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
  }, [reloadKey, cohortQuery]);

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

  // Registering takes over the screen regardless of what else is showing —
  // triggered either by the not-registered card's own button (`true`,
  // registering into `cohort`) or by the invite banner below (`{ cohort }`,
  // registering into `inviteEvent`). Self-registration always targets
  // whichever event is open server-side, so the form itself doesn't need to
  // know which one; only what happens after saving differs.
  if (registering) {
    return (
      <MatchProfileForm
        isNew
        cohort={cohort}
        tracks={tracks}
        profile={{
          fullName: "",
          email: sessionEmail,
          phone: null,
          institution: null,
          experienceLevel: "BEGINNER",
          primaryRole: "",
          secondaryRoles: [],
          technicalSkills: [],
          interests: [],
          availability: [],
          projectIdeas: null,
          preferredTeammates: [],
          blockedTeammates: [],
          consentToMatch: false,
          consentToShareContact: false,
        }}
        onSaved={() => {
          if (typeof registering === "object") {
            // Registered into a different event than the one this page is
            // currently showing — navigate to it so the server re-resolves
            // membership (now including the row just created) and the page
            // renders that event's own state, not a stale reload of the old
            // one. router.refresh() forces the server component to re-run
            // rather than serve a cached RSC payload for this URL.
            router.push(`/dashboard/impact-lab?cohort=${encodeURIComponent(registering.cohort)}`);
            router.refresh();
            return;
          }
          setRegistering(false);
          setPhase("loading");
          setReloadKey((k) => k + 1);
        }}
        onCancel={() => setRegistering(false)}
      />
    );
  }

  // Everything past this point is `cohort`'s own state — the invite banner,
  // when present, renders once above it rather than inside every branch.
  const content = (() => {
    if (phase === "results" && results) {
      return (
        <ResultsView
          results={results.results}
          yourTeam={results.yourTeam}
          rubric={results.rubric}
        />
      );
    }

    if (phase === "revealed" && team) {
      return <TeamReveal team={team} cohortActive={cohortActive} cohort={cohort} />;
    }

    // ─── Closed cohort ─────────────────────────────────────────────────────
    // Past this point every branch invites an action — complete your profile,
    // wait for teams, contact an organiser before the event. None of that is
    // true once the cohort closes, so a participant without a team sees the
    // record and everyone else is told plainly that nothing is running.
    if (!cohortActive) {
      return (
        <section
          className="rounded-lg border border-border-default bg-bg-secondary p-6"
          aria-label="Impact Lab archive"
        >
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border-default bg-bg-card">
              <Clock className="h-5 w-5 text-text-dim" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-mono text-base font-bold text-text-primary">
                Impact Lab has wrapped
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {profile
                  ? "Thanks for taking part. Your matching profile is kept as part of the event record and is no longer editable."
                  : "There's no Impact Lab running right now. When the next one opens, this is where your matching profile and team will appear."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={SOCIAL_LINKS.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded border border-green-primary/40 bg-green-primary/10 px-4 py-1.5 font-mono text-xs font-semibold text-green-primary transition-colors hover:bg-green-primary/20"
                >
                  Hear about the next one
                </a>
              </div>
            </div>
          </div>
        </section>
      );
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
                No registration found for {cohortLabel}
              </h2>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                We couldn&apos;t find a registration under{" "}
                <span className="font-mono text-text-primary">{sessionEmail}</span>{" "}
                for <span className="text-text-primary">{cohortLabel}</span>. If
                you are attending that event, register here using the same email
                you gave the organisers — that address is what links this account
                to your team. Your team leader then adds you to the team.
              </p>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                Not attending? Nothing to do — this card only concerns the event
                currently running.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => setRegistering(true)}
                  className="inline-flex items-center gap-1.5 rounded border border-green-primary/40 bg-green-primary/10 px-4 py-1.5 text-xs font-mono font-semibold text-green-primary hover:bg-green-primary/20 transition-colors"
                >
                  Register now
                </button>
                <a
                  href={SOCIAL_LINKS.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded border border-border-default bg-bg-card px-4 py-1.5 text-xs font-mono text-text-secondary hover:border-green-primary/40 hover:text-green-primary transition-colors"
                >
                  Discord
                </a>
                <a
                  href={SOCIAL_LINKS.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded border border-border-default bg-bg-card px-4 py-1.5 text-xs font-mono text-text-secondary hover:border-green-primary/40 hover:text-green-primary transition-colors"
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
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-amber/30 bg-amber/10">
                <Users className="h-5 w-5 text-amber" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-mono text-base font-bold text-text-primary">
                  Teams are finalized
                </h2>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                  {profile.consentToMatch
                    ? "You weren't placed on a team this round. That's on us, not you — find an organizer at the venue, or reach out on "
                    : "Your matching profile wasn't completed before the deadline, so the matcher couldn't include you this round. Find an organizer at the venue, or reach out on "}
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
                  and we&apos;ll find you a spot on a team.
                </p>
              </div>
            </div>
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
                  Teams drop Saturday morning, during the event. This page
                  updates itself the moment your team is ready — no need to
                  refresh on the hour.
                </p>
              </div>
            </div>
          </section>

          <section
            aria-label="What happens next"
            className="rounded-lg border border-border-default bg-bg-secondary p-5"
          >
            <h3 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-dim">
              <Sparkles className="h-3.5 w-3.5 text-amber" />
              {"// ./whats-next"}
            </h3>
            <ol className="space-y-2.5 text-sm text-text-secondary">
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 font-mono text-xs text-green-primary">1.</span>
                <span>
                  Organizers run the matcher against everyone&apos;s profile —
                  roles, skills, and interests get grouped into balanced teams.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 font-mono text-xs text-green-primary">2.</span>
                <span>
                  Teams are finalized and revealed here on 25–26 July, during
                  AI Mashinani itself — not before.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="mt-0.5 font-mono text-xs text-green-primary">3.</span>
                <span>
                  This page flips straight to your team, teammates, and
                  suggested project direction. No separate announcement to
                  chase.
                </span>
              </li>
            </ol>
          </section>

          <section
            aria-label="What to bring"
            className="rounded-lg border border-border-default bg-bg-secondary p-5"
          >
            <h3 className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-dim">
              <Laptop className="h-3.5 w-3.5 text-cyan" />
              {"// ./bring-checklist"}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {[
                "Laptop + charger",
                "The AI tools you plan to use, signed in and ready",
                "Whatever you need to demo — repo, data, hardware, deck",
                "A decision on who presents",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-text-secondary"
                >
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-primary" />
                  {item}
                </li>
              ))}
            </ul>
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
            <p className="mt-3 text-[11px] font-mono text-text-dim">
              Changed your mind about a skill or track? You can edit up until
              teams are matched.
            </p>
          </section>
        </div>
      );
    }

    return (
      <MatchProfileForm
        profile={profile}
        cohort={cohort}
        tracks={tracks}
        onSaved={(saved) => {
          setProfile(saved);
          setEditing(false);
        }}
        onCancel={profileComplete ? () => setEditing(false) : undefined}
      />
    );
  })();

  return (
    <>
      {inviteEvent && (
        <section
          className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-primary/30 bg-green-primary/5 p-4"
          aria-label="New event open for registration"
        >
          <p className="text-sm text-text-secondary">
            <span className="font-mono font-semibold text-text-primary">
              {inviteEvent.name}
            </span>{" "}
            is open for registration.
          </p>
          <button
            type="button"
            onClick={() => setRegistering({ cohort: inviteEvent.cohort })}
            className="inline-flex items-center gap-1.5 rounded border border-green-primary/40 bg-green-primary/10 px-3 py-1.5 text-xs font-mono font-semibold text-green-primary transition-colors hover:bg-green-primary/20"
          >
            Register now
          </button>
        </section>
      )}
      {conversationsReport && <ConversationsReportCard report={conversationsReport} />}
      {content}
    </>
  );
}
