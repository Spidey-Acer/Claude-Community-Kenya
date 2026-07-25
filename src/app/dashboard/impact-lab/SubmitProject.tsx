"use client";

/**
 * Submit-your-project section, shown under a revealed team.
 *
 * One submission per team: whatever a teammate saved is pre-filled, and any
 * member may keep editing until the organisers' deadline passes. The server
 * owns team resolution, so this component never sends a team identifier.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Send, CheckCircle } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import type { SubmissionView } from "@/lib/impact-lab/submission-schema";

type Status = "no_team" | "open" | "closed";

interface GetResponse {
  success: boolean;
  status?: Status;
  teamName?: string;
  closeAt?: string | null;
  submission?: SubmissionView;
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
  "w-full bg-bg-card border border-border-default rounded px-3 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:border-green-primary/50";
const labelClass = "block text-[11px] font-mono text-text-dim mb-1.5";

export function SubmitProject() {
  const [status, setStatus] = useState<Status | null>(null);
  const [closeAt, setCloseAt] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [lastEditedBy, setLastEditedBy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/impact-lab/submission");
      const json: GetResponse = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not load your submission.");
        return;
      }
      setStatus(json.status ?? "no_team");
      setCloseAt(json.closeAt ?? null);
      if (json.submission) {
        setForm(fromView(json.submission));
        setLastEditedBy(json.submission.lastEditedByName);
      }
    } catch {
      setError("Could not load your submission.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/impact-lab/submission", {
        method: "PUT",
        headers: await csrfHeaders(),
        body: JSON.stringify(form),
      });
      const json: { success: boolean; error?: string; submission?: SubmissionView } =
        await res.json();
      if (!res.ok || !json.success) {
        setError(json.error ?? "Could not save your submission.");
        return;
      }
      if (json.submission) setLastEditedBy(json.submission.lastEditedByName);
      setSaved(true);
    } catch {
      setError("Could not save your submission.");
    } finally {
      setSaving(false);
    }
  }

  if (status === null) {
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

  const field = (
    key: keyof FormState,
    label: string,
    helper: string,
    multiline = false
  ) => (
    <div>
      <label className={labelClass} htmlFor={`sub-${key}`}>
        {label}
      </label>
      {multiline ? (
        <textarea
          id={`sub-${key}`}
          rows={3}
          value={form[key]}
          disabled={readOnly}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className={inputClass}
        />
      ) : (
        <input
          id={`sub-${key}`}
          type="text"
          value={form[key]}
          disabled={readOnly}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className={inputClass}
        />
      )}
      <p className="mt-1 font-mono text-[10px] text-text-dim">{helper}</p>
    </div>
  );

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

        <form onSubmit={save} className="space-y-4">
          {field("projectName", "Project name *", "What are you calling it?")}
          {field("pitch", "One-line pitch *", "One sentence a judge can repeat.")}
          {field("track", "Track *", "The track whose problem you built for.")}
          {field("problemTackled", "Problem tackled *", "The specific problem, in your words.")}
          {field("description", "What it does *", "What a judge sees when they open it.", true)}
          {field(
            "worksVsMocked",
            "What works vs what's mocked *",
            "Be honest — a thin real slice beats a wide fake one.",
            true
          )}
          {field(
            "claudeUsage",
            "How you used Claude *",
            "Which parts Claude wrote, and how you drove it.",
            true
          )}
          {field("repoUrl", "Repo link *", "github.com/you/project — https:// optional.")}
          {field("demoUrl", "Demo link", "A live URL judges can click.")}
          {field("videoUrl", "Video link", "A walkthrough, in case the live demo dies.")}
          {field("slidesUrl", "Slides link", "Drive or Figma link — no file upload needed.")}
          {field("screenshotUrl", "Screenshot link", "Optional image link.")}

          {error && (
            <p role="alert" className="font-mono text-xs text-red">
              {error}
            </p>
          )}

          {saved && (
            <p role="status" className="font-mono text-xs text-green-primary">
              <CheckCircle className="mr-1.5 inline h-3.5 w-3.5" />
              Saved. Your teammates will see this.
            </p>
          )}

          {!readOnly && (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded border border-green-primary/30 bg-green-primary/10 px-4 py-2 font-mono text-xs font-semibold text-green-primary transition-colors hover:bg-green-primary/20 disabled:opacity-40"
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
