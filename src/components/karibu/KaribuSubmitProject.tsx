"use client";

/**
 * KaribuSubmitProject — warm-light "submit a project" page.
 *
 * Same submission contract as the Terminal Noir SubmitProjectPage (CSRF token,
 * POST /api/projects/submit, tech-stack tag input, field-level errors) — only
 * the styling differs.
 */

import { useState, useEffect, useTransition } from "react";
import { Send, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/karibu/motion/Reveal";

const WRAP = "mx-auto max-w-[880px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

const STATUSES = [
  { value: "in-development", label: "In Development", desc: "Still building — not yet released" },
  { value: "live", label: "Live / Deployed", desc: "Available for people to use right now" },
  { value: "in-production", label: "In Production", desc: "Actively used in a production environment" },
];

const inputCls = (hasError?: string) =>
  `w-full rounded-lg border ${
    hasError ? "border-error/60" : "border-sand-2"
  } bg-paper px-3 py-2.5 font-inter text-sm text-ink placeholder:text-ink-muted/70 transition-colors focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20`;

export function KaribuSubmitProject() {
  const [isPending, startTransition] = useTransition();
  const [csrfToken, setCsrfToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {});
  }, []);

  function addTech(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && techInput.trim()) {
      e.preventDefault();
      const val = techInput.trim().replace(/,$/, "");
      if (val && !techStack.includes(val)) setTechStack((prev) => [...prev, val]);
      setTechInput("");
    }
  }

  function removeTech(t: string) {
    setTechStack((prev) => prev.filter((x) => x !== t));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (techStack.length === 0) {
      setFieldErrors({ stack: "Add at least one technology to your stack" });
      return;
    }

    const form = new FormData(e.currentTarget);
    const data = {
      name: form.get("name") as string,
      builder: form.get("builder") as string,
      description: form.get("description") as string,
      status: form.get("status") as string,
      stack: techStack,
      demoUrl: (form.get("demoUrl") as string) || undefined,
      repoUrl: (form.get("repoUrl") as string) || undefined,
      contactName: form.get("contactName") as string,
      contactEmail: form.get("contactEmail") as string,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/projects/submit", {
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
      <section className={`${WRAP} py-24`} aria-label="Project submitted">
        <div className="mx-auto max-w-md rounded-2xl border border-sand bg-paper-card py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-clay/10 text-clay">
            <CheckCircle className="h-7 w-7" />
          </div>
          <h1 className="mb-2 font-newsreader text-[22px] text-ink">Project submitted</h1>
          <p className="mx-auto mb-4 max-w-md px-4 font-inter text-sm text-ink-soft">
            We&apos;ll review it and feature it on the Projects page once
            approved.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/projects"
              className="inline-flex rounded-full bg-clay px-5 py-2 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
            >
              View projects
            </Link>
            <Link
              href="/"
              className="inline-flex rounded-full border border-sand-2 px-5 py-2 font-inter text-sm font-semibold text-ink transition-colors hover:border-ink"
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
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Submit a project header">
        <Reveal>
          <div className={`${KICKER} mb-4`}>Submit a project</div>
          <h1 className="mb-4 max-w-[720px] font-newsreader text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink sm:text-[56px]">
            Built something? <span className="italic text-clay">Share it.</span>
          </h1>
          <p className="max-w-[600px] font-inter text-[17px] leading-[1.6] text-ink-soft">
            Showcase your project built with Claude. Get featured on the CCK
            Projects page and inspire other developers across Africa. Free to
            submit — open source encouraged.
          </p>
        </Reveal>
      </section>

      {/* Form */}
      <section className={`${WRAP} py-10`} aria-label="Project submission form">
        <Reveal>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Project details */}
            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <h2 className="mb-5 font-newsreader text-[22px] text-ink">Project details</h2>
              <div className="space-y-4">
                <Field label="Project name *" error={fieldErrors.name}>
                  <input
                    name="name"
                    type="text"
                    required
                    className={inputCls(fieldErrors.name)}
                    placeholder="e.g. Claude Kenya Theme"
                  />
                </Field>
                <Field label="Builder / team *" error={fieldErrors.builder}>
                  <input
                    name="builder"
                    type="text"
                    required
                    className={inputCls(fieldErrors.builder)}
                    placeholder="e.g. Claude Community Kenya"
                  />
                </Field>
                <Field label="Description * (min 30 chars)" error={fieldErrors.description}>
                  <textarea
                    name="description"
                    required
                    rows={4}
                    className={`${inputCls(fieldErrors.description)} resize-none`}
                    placeholder="What does your project do? What problem does it solve?"
                  />
                </Field>

                <div>
                  <label className="mb-2 block font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                    Project status *
                  </label>
                  <div className="space-y-2">
                    {STATUSES.map(({ value, label, desc }) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-sand-2 p-3 transition-colors hover:border-clay/50 has-[:checked]:border-clay has-[:checked]:bg-clay/5"
                      >
                        <input type="radio" name="status" value={value} required className="mt-0.5 accent-[var(--clay)]" />
                        <div>
                          <div className="font-inter text-xs font-semibold text-ink">{label}</div>
                          <div className="mt-0.5 font-inter text-[11px] text-ink-muted">{desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Tech stack */}
            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <h2 className="mb-4 font-newsreader text-[22px] text-ink">Tech stack *</h2>
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={addTech}
                className={inputCls(fieldErrors.stack)}
                placeholder="Type a technology and press Enter (e.g. Next.js, Python, Claude Code)"
              />
              {fieldErrors.stack && <FieldError msg={fieldErrors.stack} />}
              {techStack.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {techStack.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1.5 rounded-full border border-sand-2 bg-paper px-2.5 py-1 font-inter text-[11px] text-ink-soft"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() => removeTech(tech)}
                        className="text-ink-muted transition-colors hover:text-clay"
                        aria-label={`Remove ${tech}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Links */}
            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <h2 className="mb-4 font-newsreader text-[22px] text-ink">Project links</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Demo / live URL (optional)">
                  <input name="demoUrl" type="url" className={inputCls()} placeholder="https://your-project.com" />
                </Field>
                <Field label="Repository URL (optional)">
                  <input name="repoUrl" type="url" className={inputCls()} placeholder="https://github.com/..." />
                </Field>
              </div>
            </div>

            {/* Contact */}
            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <h2 className="mb-4 font-newsreader text-[22px] text-ink">Your contact info</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name *" error={fieldErrors.contactName}>
                  <input
                    name="contactName"
                    type="text"
                    required
                    className={inputCls(fieldErrors.contactName)}
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Email *" error={fieldErrors.contactEmail}>
                  <input
                    name="contactEmail"
                    type="email"
                    required
                    className={inputCls(fieldErrors.contactEmail)}
                    placeholder="you@example.com"
                  />
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
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Submit project
                </>
              )}
            </button>
            <p className="text-center font-inter text-[11px] text-ink-muted">
              Projects are reviewed before being featured. All intellectual
              property remains fully owned by you.
            </p>
          </form>
        </Reveal>
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
