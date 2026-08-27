"use client";

/**
 * KaribuSubmitIdea — warm-light "Submit an idea" page.
 *
 * Same submission contract as the Terminal Noir SubmitIdeaPage (CSRF token,
 * POST /api/ideas/submit, field-level errors, all fields preserved) — only
 * the styling differs.
 */

import { useState, useEffect, useTransition } from "react";
import { Send, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/karibu/motion/Reveal";

const WRAP = "mx-auto max-w-[880px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

const STAGES = [
  { value: "IDEA", label: "Idea / Concept", desc: "Still in the brainstorming phase" },
  { value: "MVP", label: "MVP Built", desc: "I have a working prototype or early version" },
  { value: "GROWING", label: "Growing / Scaling", desc: "Product is live and gaining users" },
];

const SEEKING_ROLES = [
  { value: "COFOUNDER", label: "Co-Founder" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "DESIGNER", label: "Designer" },
  { value: "MENTOR", label: "Mentor / Advisor" },
  { value: "FUNDER", label: "Investor / Funder" },
];

const inputCls = (hasError?: string) =>
  `w-full rounded-lg border ${
    hasError ? "border-error/60" : "border-sand-2"
  } bg-paper px-3 py-2.5 font-inter text-sm text-ink placeholder:text-ink-muted/70 transition-colors focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20`;

export function KaribuSubmitIdea() {
  const [isPending, startTransition] = useTransition();
  const [csrfToken, setCsrfToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [techStack, setTechStack] = useState<string[]>([]);
  const [techInput, setTechInput] = useState("");

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {});
  }, []);

  function toggleRole(role: string) {
    setSelectedRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

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

    if (selectedRoles.length === 0) {
      setFieldErrors({ seekingRoles: "Select at least one role you're seeking" });
      return;
    }

    const form = new FormData(e.currentTarget);
    const data = {
      title: form.get("title") as string,
      description: form.get("description") as string,
      stage: form.get("stage") as string,
      seekingRoles: selectedRoles,
      techStack: techStack.length > 0 ? techStack : undefined,
      timeline: (form.get("timeline") as string) || undefined,
      contactName: form.get("contactName") as string,
      contactEmail: form.get("contactEmail") as string,
      linkedIn: (form.get("linkedIn") as string) || undefined,
      github: (form.get("github") as string) || undefined,
      website: (form.get("website") as string) || undefined,
    };

    startTransition(async () => {
      try {
        const res = await fetch("/api/ideas/submit", {
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
      <section className={`${WRAP} py-24`} aria-label="Idea submitted">
        <div className="mx-auto max-w-md rounded-2xl border border-sand bg-paper-card py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-clay/10 text-clay">
            <CheckCircle className="h-7 w-7" />
          </div>
          <h1 className="mb-2 font-newsreader text-[22px] text-ink">Idea submitted</h1>
          <p className="mx-auto mb-6 max-w-md px-4 font-inter text-sm text-ink-soft">
            Your project idea has been received. We&apos;ll review it and may
            feature it in the community if approved. Approved ideas will be
            showcased on our Projects page.
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
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Submit an idea header">
        <Reveal>
          <div className={`${KICKER} mb-4`}>Submit an idea</div>
          <h1 className="mb-4 max-w-[720px] font-newsreader text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink sm:text-[56px]">
            Building something? <span className="italic text-clay">Find your collaborators.</span>
          </h1>
          <p className="max-w-[600px] font-inter text-[17px] leading-[1.6] text-ink-soft">
            Share your project or startup idea with Kenya&apos;s AI developer
            community. Find co-founders, developers, designers, mentors, or
            early backers.
          </p>
        </Reveal>
      </section>

      {/* Form */}
      <section className={`${WRAP} pb-20 pt-4`} aria-label="Idea submission form">
        <Reveal>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Project details */}
            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <h2 className="mb-5 font-newsreader text-[20px] text-ink">Project details</h2>
              <div className="space-y-4">
                <Field label="Project name *" error={fieldErrors.title}>
                  <input
                    name="title"
                    type="text"
                    required
                    className={inputCls(fieldErrors.title)}
                    placeholder="Your project or startup name"
                  />
                </Field>

                <Field label="Description * (min 50 chars)" error={fieldErrors.description}>
                  <textarea
                    name="description"
                    required
                    rows={4}
                    className={`${inputCls(fieldErrors.description)} resize-none`}
                    placeholder="What does your project do? What problem does it solve? Who is it for?"
                  />
                </Field>

                <div>
                  <label className="mb-2 block font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                    Project stage *
                  </label>
                  <div className="space-y-2">
                    {STAGES.map(({ value, label, desc }) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-sand-2 p-3 transition-colors hover:border-clay/50 has-[:checked]:border-clay has-[:checked]:bg-clay/5"
                      >
                        <input type="radio" name="stage" value={value} required className="mt-0.5 accent-[var(--clay)]" />
                        <div>
                          <div className="font-inter text-xs font-semibold text-ink">{label}</div>
                          <div className="mt-0.5 font-inter text-[11px] text-ink-muted">{desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <Field label="Target timeline (optional)">
                  <input
                    name="timeline"
                    type="text"
                    className={inputCls()}
                    placeholder="e.g. Launch in 3 months, seeking funding in Q2 2026"
                  />
                </Field>
              </div>
            </div>

            {/* What you're seeking */}
            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <h2 className="mb-4 font-newsreader text-[20px] text-ink">What are you looking for? *</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SEEKING_ROLES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleRole(value)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 font-inter text-xs transition-colors ${
                      selectedRoles.includes(value)
                        ? "border-clay bg-clay/10 text-clay"
                        : "border-sand-2 text-ink-soft hover:border-clay/50"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full border ${
                        selectedRoles.includes(value) ? "border-clay bg-clay" : "border-ink-muted"
                      }`}
                    />
                    {label}
                  </button>
                ))}
              </div>
              {fieldErrors.seekingRoles && <FieldError msg={fieldErrors.seekingRoles} />}
            </div>

            {/* Tech stack */}
            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <h2 className="mb-4 font-newsreader text-[20px] text-ink">Tech stack (optional)</h2>
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={addTech}
                className={inputCls()}
                placeholder="Type a technology and press Enter (e.g. React, Python, Claude API)"
              />
              {techStack.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {techStack.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1.5 rounded-full border border-sand-2 bg-paper-alt px-2.5 py-0.5 font-inter text-[11px] text-ink-soft"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() => removeTech(tech)}
                        className="text-ink-muted transition-colors hover:text-clay"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Contact */}
            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <h2 className="mb-4 font-newsreader text-[20px] text-ink">Contact info</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Name *" error={fieldErrors.contactName}>
                  <input name="contactName" type="text" required className={inputCls(fieldErrors.contactName)} placeholder="Your name" />
                </Field>
                <Field label="Email *" error={fieldErrors.contactEmail}>
                  <input name="contactEmail" type="email" required className={inputCls(fieldErrors.contactEmail)} placeholder="you@example.com" />
                </Field>
                <Field label="LinkedIn (optional)">
                  <input name="linkedIn" type="url" className={inputCls()} placeholder="https://linkedin.com/in/..." />
                </Field>
                <Field label="GitHub (optional)">
                  <input name="github" type="url" className={inputCls()} placeholder="https://github.com/..." />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Website (optional)">
                    <input name="website" type="url" className={inputCls()} placeholder="https://..." />
                  </Field>
                </div>
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
                  <Send className="h-4 w-4" /> Submit idea
                </>
              )}
            </button>
            <p className="text-center font-inter text-[11px] text-ink-muted">
              All intellectual property remains fully owned by you. We only share approved ideas publicly.
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
