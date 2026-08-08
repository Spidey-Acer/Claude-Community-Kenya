"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Save, X } from "lucide-react";
import type {
  MemberProfile,
  MemberProfileInput,
} from "@/lib/impact-lab/member";

interface MatchProfileFormProps {
  profile: MemberProfile;
  onSaved: (profile: MemberProfile) => void;
  /** Present only when re-editing an already-complete profile. */
  onCancel?: () => void;
  /**
   * True for a member with no participant row yet: POSTs to create instead
   * of PUTting an edit. `profile` is still required in this mode — pass a
   * blank one (see ImpactLabClient) so the form has somewhere to write.
   */
  isNew?: boolean;
}

/** Same multi-value convention as the admin participants form: split on ; or , */
const splitMulti = (v: string): string[] =>
  v.split(/[;,]/).map((s) => s.trim()).filter(Boolean);

const inputClass =
  "w-full bg-bg-card border border-border-default rounded px-3 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:border-green-primary/50";
const labelClass = "block text-[11px] font-mono text-text-dim mb-1.5";

export function MatchProfileForm({ profile, onSaved, onCancel, isNew }: MatchProfileFormProps) {
  const [csrfToken, setCsrfToken] = useState("");
  const [fullName, setFullName] = useState(profile.fullName);
  const [experienceLevel, setExperienceLevel] = useState(profile.experienceLevel);
  const [primaryRole, setPrimaryRole] = useState(profile.primaryRole);
  const [secondaryRoles, setSecondaryRoles] = useState(profile.secondaryRoles.join(", "));
  const [technicalSkills, setTechnicalSkills] = useState(profile.technicalSkills.join(", "));
  const [interests, setInterests] = useState(profile.interests.join(", "));
  const [availability, setAvailability] = useState(profile.availability.join(", "));
  const [projectIdeas, setProjectIdeas] = useState(profile.projectIdeas ?? "");
  const [preferredTeammates, setPreferredTeammates] = useState(profile.preferredTeammates.join(", "));
  const [blockedTeammates, setBlockedTeammates] = useState(profile.blockedTeammates.join(", "));
  const [consentToMatch, setConsentToMatch] = useState(profile.consentToMatch);
  const [consentToShareContact, setConsentToShareContact] = useState(profile.consentToShareContact);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {});
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !primaryRole.trim()) {
      setError("Full name and primary role are required.");
      return;
    }

    const body: MemberProfileInput = {
      fullName: fullName.trim(),
      experienceLevel,
      primaryRole: primaryRole.trim(),
      secondaryRoles: splitMulti(secondaryRoles),
      technicalSkills: splitMulti(technicalSkills),
      interests: splitMulti(interests),
      availability: splitMulti(availability),
      projectIdeas: projectIdeas.trim() || null,
      preferredTeammates: splitMulti(preferredTeammates),
      blockedTeammates: splitMulti(blockedTeammates),
      consentToMatch,
      consentToShareContact,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/impact-lab/profile", {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || "Failed to save your profile.");
          return;
        }
        onSaved(json.profile as MemberProfile);
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSave}
      className="rounded-lg border border-green-primary/30 bg-bg-secondary p-5"
    >
      <p className="font-mono text-[11px] uppercase tracking-wider text-green-primary mb-1">
        {isNew ? "$ ./register" : "$ vim ./matching-profile"}
      </p>
      <p className="mb-1 text-xs text-text-secondary">
        Two minutes. Every field here feeds the matcher that builds your team —
        the more accurate, the better the fit.
      </p>
      <p className="mb-5 text-[11px] font-mono text-text-dim">
        {isNew
          ? "Registering as " + profile.email + ". Once you're in, your team leader adds you to the team — no separate step."
          : "We pre-filled what you told us on Luma. Check it over and fix anything that's changed."}
      </p>

      <SectionHeading eyebrow="01" title="About you" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="il-fullName" className={labelClass}>
            Full name
          </label>
          <input
            id="il-fullName"
            type="text"
            required
            maxLength={120}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="il-experienceLevel" className={labelClass}>
            Experience level
          </label>
          <select
            id="il-experienceLevel"
            value={experienceLevel}
            onChange={(e) =>
              setExperienceLevel(e.target.value as MemberProfile["experienceLevel"])
            }
            className={inputClass}
          >
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="il-availability" className={labelClass}>
            Availability (comma-separated)
          </label>
          <input
            id="il-availability"
            type="text"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            className={inputClass}
            placeholder="e.g. Saturday all day, Sunday morning"
          />
        </div>
      </div>

      <SectionHeading
        eyebrow="02"
        title="Your skills & track"
        helper="This is the core matching signal — role, skills, and what you want to build decide who you're paired with."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="il-primaryRole" className={labelClass}>
            Primary role
          </label>
          <input
            id="il-primaryRole"
            type="text"
            required
            maxLength={60}
            value={primaryRole}
            onChange={(e) => setPrimaryRole(e.target.value)}
            className={inputClass}
            list="il-role-options"
            placeholder="e.g. Builder"
          />
          <datalist id="il-role-options">
            <option value="Builder" />
            <option value="Designer" />
            <option value="Presenter" />
            <option value="Data" />
            <option value="Product" />
          </datalist>
        </div>
        <div>
          <label htmlFor="il-secondaryRoles" className={labelClass}>
            Secondary roles (comma-separated, optional)
          </label>
          <input
            id="il-secondaryRoles"
            type="text"
            value={secondaryRoles}
            onChange={(e) => setSecondaryRoles(e.target.value)}
            className={inputClass}
            placeholder="e.g. Designer, Presenter"
          />
        </div>
        <div>
          <label htmlFor="il-technicalSkills" className={labelClass}>
            Technical skills (comma-separated)
          </label>
          <input
            id="il-technicalSkills"
            type="text"
            value={technicalSkills}
            onChange={(e) => setTechnicalSkills(e.target.value)}
            className={inputClass}
            placeholder="e.g. TypeScript, Python, Figma"
          />
        </div>
        <div>
          <label htmlFor="il-interests" className={labelClass}>
            Interests (comma-separated)
          </label>
          <input
            id="il-interests"
            type="text"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            className={inputClass}
            placeholder="e.g. agriculture, health, fintech"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="il-projectIdeas" className={labelClass}>
            Project ideas (optional)
          </label>
          <textarea
            id="il-projectIdeas"
            rows={3}
            maxLength={2000}
            value={projectIdeas}
            onChange={(e) => setProjectIdeas(e.target.value)}
            className={inputClass}
            placeholder="Anything you'd love to build this weekend"
          />
        </div>
      </div>

      <SectionHeading
        eyebrow="03"
        title="Teammates"
        helper="Optional. If you already know who you want to build with, tell us — the matcher tries to honor both lists."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="il-preferredTeammates" className={labelClass}>
            Teammates you&apos;d like (their emails, optional)
          </label>
          <input
            id="il-preferredTeammates"
            type="text"
            inputMode="email"
            value={preferredTeammates}
            onChange={(e) => setPreferredTeammates(e.target.value)}
            className={inputClass}
            placeholder="e.g. friend@example.com"
          />
        </div>
        <div>
          <label htmlFor="il-blockedTeammates" className={labelClass}>
            Teammates to avoid (their emails, optional)
          </label>
          <input
            id="il-blockedTeammates"
            type="text"
            inputMode="email"
            value={blockedTeammates}
            onChange={(e) => setBlockedTeammates(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-[10px] font-mono text-text-dim">
            Private — only organizers ever see this.
          </p>
        </div>
      </div>

      <fieldset className="mt-5 space-y-2 rounded border border-border-default bg-bg-card p-4">
        <legend className="px-1 font-mono text-[11px] uppercase tracking-wider text-text-dim">
          Consent
        </legend>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={consentToMatch}
            onChange={(e) => setConsentToMatch(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-green-primary cursor-pointer"
          />
          <span className="text-xs text-text-secondary">
            <span className="font-mono font-semibold text-text-primary">
              Place me on a team.
            </span>{" "}
            Required — we only match participants who opt in.
          </span>
        </label>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={consentToShareContact}
            onChange={(e) => setConsentToShareContact(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-green-primary cursor-pointer"
          />
          <span className="text-xs text-text-secondary">
            <span className="font-mono font-semibold text-text-primary">
              Share my email with my teammates
            </span>{" "}
            once teams are revealed.
          </span>
        </label>
      </fieldset>

      {!isNew && (
        <p className="mt-3 text-[11px] font-mono text-text-dim">
          Registered as {profile.email}
          {profile.institution ? ` · ${profile.institution}` : ""} — contact
          the organizers to change this.
        </p>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded border border-red/30 bg-red/10 p-2 text-[11px] font-mono text-red">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {!consentToMatch && (
        <div className="mt-3 flex items-center gap-2 rounded border border-amber/30 bg-amber/10 p-2 text-[11px] font-mono text-amber">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Tick &quot;Place me on a team&quot; to enter the matching pool.
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={isPending || !csrfToken}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded border border-green-primary/40 bg-green-primary/10 px-4 py-2.5 text-xs font-mono font-semibold text-green-primary transition-colors hover:bg-green-primary/20 disabled:opacity-50 sm:w-auto"
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          {isPending ? (isNew ? "Registering..." : "Saving...") : isNew ? "Register" : "Save profile"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded border border-border-default bg-bg-card px-4 py-2.5 text-xs font-mono text-text-secondary transition-colors hover:border-red/40 hover:text-red disabled:opacity-50"
          >
            <X className="h-3 w-3" />
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

/** Numbered section divider inside the matching-profile form. */
function SectionHeading({
  eyebrow,
  title,
  helper,
}: {
  eyebrow: string;
  title: string;
  helper?: string;
}) {
  return (
    <div className="mt-6 mb-3 border-t border-border-default/60 pt-5">
      <h3 className="flex items-baseline gap-2 font-mono text-xs font-bold uppercase tracking-wider text-text-primary">
        <span className="text-green-primary">{eyebrow}</span>
        {title}
      </h3>
      {helper && (
        <p className="mt-1 text-[11px] text-text-dim leading-relaxed">{helper}</p>
      )}
    </div>
  );
}
