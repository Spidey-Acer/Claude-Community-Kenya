"use client";

/**
 * KaribuSpeak — warm-light speaker-application page.
 *
 * Same submission contract as the Terminal Noir /speak page (CSRF token,
 * POST /api/speakers/apply, field-level errors, all fields preserved) — only
 * the styling differs.
 */

import { useState, useEffect, useTransition, cloneElement, isValidElement, type ReactElement } from "react";
import { Send, CheckCircle, AlertTriangle, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";

const WRAP = "mx-auto max-w-[880px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

const CATEGORIES = [
  { value: "FINTECH", label: "Fintech & Finance Tech", desc: "M-Pesa integrations, open banking, payment systems" },
  { value: "TECHNICAL", label: "Technical Deep-Dive", desc: "AI/ML, system design, advanced engineering topics" },
  { value: "CAREER", label: "Career & Community", desc: "Developer career paths, community building, freelancing" },
  { value: "LIVE_DEMO", label: "Live Demo / Build Session", desc: "Real-time building or showcasing a project live" },
  { value: "OTHER", label: "Other", desc: "Something that doesn't fit the above categories" },
];

const CITIES = ["Nairobi", "Mombasa", "Either"];

const HIGHLIGHTS = ["30–45 min slots", "Live demos welcome", "Nairobi & Mombasa events"];

const inputCls = (hasError?: string) =>
  `w-full rounded-lg border ${
    hasError ? "border-error/60" : "border-sand-2"
  } bg-paper px-3 py-2.5 font-inter text-sm text-ink placeholder:text-ink-muted/70 transition-colors focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20`;

export function KaribuSpeak() {
  const [isPending, startTransition] = useTransition();
  const [csrfToken, setCsrfToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() =>
        // Without a token the submit button stays disabled — say why instead
        // of leaving the form silently bricked.
        setError("Couldn't initialize the form. Refresh the page and try again.")
      );
  }, []);

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
              className="inline-flex rounded-full bg-clay px-5 py-2.5 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
            >
              View events
            </Link>
            <Link
              href="/"
              className="inline-flex rounded-full border border-sand-2 px-5 py-2.5 font-inter text-sm font-semibold text-ink transition-colors hover:border-ink"
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
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Speak header">
        <div className={`${KICKER} mb-4`}>Speak · Ongea</div>
        <h1 className="mb-4 max-w-[720px] font-newsreader text-[40px] font-normal leading-[1.05] tracking-[-0.02em] text-ink sm:text-[48px]">
          Share your knowledge with{" "}
          <span className="italic text-clay">Kenya&apos;s AI community.</span>
        </h1>
        <p className="max-w-[560px] font-inter text-[17px] leading-[1.6] text-ink-soft">
          CCK events bring together Kenya&apos;s best developers. If you have
          insights on AI, Claude Code, engineering, fintech, or building in
          Kenya — we want to hear from you.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
          {HIGHLIGHTS.map((item) => (
            <div key={item} className="flex items-center gap-1.5 font-inter text-[13px] text-ink-muted">
              <ChevronRight className="h-3.5 w-3.5 text-clay" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section className={`${WRAP} py-10`} aria-label="Speaker application form">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* About You */}
          <div className="rounded-2xl border border-sand bg-paper-card p-6">
            <h2 className="mb-5 font-newsreader text-[20px] text-ink">About you</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name *" error={fieldErrors.name}>
                <input name="name" type="text" autoComplete="name" required className={inputCls(fieldErrors.name)} placeholder="Your full name" />
              </Field>
              <Field label="Email *" error={fieldErrors.email}>
                <input name="email" type="email" autoComplete="email" required className={inputCls(fieldErrors.email)} placeholder="you@example.com" />
              </Field>
              <Field label="Phone (optional)">
                <input name="phone" type="tel" autoComplete="tel" className={inputCls()} placeholder="+254 ..." />
              </Field>
              <Field label="LinkedIn (optional)">
                <input name="linkedIn" type="url" className={inputCls()} placeholder="https://linkedin.com/in/..." />
              </Field>
              <Field label="GitHub (optional)">
                <input name="github" type="url" className={inputCls()} placeholder="https://github.com/..." />
              </Field>
              <Field label="Portfolio / website (optional)">
                <input name="portfolio" type="url" className={inputCls()} placeholder="https://..." />
              </Field>
            </div>
          </div>

          {/* Your Talk */}
          <div className="rounded-2xl border border-sand bg-paper-card p-6">
            <h2 className="mb-5 font-newsreader text-[20px] text-ink">Your talk</h2>
            <div className="space-y-4">
              <Field label="Talk title *" error={fieldErrors.topic}>
                <input name="topic" type="text" required className={inputCls(fieldErrors.topic)} placeholder="e.g. Building a production RAG pipeline with Claude" />
              </Field>

              <fieldset>
                <legend className="mb-1.5 block font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  Category *
                </legend>
                <div className="grid grid-cols-1 gap-2">
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
                {fieldErrors.category && <FieldError msg={fieldErrors.category} />}
              </fieldset>

              <Field label="Abstract * (min 100 chars)" error={fieldErrors.abstract}>
                <textarea
                  name="abstract"
                  required
                  rows={4}
                  className={`${inputCls(fieldErrors.abstract)} resize-none`}
                  placeholder="Brief summary of your talk — what attendees will learn, what you'll cover..."
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="speak-preferred-city" className="mb-1.5 block font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                    Preferred city
                  </label>
                  <select id="speak-preferred-city" name="preferredCity" className={inputCls()}>
                    <option value="">Any city</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <Field label="Preferred event type">
                  <input name="preferredEvent" type="text" className={inputCls()} placeholder="e.g. Meetup, Workshop, Hackathon" />
                </Field>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="rounded-2xl border border-sand bg-paper-card p-6">
            <h2 id="speak-bio-heading" className="mb-4 font-newsreader text-[20px] text-ink">Speaker bio *</h2>
            <textarea
              aria-labelledby="speak-bio-heading"
              name="bio"
              required
              rows={4}
              className={`${inputCls(fieldErrors.bio)} resize-none`}
              placeholder="Tell us about yourself — your background, what you build, what you're passionate about..."
            />
            {fieldErrors.bio && <FieldError msg={fieldErrors.bio} />}
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-error/30 bg-error/10 p-4 font-inter text-sm text-error">
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
            <Link href="/code-of-conduct" className="underline hover:text-ink">
              CCK Code of Conduct
            </Link>
          </p>
        </form>
      </section>
    </>
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
  const id = `f-${label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, { id })
    : children;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
      >
        {label}
      </label>
      {control}
      {error && <FieldError msg={error} />}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p role="alert" className="mt-1 font-inter text-[11px] text-error">{msg}</p>;
}
