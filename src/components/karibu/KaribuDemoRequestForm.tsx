"use client";

/**
 * KaribuDemoRequestForm — warm-light demo-slot request form.
 *
 * Same submission contract as the Terminal Noir DemoRequestForm (CSRF token,
 * POST /api/events/[slug]/demo-request, field-level errors) — only the styling
 * differs. The dark version stays until the persona cleanup PR removes it.
 */

import { useState, useEffect, useTransition } from "react";
import { Send, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";

const TIME_OPTIONS = [
  { value: "5", label: "5 min — Lightning" },
  { value: "10", label: "10 min — Standard" },
  { value: "15", label: "15 min — Extended" },
  { value: "20", label: "20 min — Deep dive" },
];

const inputCls = (hasError?: string) =>
  `w-full rounded-lg border ${
    hasError ? "border-error/60" : "border-sand-2"
  } bg-paper px-3 py-2.5 font-inter text-sm text-ink placeholder:text-ink-muted/70 transition-colors focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20`;

export function KaribuDemoRequestForm({ eventSlug }: { eventSlug: string }) {
  const [isPending, startTransition] = useTransition();
  const [csrfToken, setCsrfToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
      name: form.get("name") as string,
      email: form.get("email") as string,
      projectTitle: form.get("projectTitle") as string,
      description: form.get("description") as string,
      estimatedTime: form.get("estimatedTime") as string,
      demoUrl: (form.get("demoUrl") as string) || undefined,
      repoUrl: (form.get("repoUrl") as string) || undefined,
    };

    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventSlug}/demo-request`, {
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
      <div className="rounded-2xl border border-sand bg-paper-card py-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-clay/10 text-clay">
          <CheckCircle className="h-7 w-7" />
        </div>
        <h3 className="mb-2 font-newsreader text-[22px] text-ink">Demo request submitted</h3>
        <p className="mx-auto mb-4 max-w-md px-4 font-inter text-sm text-ink-soft">
          We&apos;ll review your request and confirm your slot within 3 business
          days. Check your email for updates.
        </p>
        <Link
          href="/events"
          className="inline-flex rounded-full border border-sand-2 px-5 py-2 font-inter text-sm font-semibold text-ink transition-colors hover:border-ink"
        >
          View all events
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-sand bg-paper-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name *" error={fieldErrors.name}>
            <input name="name" type="text" required className={inputCls(fieldErrors.name)} placeholder="Your full name" />
          </Field>
          <Field label="Email *" error={fieldErrors.email}>
            <input name="email" type="email" required className={inputCls(fieldErrors.email)} placeholder="you@example.com" />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Project / demo title *" error={fieldErrors.projectTitle}>
            <input name="projectTitle" type="text" required className={inputCls(fieldErrors.projectTitle)} placeholder="e.g. M-Pesa transaction analyzer" />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="What will you demo? * (min 20 chars)" error={fieldErrors.description}>
            <textarea
              name="description"
              required
              rows={3}
              className={`${inputCls(fieldErrors.description)} resize-none`}
              placeholder="The problem it solves, what makes it interesting, and what the audience will see..."
            />
          </Field>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Estimated time *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TIME_OPTIONS.map(({ value, label }) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-sand-2 p-3 transition-colors hover:border-clay/50 has-[:checked]:border-clay has-[:checked]:bg-clay/5"
              >
                <input type="radio" name="estimatedTime" value={value} required className="accent-[var(--clay)]" />
                <span className="font-inter text-xs text-ink-soft">{label}</span>
              </label>
            ))}
          </div>
          {fieldErrors.estimatedTime && <FieldError msg={fieldErrors.estimatedTime} />}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Live URL (optional)">
            <input name="demoUrl" type="url" className={inputCls()} placeholder="https://your-demo.vercel.app" />
          </Field>
          <Field label="Repository (optional)">
            <input name="repoUrl" type="url" className={inputCls()} placeholder="https://github.com/..." />
          </Field>
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
        disabled={isPending || !csrfToken}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
        ) : (
          <><Send className="h-4 w-4" /> Request demo slot</>
        )}
      </button>
      <p className="text-center font-inter text-[11px] text-ink-muted">
        By submitting, you agree to the{" "}
        <Link href="/code-of-conduct" className="underline hover:text-ink">
          CCK Code of Conduct
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </label>
      {children}
      {error && <FieldError msg={error} />}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 font-inter text-[11px] text-error">{msg}</p>;
}
