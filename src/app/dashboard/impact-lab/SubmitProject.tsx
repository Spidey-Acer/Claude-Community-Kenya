"use client";

/**
 * Submit-your-project section, shown under a revealed team.
 *
 * One submission per team: whatever a teammate saved is pre-filled, and any
 * member may keep editing until the organisers' deadline passes. The server
 * owns team resolution, so this component never sends a team identifier.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Send, CheckCircle } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import type { SubmissionInput, SubmissionView } from "@/lib/impact-lab/submission-schema";
import type { SubmissionRequirementsView } from "@/lib/impact-lab/submission-requirements";
import type { Track } from "@/lib/impact-lab/tracks";
import { SUBMISSIONS_CLOSED_EVENT } from "./DeadlineCountdown";

type Status = "no_team" | "open" | "closed";

/** The cohort whose scope freezes mid-event — shown as a note under the form. */
const SCOPE_FREEZE_COHORT = "impact-lab-2026-09";

interface GetResponse {
  success: boolean;
  status?: Status;
  teamName?: string;
  eventCohort?: string;
  closeAt?: string | null;
  submission?: SubmissionView;
  requirements?: SubmissionRequirementsView;
  tracks?: Track[];
  error?: string;
}

interface FormState {
  projectName: string;
  pitch: string;
  description: string;
  worksVsMocked: string;
  claudeUsage: string;
  track: string;
  problemTackled: string;
  repoUrl: string;
  demoUrl: string;
  videoUrl: string;
  slidesUrl: string;
  screenshotUrl: string;
}

const EMPTY: FormState = {
  projectName: "",
  pitch: "",
  description: "",
  worksVsMocked: "",
  claudeUsage: "",
  track: "",
  problemTackled: "",
  repoUrl: "",
  demoUrl: "",
  videoUrl: "",
  slidesUrl: "",
  screenshotUrl: "",
};

function fromView(view: SubmissionView): FormState {
  return {
    projectName: view.projectName,
    pitch: view.pitch,
    description: view.description,
    worksVsMocked: view.worksVsMocked,
    claudeUsage: view.claudeUsage,
    track: view.track,
    problemTackled: view.problemTackled,
    repoUrl: view.repoUrl,
    demoUrl: view.demoUrl ?? "",
    videoUrl: view.videoUrl ?? "",
    slidesUrl: view.slidesUrl ?? "",
    screenshotUrl: view.screenshotUrl ?? "",
  };
}

