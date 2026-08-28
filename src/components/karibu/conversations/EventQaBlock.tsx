"use client";

/**
 * EventQaBlock — "Ask Anthropic's team" section on an event detail page.
 *
 * Renders only when the event has an open EventQuestionSession (server
 * passes `session` as null otherwise, and the parent skips the section
 * entirely — see KaribuEventDetail). Same submission contract as the
 * Conversations ContributionForm: CSRF token on mount, POST with
 * x-csrf-token, useTransition, per-field errors from json.details, inline
 * success panel. Posts to POST /api/events/[slug]/questions.
 *
 * No public listing of question bodies — the "N questions already in"
 * counter is the only thing shown, and it bumps by one locally on a
 * successful submit (a count, never content, so this isn't the optimistic
 * public display the spec rules out).
 */

import { useEffect, useState, useTransition } from "react";
import { Send, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { KaribuSelect } from "@/components/karibu/KaribuSelect";
import { KENYA_COUNTIES, MAX_QUESTION_LENGTH, MAX_NAME_LENGTH } from "@/lib/events/participation";
import type { OpenQuestionSessionView } from "@/lib/conversations/queries";

const COUNTY_OPTIONS = KENYA_COUNTIES.map((c) => ({ value: c, label: c }));

const inputCls = (hasError?: string) =>
  `w-full rounded-lg border ${
    hasError ? "border-error/60" : "border-sand-2"
  } bg-paper px-3 py-2.5 font-inter text-sm text-ink placeholder:text-ink-muted/70 transition-colors focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20`;

interface EventQaBlockProps {
  eventSlug: string;
  session: OpenQuestionSessionView;
}

export function EventQaBlock({ eventSlug, session }: EventQaBlockProps) {
  const [isPending, startTransition] = useTransition();
  const [csrfToken, setCsrfToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [county, setCounty] = useState("");
  const [body, setBody] = useState("");
  const [count, setCount] = useState(session.questionCount);

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
      body,
      submitterName: form.get("submitterName") as string,
      county,
      website: (form.get("website") as string) || "",
    };

    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventSlug}/questions`, {
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
        setCount((n) => n + 1);
        setSubmitted(true);
      } catch {
        setError("Network error. Please check your connection and try again.");
      }
    });
  }

  return (
    <div className="mt-9">
      <h2 className="mb-2 font-newsreader text-[24px] font-medium text-ink">{session.title}</h2>
      <p className="mb-2 font-inter text-[15px] leading-[1.6] text-ink-soft">{session.prompt}</p>
      <p className="mb-5 font-inter text-[13px] font-semibold text-clay">
        {count} {count === 1 ? "question" : "questions"} already in
      </p>

      {submitted ? (
        <div className="rounded-2xl border border-sand bg-paper-card py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-clay/10 text-clay">
            <CheckCircle className="h-7 w-7" />
          </div>
          <h3 className="mb-2 font-newsreader text-[22px] text-ink">
            Asante &mdash; your question is in review
          </h3>
          <p className="mx-auto max-w-md px-4 font-inter text-sm text-ink-soft">
            Approved questions go into the live session pool. We don&apos;t
            publish a public list &mdash; they&apos;re for the room, not a wall.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-sand bg-paper-card p-6">
            <div className="mb-4">
              <div className="mb-1.5 flex items-baseline justify-between">
                <label
                  htmlFor="qa-body"
                  className="font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
                >
                  Your question *
                </label>
                <span className="font-inter text-[11px] text-ink-muted">
                  {body.length}/{MAX_QUESTION_LENGTH}
                </span>
              </div>
              <textarea
                id="qa-body"
                name="body"
                required
                rows={3}
                maxLength={MAX_QUESTION_LENGTH}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className={`${inputCls(fieldErrors.body)} resize-none`}
                placeholder="What do you want to ask Anthropic's team?"
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
                id="qa-county"
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
              <label htmlFor="qa-website">Leave this field empty</label>
              <input id="qa-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
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
            className="flex w-full items-center justify-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Submit question
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 font-inter text-[11px] text-error">{msg}</p>;
}
