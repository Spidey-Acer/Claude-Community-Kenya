"use client";

/**
 * ContributionForm — public "contribute a problem statement" form on a
 * Conversations event page.
 *
 * Same submission contract as KaribuDemoRequestForm: CSRF token fetched on
 * mount, POST with x-csrf-token header, useTransition, per-field errors from
 * json.details, success swaps the form for an inline confirmation panel (no
 * toasts, no optimistic public display — the contribution only appears once
 * a moderator approves it). Posts to POST /api/events/[slug]/contributions.
 */

import { useEffect, useState, useTransition } from "react";
import { Send, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { KaribuSelect } from "@/components/karibu/KaribuSelect";
import { KENYA_COUNTIES, MAX_CONTRIBUTION_LENGTH, MAX_NAME_LENGTH } from "@/lib/events/participation";
import type { ConversationsTableQuestion } from "@/lib/conversations/queries";

const COUNTY_OPTIONS = KENYA_COUNTIES.map((c) => ({ value: c, label: c }));

const inputCls = (hasError?: string) =>
  `w-full rounded-lg border ${
    hasError ? "border-error/60" : "border-sand-2"
  } bg-paper px-3 py-2.5 font-inter text-sm text-ink placeholder:text-ink-muted/70 transition-colors focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20`;

interface ContributionFormProps {
  eventSlug: string;
  tableQuestions: ConversationsTableQuestion[];
  /** Preselect a column, e.g. when the form is opened from a specific column's "Add yours" link. */
  defaultQuestionKey?: string;
}

export function ContributionForm({ eventSlug, tableQuestions, defaultQuestionKey }: ContributionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [csrfToken, setCsrfToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [questionKey, setQuestionKey] = useState(defaultQuestionKey ?? tableQuestions[0]?.key ?? "");
  const [county, setCounty] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {});
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const form = new FormData(e.currentTarget);
    const data = {
      questionKey,
      body,
      submitterName: form.get("submitterName") as string,
      county,
      website: (form.get("website") as string) || "",
    };

    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventSlug}/contributions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          if (json.details) setFieldErrors(json.details as Record<string, string>);
          setError(json.error || "Submission failed. Please try again.");
          return;
        }
        setSubmitted(true);
      } catch {
        setError("Network error. Please check your connection and try again.");
      }
    });
  }

  if (tableQuestions.length === 0) return null;

  if (submitted) {
    return (
      <div className="rounded-2xl border border-sand bg-paper-card py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-clay/10 text-clay">
          <CheckCircle className="h-7 w-7" />
        </div>
        <h3 className="mb-2 font-newsreader text-[22px] text-ink">
          Asante &mdash; your contribution is in review
        </h3>
        <p className="mx-auto max-w-md px-4 font-inter text-sm text-ink-soft">
          The strongest remote contributions get read aloud at the venue. If
          yours is picked, it&apos;ll show right here on this page.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-sand bg-paper-card p-6">
        <div className="mb-4">
          <label className="mb-1.5 block font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Which question are you answering? *
          </label>
          <div className="grid gap-2">
            {tableQuestions.map((q) => (
              <label
                key={q.key}
                className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-sand-2 p-3 transition-colors hover:border-clay/50 has-[:checked]:border-clay has-[:checked]:bg-clay/5"
              >
                <input
                  type="radio"
                  name="questionKey"
                  value={q.key}
                  checked={questionKey === q.key}
                  onChange={() => setQuestionKey(q.key)}
                  required
                  className="mt-0.5 accent-[var(--clay)]"
                />
                <span className="font-inter text-xs text-ink-soft">
                  <span className="block font-semibold text-ink">{q.label}</span>
                  {q.description}
                </span>
              </label>
            ))}
          </div>
          {fieldErrors.questionKey && <FieldError msg={fieldErrors.questionKey} />}
        </div>

        <div className="mb-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <label
              htmlFor="contribution-body"
              className="font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
            >
              Your problem statement *
            </label>
            <span className="font-inter text-[11px] text-ink-muted">
              {body.length}/{MAX_CONTRIBUTION_LENGTH}
            </span>
          </div>
          <textarea
            id="contribution-body"
            name="body"
            required
            rows={4}
            maxLength={MAX_CONTRIBUTION_LENGTH}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${inputCls(fieldErrors.body)} resize-none`}
            placeholder="What problem, whose, and how you'd know it's solved..."
          />
          {fieldErrors.body && <FieldError msg={fieldErrors.body} />}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Your name *
            </label>
            <input
              name="submitterName"
              type="text"
              required
              maxLength={MAX_NAME_LENGTH}
              className={inputCls(fieldErrors.submitterName)}
              placeholder="Your full name"
            />
            {fieldErrors.submitterName && <FieldError msg={fieldErrors.submitterName} />}
          </div>
          <KaribuSelect
            id="contribution-county"
            label="County *"
            value={county}
            onChange={setCounty}
            options={COUNTY_OPTIONS}
            placeholder="Select your county"
            error={fieldErrors.county}
          />
        </div>

        {/* Honeypot — real visitors never see this field. */}
        <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="contribution-website">Leave this field empty</label>
          <input id="contribution-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg border border-error/30 bg-error/10 p-4 font-inter text-sm text-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !csrfToken || !county}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Submit contribution
          </>
        )}
      </button>
    </form>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 font-inter text-[11px] text-error">{msg}</p>;
}