/** "1h 12m left" / "closed" — plain, no ticking clock to go stale on a phone. */
function timeLeft(closeAt: string | null): string | null {
  if (!closeAt) return null;
  const ms = new Date(closeAt).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

const inputClass =
  "w-full bg-bg-card border border-border-default rounded px-3 py-2.5 text-base sm:text-sm font-mono text-text-primary focus:outline-none focus:border-green-primary/50";
const labelClass = "block text-[11px] font-mono text-text-dim mb-1.5";

export function SubmitProject({
  cohort,
  teamTrackKey,
}: {
  cohort?: string;
  /**
   * The track the caller's team is in. Preselects the Track field on a
   * submission nobody has filled in yet — the team's track is the answer
   * in all but the rare case where they built for a different one.
   */
  teamTrackKey?: string | null;
}) {
  const cohortQuery = cohort ? `?cohort=${encodeURIComponent(cohort)}` : "";
  const [status, setStatus] = useState<Status | null>(null);
  const [eventCohort, setEventCohort] = useState<string | null>(null);
  const [closeAt, setCloseAt] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [requirements, setRequirements] = useState<SubmissionRequirementsView | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [lastEditedBy, setLastEditedBy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Separate from `error` (a save failure): a load failure leaves `status`
   *  null forever otherwise, so it needs its own state to escape the
   *  "Loading…" spinner and offer a retry. */
  const [loadError, setLoadError] = useState<string | null>(null);
  /** The save-outcome banner, scrolled into view so a result is never missed. */
  const statusRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(`/api/impact-lab/submission${cohortQuery}`);
      const json: GetResponse = await res.json();
      if (!res.ok || !json.success) {
        setLoadError(json.error ?? "Could not load your submission.");
        return;
      }
      setStatus(json.status ?? "no_team");
      setEventCohort(json.eventCohort ?? null);
      setCloseAt(json.closeAt ?? null);
      setRequirements(json.requirements ?? null);
      setTracks(json.tracks ?? []);
      const nextForm = json.submission ? fromView(json.submission) : { ...EMPTY };
      // Never overwrite a track a teammate already chose — only fill a blank.
      if (!nextForm.track && teamTrackKey) nextForm.track = teamTrackKey;
      setForm(nextForm);
      if (json.submission) {
        setLastEditedBy(json.submission.lastEditedByName);
      }
    } catch {
      setLoadError("Could not load your submission.");
    }
  }, [cohortQuery, teamTrackKey]);

  useEffect(() => {
    void load();
  }, [load]);

  // The countdown card announces the moment the window shuts. Re-reading the
  // submission here flips this form to its read-only view on the spot, so a
  // team still typing at 16:00 sees the door close instead of discovering it
  // on a rejected save.
  useEffect(() => {
    const onClosed = () => void load();
    window.addEventListener(SUBMISSIONS_CLOSED_EVENT, onClosed);
    return () => window.removeEventListener(SUBMISSIONS_CLOSED_EVENT, onClosed);
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/impact-lab/submission${cohortQuery}`, {
        method: "PUT",
        headers: await csrfHeaders(),
        body: JSON.stringify(form),
      });
      const json: {
        success: boolean;
        error?: string;
        code?: string;
        submission?: SubmissionView;
      } = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not save your submission.");
        // The deadline passed while this form was open. Re-fetch so status
        // flips to "closed" and the read-only view matches what the error
        // just said — otherwise Save stays enabled and every retry 403s again.
        if (json.code === "SUBMISSIONS_CLOSED") void load();
        return;
      }
      if (json.submission) setLastEditedBy(json.submission.lastEditedByName);
      setSaved(true);
    } catch {
      setError("Could not save your submission.");
    } finally {
      setSaving(false);
      // Bring the outcome into view. On a phone the submitter is at the bottom
      // of a long form and the banner can render off-screen — a save that
      // silently succeeded reads exactly like one that silently failed.
      requestAnimationFrame(() =>
        statusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
      );
    }
  }

  if (status === null) {
    if (loadError) {
      return (
        <div className="rounded-lg border border-red/30 bg-red/10 p-5">
          <p role="alert" className="flex items-center gap-2 font-mono text-sm text-red">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {loadError}
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 inline-flex items-center gap-1.5 rounded border border-border-default bg-bg-card px-4 py-1.5 text-xs font-mono text-text-secondary transition-colors hover:border-green-primary/40 hover:text-green-primary"
          >
            Try again
          </button>
        </div>
      );
    }
    return (
      <p className="font-mono text-xs text-text-dim">
        <Loader2 className="mr-1.5 inline h-3 w-3 animate-spin" />
        Loading your submission…
      </p>
    );
  }

  if (status === "no_team") return null;

  const remaining = timeLeft(closeAt);
  const readOnly = status === "closed";

  // A further edit invalidates the last "Saved" confirmation — leaving it up
  // while someone keeps typing reads as a promise that the new text is
  // already stored, which it isn't.
  function updateField(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  // The cohort's own label overrides the generic default; the required set
  // decides the asterisk and the `required` attribute. Both come from the
  // same GET response the form already loaded, so there is no separate
  // per-cohort table to keep in sync client-side.
  const isRequired = (key: keyof FormState) =>
    requirements?.required.includes(key as keyof SubmissionInput) ?? false;
  const labelFor = (key: keyof FormState, fallback: string) =>
    requirements?.labels[key as keyof SubmissionInput] ?? fallback;

  const field = (
    key: keyof FormState,
    defaultLabel: string,
    helper: string,
    multiline = false
  ) => {
    const required = isRequired(key);
    const label = labelFor(key, defaultLabel);
    return (
      <div>
        <label className={labelClass} htmlFor={`sub-${key}`}>
          {label}
          {required && <span className="text-red"> *</span>}
        </label>
        {multiline ? (
          <textarea
            id={`sub-${key}`}
            rows={3}
            value={form[key]}
            disabled={readOnly}
            required={required}
            onChange={(e) => updateField(key, e.target.value)}
            className={inputClass}
          />
        ) : (
          <input
            id={`sub-${key}`}
            type="text"
            value={form[key]}
            disabled={readOnly}
            required={required}
            onChange={(e) => updateField(key, e.target.value)}
            className={inputClass}
          />
        )}
        <p className="mt-1 font-mono text-[11px] text-text-dim">{helper}</p>
      </div>
    );
  };

  /** The track field renders as a select when the cohort declares tracks;
   *  the stored value is always the track key, never its display label. */
  const trackField = () => {
    const required = isRequired("track");
    const label = labelFor("track", "Track");
    return (
      <div>
        <label className={labelClass} htmlFor="sub-track">
          {label}
          {required && <span className="text-red"> *</span>}
        </label>
        <select
          id="sub-track"
          value={form.track}
          disabled={readOnly}
          required={required}
          onChange={(e) => updateField("track", e.target.value)}
          className={inputClass}
        >
          <option value="">Select a track…</option>
          {tracks.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <p className="mt-1 font-mono text-[11px] text-text-dim">
          The track whose problem you built for.
        </p>
      </div>
    );
  };

  return (
    <section aria-label="Submit your project" className="mt-10">
      <h3 className="mb-3 font-mono text-xs uppercase tracking-wider text-text-dim">
        {"// ./submit-your-project"}
      </h3>

      <div className="rounded-lg border border-border-default bg-bg-secondary p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p className="font-mono text-sm text-text-secondary">
            {readOnly
              ? "Submissions are closed."
              : "One entry per team — any teammate can update it."}
          </p>
          {remaining && !readOnly && (
            <span className="rounded border border-amber/30 bg-amber/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber">
              {remaining}
            </span>
          )}
        </div>

        {lastEditedBy && (
          <p className="mb-4 font-mono text-[11px] text-text-dim">
            Last saved by {lastEditedBy}
          </p>
        )}

        {eventCohort === SCOPE_FREEZE_COHORT && (
          <p className="mb-4 rounded border border-amber/30 bg-amber/10 px-3 py-2 font-mono text-[11px] text-amber">
            Scope freeze 3:30. Save early, edit until then.
          </p>
        )}

        <form onSubmit={save} className="space-y-4">
          {field(
            "slidesUrl",
            "Pitch deck link",
            "Google Slides, Canva, Drive, PDF — any link judges can open."
          )}

          <p className="pt-2 font-mono text-xs text-text-dim">
            Fields marked * are required for this event. Fill in the rest
            where it helps a judge.
          </p>

          {field("projectName", "Project name", "What are you calling it?")}
          {field("pitch", "One-line pitch", "One sentence a judge can repeat.")}
          {requirements?.trackSelect
            ? trackField()
            : field("track", "Track", "The track whose problem you built for.")}
          {field("problemTackled", "Problem tackled", "The specific problem, in your words.")}
          {field("description", "What it does", "What a judge sees when they open it.", true)}
          {field(
            "worksVsMocked",
            "What works vs what's mocked",
            "Be honest — a thin real slice beats a wide fake one.",
            true
          )}
          {field(
            "claudeUsage",
            "How you used AI",
            "Which AI tools you used — Claude, ChatGPT, Gemini, Copilot, or other — and what they actually did for you. No AI? Say so.",
            true
          )}
          {field("repoUrl", "Repo link", "github.com/you/project — https:// optional.")}
          {field("demoUrl", "Demo link", "A live URL judges can click.")}
          {field("videoUrl", "Video link", "A walkthrough, in case the live demo dies.")}
          {field("screenshotUrl", "Screenshot link", "Optional image link.")}

          {/* The outcome has to be impossible to miss. This sat as one line of
              small text at the foot of a long form, which on a phone is below
              the fold after filling it in — teams could not tell whether they
              had submitted or not. */}
          <div ref={statusRef} tabIndex={-1} className="scroll-mt-24">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-red/40 bg-red/10 p-4"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red" />
                <div>
                  <p className="font-mono text-sm font-semibold text-red">
                    Not submitted
                  </p>
                  <p className="mt-1 font-mono text-xs text-red/90">{error}</p>
                </div>
              </div>
            )}

            {saved && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-lg border border-green-primary/40 bg-green-primary/10 p-4"
              >
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-primary" />
                <div>
                  <p className="font-mono text-sm font-semibold text-green-primary">
                    Submitted
                  </p>
                  <p className="mt-1 font-mono text-xs text-green-primary/90">
                    Saved — your teammates and the judges can see this. You can
                    keep editing until submissions close.
                  </p>
                </div>
              </div>
            )}
          </div>

          {!readOnly && (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded border border-green-primary/30 bg-green-primary/10 px-4 py-2 font-mono text-xs font-semibold text-green-primary transition-colors hover:bg-green-primary/20 disabled:opacity-40 sm:w-auto"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Save submission
            </button>
          )}
        </form>
      </div>
    </section>
  );
}
