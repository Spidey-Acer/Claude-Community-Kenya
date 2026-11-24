"use client";

/**
 * SpeakPanel — speaker-application panel on /get-involved.
 *
 * Same submission contract as the Terminal Noir /speak page (CSRF token,
 * POST /api/speakers/apply, field-level errors, all fields preserved) — only
 * the styling differs.
 */

import { useState, useTransition } from "react";
import { Send, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { BTN_OUTLINE, BTN_PRIMARY, Field, INPUT, INPUT_INVALID, Masthead } from "@/components/karibu/kit";
import { CsrfRetry } from "@/components/karibu/get-involved/CsrfRetry";
import { useCsrfToken } from "@/components/karibu/get-involved/useCsrfToken";

const WRAP = "mx-auto max-w-[880px] px-6 md:px-10";

const CATEGORIES = [
  { value: "FINTECH", label: "Fintech & Finance Tech", desc: "M-Pesa integrations, open banking, payment systems" },
  { value: "TECHNICAL", label: "Technical Deep-Dive", desc: "AI/ML, system design, advanced engineering topics" },
  { value: "CAREER", label: "Career & Community", desc: "Developer career paths, community building, freelancing" },
  { value: "LIVE_DEMO", label: "Live Demo / Build Session", desc: "Real-time building or showcasing a project live" },
  { value: "OTHER", label: "Other", desc: "Something that doesn't fit the above categories" },
];

const CITIES = ["Nairobi", "Mombasa", "Either"];

const HIGHLIGHTS = ["30–45 min slots", "Live demos welcome", "Nairobi & Mombasa events"];

const CONTROL = `${INPUT} ${INPUT_INVALID}`;
const GROUP_LABEL = "mb-1.5 block font-inter text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted";

export function SpeakPanel() {
  const [isPending, startTransition] = useTransition();
  const { token: csrfToken, failed: csrfFailed, retry: retryCsrf } = useCsrfToken();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      email: form.get("email") as string,
      phone: (form.get("phone") as string) || undefined,
      topic: form.get("topic") as string,
      abstract: form.get("abstract") as string,
      bio: form.get("bio") as string,
      category: form.get("category") as string,
      preferredEvent: (form.get("preferredEvent") as string) || undefined,
      preferredCity: (form.get("preferredCity") as string) || undefined,
      linkedIn: (form.get("linkedIn") as string) || undefined,
      github: (form.get("github") as string) || undefined,
      portfolio: (form.get("portfolio") as string) || undefined,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/speakers/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) {
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

  if (submitted) {
    return (
      <section className={`${WRAP} py-24`} aria-label="Application submitted">
        <div className="rounded-2xl border border-sand bg-paper-card py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-clay/10 text-clay">
            <CheckCircle className="h-7 w-7" />
          </div>
          <h1 className="mb-2 font-newsreader text-[26px] text-ink">Application received</h1>
          <p className="mx-auto mb-6 max-w-md px-4 font-inter text-sm text-ink-soft">
            Thank you for applying to speak at a CCK event. We&apos;ll review your
            application and reach out within 2 weeks.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/events"
              className={BTN_PRIMARY}
            >
              View events
            </Link>
            <Link
              href="/"
              className={BTN_OUTLINE}
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Speak header">
        <Masthead
          flush
          eyebrow="Speak"
          title={
            <>
              Share your knowledge with <span className="italic text-clay">Kenya&apos;s AI community.</span>
            </>
          }
          lead="CCK events bring together Kenya's best developers. If you have insights on AI, Claude Code, engineering, fintech, or building in Kenya, we want to hear from you."
        >
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            {HIGHLIGHTS.map((item) => (
              <div key={item} className="font-inter text-[13px] text-ink-muted">
                {item}
              </div>
            ))}
          </div>
        </Masthead>
      </section>

      {/* Form */}
      <section className={`${WRAP} py-10`} aria-label="Speaker application form">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* About You */}
          <div className="rounded-2xl border border-sand bg-paper-card p-6">
            <h2 className="mb-5 font-newsreader text-[20px] text-ink">About you</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={fieldErrors.name}>
                {(fieldProps) => (
                  <input {...fieldProps} name="name" type="text" autoComplete="name" required className={CONTROL} placeholder="Your full name" />
                )}
              </Field>
              <Field label="Email" error={fieldErrors.email}>
                {(fieldProps) => (
                  <input {...fieldProps} name="email" type="email" autoComplete="email" required className={CONTROL} placeholder="you@example.com" />
                )}
              </Field>
              <Field label="Phone (optional)">
                {(fieldProps) => (
                  <input {...fieldProps} name="phone" type="tel" autoComplete="tel" className={CONTROL} placeholder="+254 ..." />
                )}
              </Field>
              <Field label="LinkedIn (optional)">
                {(fieldProps) => (
                  <input {...fieldProps} name="linkedIn" type="url" className={CONTROL} placeholder="https://linkedin.com/in/..." />
                )}
              </Field>
              <Field label="GitHub (optional)">
                {(fieldProps) => (
                  <input {...fieldProps} name="github" type="url" className={CONTROL} placeholder="https://github.com/..." />
                )}
              </Field>
              <Field label="Portfolio / website (optional)">
                {(fieldProps) => (
                  <input {...fieldProps} name="portfolio" type="url" className={CONTROL} placeholder="https://..." />
                )}
              </Field>
            </div>
          </div>

          {/* Your Talk */}
          <div className="rounded-2xl border border-sand bg-paper-card p-6">
            <h2 className="mb-5 font-newsreader text-[20px] text-ink">Your talk</h2>
            <div className="space-y-4">
              <Field label="Talk title" error={fieldErrors.topic}>
                {(fieldProps) => (
                  <input {...fieldProps} name="topic" type="text" required className={CONTROL} placeholder="e.g. Building a production RAG pipeline with Claude" />
                )}
              </Field>

              <div>
                <p id="speak-category-label" className={GROUP_LABEL}>
                  Category
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby="speak-category-label"
                  aria-describedby={fieldErrors.category ? "speak-category-error" : undefined}
                  className="grid grid-cols-1 gap-2"
                >
                  {CATEGORIES.map(({ value, label, desc }) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-sand-2 p-3 transition-colors hover:border-clay/50 has-[:checked]:border-clay has-[:checked]:bg-clay/5"
                    >
                      <input type="radio" name="category" value={value} required className="mt-0.5 accent-[var(--clay)]" />
                      <div>
                        <div className="font-inter text-xs font-semibold text-ink">{label}</div>
                        <div className="mt-0.5 font-inter text-[11px] text-ink-muted">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {fieldErrors.category && (
                  <p id="speak-category-error" role="alert" className="mt-1 font-inter text-xs text-error">
                    {fieldErrors.category}
                  </p>
                )}
              </div>

              <Field label="Abstract" hint="At least 100 characters." error={fieldErrors.abstract}>
                {(fieldProps) => (
                  <textarea {...fieldProps}
                    name="abstract"
                    required
                    rows={4}
                    className={`${CONTROL} resize-none`}
                    placeholder="Brief summary of your talk — what attendees will learn, what you'll cover..."
                  />
                )}
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Preferred city (optional)">
                  {(fieldProps) => (
                    <select {...fieldProps} name="preferredCity" className={CONTROL}>
                      <option value="">Any city</option>
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Preferred event type (optional)">
                  {(fieldProps) => (
                    <input {...fieldProps} name="preferredEvent" type="text" className={CONTROL} placeholder="e.g. Meetup, Workshop, Hackathon" />
                  )}
                </Field>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="rounded-2xl border border-sand bg-paper-card p-6">
            <Field label="Speaker bio" error={fieldErrors.bio}>
              {(fieldProps) => (
                <textarea
                  {...fieldProps}
                  name="bio"
                  required
                  rows={4}
                  className={`${CONTROL} resize-none`}
                  placeholder="Tell us about yourself — your background, what you build, what you're passionate about..."
                />
              )}
            </Field>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-error/30 bg-error/10 p-4 font-inter text-sm text-error">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}

          {csrfFailed && <CsrfRetry onRetry={retryCsrf} />}

          <button
            type="submit"
            disabled={isPending || !csrfToken}
            className={`${BTN_PRIMARY} w-full disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" /> Submit application
              </>
            )}
          </button>
          <p className="text-center font-inter text-[11px] text-ink-muted">
            By submitting, you agree to the{" "}
            <Link href="/code-of-conduct" className="font-semibold text-clay hover:text-clay-dark">
              CCK Code of Conduct
            </Link>
          </p>
        </form>
      </section>
    </>
  );
}
