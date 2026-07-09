"use client";

/**
 * KaribuVolunteer — warm-light volunteer application page.
 *
 * Same submission contract as the Terminal Noir VolunteerPage (CSRF token via
 * /api/csrf-token, POST /api/volunteer/apply, field-level errors, success
 * screen) — only the styling differs. The dark version stays until the
 * persona cleanup PR removes it.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { HandHeart, Send, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Reveal } from "@/components/karibu/motion/Reveal";

const WRAP = "mx-auto max-w-[880px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

const VOLUNTEER_ROLES = [
  { value: "SOCIAL_MEDIA_MANAGER", label: "Social Media Manager", description: "Manage Twitter/X, LinkedIn posting and engagement" },
  { value: "COMMUNITY_MANAGER", label: "Community Manager", description: "Manage Discord/WhatsApp, welcome members, moderate" },
  { value: "CONTENT_CREATOR", label: "Content Creator", description: "Write blog posts, create graphics, video content" },
  { value: "EVENT_COORDINATOR", label: "Event Coordinator", description: "Help organize and run meetups in Nairobi/Mombasa" },
] as const;

const AVAILABILITY_OPTIONS = [
  "Weekday evenings",
  "Weekends only",
  "Flexible schedule",
  "A few hours per week",
  "Full commitment",
] as const;

const inputCls = (hasError?: string) =>
  `w-full rounded-lg border ${
    hasError ? "border-red-500/60" : "border-sand-2"
  } bg-paper px-3 py-2.5 font-inter text-sm text-ink placeholder:text-ink-muted/70 transition-colors focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20`;

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
  return <p className="mt-1 font-inter text-[11px] text-red-600">{msg}</p>;
}

export function KaribuVolunteer() {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [availability, setAvailability] = useState("");
  const [motivation, setMotivation] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [github, setGithub] = useState("");
  const [twitter, setTwitter] = useState("");
  const [portfolio, setPortfolio] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token");
        const { csrfToken } = await csrfRes.json();

        const res = await fetch("/api/volunteer/apply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken ?? "",
          },
          body: JSON.stringify({
            name,
            email,
            phone: phone || undefined,
            role,
            experience,
            availability,
            motivation,
            linkedIn: linkedIn || undefined,
            github: github || undefined,
            twitter: twitter || undefined,
            portfolio: portfolio || undefined,
          }),
        });

        const data = await res.json();
        if (!data.success) {
          if (data.details) setFieldErrors(data.details);
          setError(data.error || "Something went wrong");
          return;
        }

        setSuccess(true);
      } catch {
        setError("Network error — please try again");
      }
    });
  }

  if (success) {
    return (
      <section className={`${WRAP} py-24`} aria-label="Application submitted">
        <div className="mx-auto max-w-lg rounded-2xl border border-sand bg-paper-card py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-clay/10 text-clay">
            <CheckCircle className="h-7 w-7" />
          </div>
          <h1 className="mb-2 font-newsreader text-[22px] text-ink">Application submitted</h1>
          <p className="mx-auto mb-6 max-w-md px-4 font-inter text-sm text-ink-soft">
            Thank you for volunteering with Claude Community Kenya. We&apos;ll review
            your application and get back to you soon.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/"
              className="inline-flex rounded-full border border-sand-2 px-5 py-2 font-inter text-sm font-semibold text-ink transition-colors hover:border-ink"
            >
              Home
            </Link>
            <a
              href="https://discord.gg/CkD9QWjsHm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-full bg-clay px-5 py-2 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
            >
              Join Discord
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Volunteer header">
        <Reveal>
          <div className={`${KICKER} mb-4`}>Volunteer · Kujitolea</div>
          <h1 className="mb-4 max-w-[700px] font-newsreader text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink sm:text-[56px]">
            Give a few hours. <span className="italic text-clay">Grow the community.</span>
          </h1>
          <p className="max-w-[560px] font-inter text-[17px] leading-[1.6] text-ink-soft">
            We run on people who show up — helping with events, content, and
            community care. Pick a role that fits your time and skills.
          </p>
        </Reveal>
      </section>

      {/* Available roles */}
      <section className={`${WRAP} py-5`} aria-label="Available roles">
        <Reveal className="grid gap-4 sm:grid-cols-2">
          {VOLUNTEER_ROLES.map((r) => (
            <div
              key={r.value}
              className="rounded-2xl border border-sand bg-paper-card p-5"
            >
              <div className="mb-1.5 flex items-center gap-2">
                <HandHeart className="h-4 w-4 text-clay" />
                <span className="font-inter text-sm font-semibold text-ink">{r.label}</span>
              </div>
              <p className="font-inter text-[13px] leading-[1.5] text-ink-soft">
                {r.description}
              </p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Form */}
      <section className={`${WRAP} py-10`} aria-label="Volunteer application form">
        <Reveal>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name *" error={fieldErrors.name}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="Your full name"
                    className={inputCls(fieldErrors.name)}
                  />
                </Field>
                <Field label="Email *" error={fieldErrors.email}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className={inputCls(fieldErrors.email)}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Phone (optional)">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={20}
                    placeholder="+254 7XX XXX XXX"
                    className={inputCls()}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Volunteer role *" error={fieldErrors.role}>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    className={inputCls(fieldErrors.role)}
                  >
                    <option value="">Select a role...</option>
                    {VOLUNTEER_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Availability *" error={fieldErrors.availability}>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    required
                    className={inputCls(fieldErrors.availability)}
                  >
                    <option value="">Select availability...</option>
                    {AVAILABILITY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Relevant experience * (min 20 chars)" error={fieldErrors.experience}>
                  <textarea
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    required
                    minLength={20}
                    maxLength={2000}
                    rows={4}
                    placeholder="Tell us about your experience relevant to this role..."
                    className={`${inputCls(fieldErrors.experience)} resize-none`}
                  />
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Why do you want to volunteer? * (min 20 chars)" error={fieldErrors.motivation}>
                  <textarea
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    required
                    minLength={20}
                    maxLength={2000}
                    rows={3}
                    placeholder="What excites you about contributing to Claude Community Kenya?"
                    className={`${inputCls(fieldErrors.motivation)} resize-none`}
                  />
                </Field>
              </div>

              <div className="mt-5">
                <div className="mb-3 font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  Social links (optional)
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="LinkedIn">
                    <input
                      type="url"
                      value={linkedIn}
                      onChange={(e) => setLinkedIn(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="GitHub">
                    <input
                      type="url"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      placeholder="https://github.com/..."
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="Twitter / X">
                    <input
                      type="url"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      placeholder="https://twitter.com/..."
                      className={inputCls()}
                    />
                  </Field>
                  <Field label="Portfolio">
                    <input
                      type="url"
                      value={portfolio}
                      onChange={(e) => setPortfolio(e.target.value)}
                      placeholder="https://..."
                      className={inputCls()}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 font-inter text-sm text-red-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
              ) : (
                <><Send className="h-4 w-4" /> Submit application</>
              )}
            </button>
          </form>
        </Reveal>
      </section>
    </>
  );
}
