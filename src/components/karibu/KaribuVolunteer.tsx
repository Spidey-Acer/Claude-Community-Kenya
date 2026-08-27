"use client";

/**
 * KaribuVolunteer — warm-light volunteer application page.
 *
 * Same submission contract as the Terminal Noir VolunteerPage (CSRF token via
 * /api/csrf-token, POST /api/volunteer/apply, field-level errors, success
 * screen) — only the styling differs. The dark version stays until the
 * persona cleanup PR removes it.
 *
 * Role source of truth: src/lib/volunteer-roles.ts.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Send, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { KaribuSelect } from "@/components/karibu/KaribuSelect";
import {
  VOLUNTEER_ROLES,
  VOLUNTEER_CITIES,
  VOLUNTEER_AVAILABILITY_OPTIONS,
} from "@/lib/volunteer-roles";

const WRAP = "mx-auto max-w-[880px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";
const GROUP_LABEL = "mb-1.5 font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted";

const CITY_OPTIONS = VOLUNTEER_CITIES.map((c) => ({ value: c, label: c }));

const inputCls = (hasError?: string) =>
  `w-full rounded-lg border ${
    hasError ? "border-error/60" : "border-sand-2"
  } bg-paper px-3 py-2.5 font-inter text-sm text-ink placeholder:text-ink-muted/70 transition-colors focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20`;

function Field({
  id,
  label,
  error,
  helper,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={GROUP_LABEL}>
        {label}
      </label>
      {helper && <p className="mb-1.5 font-inter text-[12px] text-ink-soft">{helper}</p>}
      {children}
      {error && <FieldError id={`${id}-error`} msg={error} />}
    </div>
  );
}

function FieldError({ id, msg }: { id?: string; msg: string }) {
  return (
    <p id={id} role="alert" className="mt-1 font-inter text-[11px] text-error">
      {msg}
    </p>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  const nearLimit = value.length > max * 0.9;
  return (
    <div className="mt-1 flex justify-end">
      <span className={`font-inter text-[11px] ${nearLimit ? "text-amber-600" : "text-ink-muted"}`}>
        {value.length} / {max}
      </span>
    </div>
  );
}

export function KaribuVolunteer() {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [availabilitySelections, setAvailabilitySelections] = useState<string[]>([]);
  const [motivation, setMotivation] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [github, setGithub] = useState("");
  const [twitter, setTwitter] = useState("");
  const [portfolio, setPortfolio] = useState("");

  useEffect(() => {
    if (success) successHeadingRef.current?.focus();
  }, [success]);

  function toggleAvailability(opt: string) {
    setAvailabilitySelections((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const manualErrors: Record<string, string> = {};
    if (!role) manualErrors.role = "Select a volunteer role";
    if (availabilitySelections.length === 0) {
      manualErrors.availability = "Select at least one availability option";
    }

    if (Object.keys(manualErrors).length > 0) {
      setFieldErrors(manualErrors);
      setError("Please fix the errors below");
      return;
    }

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
            city: city || undefined,
            role,
            experience,
            availability: availabilitySelections.join(", "),
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
      <section className={`${WRAP} py-24`} aria-label="Application submitted" role="status" aria-live="polite">
        <div className="mx-auto max-w-lg rounded-2xl border border-sand bg-paper-card py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-clay/10 text-clay">
            <CheckCircle className="h-7 w-7" />
          </div>
          <h1
            ref={successHeadingRef}
            tabIndex={-1}
            className="mb-2 font-newsreader text-[22px] text-ink outline-none"
          >
            Application submitted
          </h1>
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
          <div className={`${KICKER} mb-4`}>Volunteer</div>
          <h1 className="mb-4 max-w-[700px] font-newsreader text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink sm:text-[56px]">
            Give a few hours. <span className="italic text-clay">Grow the community.</span>
          </h1>
          <p className="max-w-[560px] font-inter text-[17px] leading-[1.6] text-ink-soft">
            We run on people who show up — helping with events, content, and
            community care. Pick a role that fits your time and skills.
          </p>
        </Reveal>
      </section>

      {/* Form */}
      <section className={`${WRAP} py-10`} aria-label="Volunteer application form">
        <Reveal>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="name" label="Name *" error={fieldErrors.name}>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    aria-required="true"
                    aria-invalid={!!fieldErrors.name}
                    aria-describedby={fieldErrors.name ? "name-error" : undefined}
                    minLength={2}
                    maxLength={100}
                    placeholder="Your full name"
                    className={inputCls(fieldErrors.name)}
                  />
                </Field>
                <Field id="email" label="Email *" error={fieldErrors.email}>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    aria-required="true"
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                    placeholder="you@example.com"
                    className={inputCls(fieldErrors.email)}
                  />
                </Field>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field id="phone" label="Phone (optional)">
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={20}
                    placeholder="+254 7XX XXX XXX"
                    className={inputCls()}
                  />
                </Field>
                <KaribuSelect
                  id="city"
                  label="City (optional)"
                  value={city}
                  onChange={setCity}
                  options={CITY_OPTIONS}
                  placeholder="Select a city..."
                  error={fieldErrors.city}
                />
              </div>

              {/* Role picker */}
              <div className="mt-5">
                <div id="role-group-label" className={GROUP_LABEL}>
                  Volunteer role *
                </div>
                <div
                  role="radiogroup"
                  aria-labelledby="role-group-label"
                  aria-required="true"
                  aria-invalid={!!fieldErrors.role}
                  aria-describedby={fieldErrors.role ? "role-error" : undefined}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  {VOLUNTEER_ROLES.map((r) => {
                    const checked = role === r.value;
                    return (
                      <label
                        key={r.value}
                        className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border p-4 pl-5 transition-colors motion-reduce:transition-none ${
                          checked ? "border-clay bg-clay/5" : "border-sand-2 hover:border-clay/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={r.value}
                          checked={checked}
                          onChange={() => setRole(r.value)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className="absolute left-2 top-[1.35rem] h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: checked ? r.color : "transparent",
                            boxShadow: checked ? "none" : `inset 0 0 0 1.5px ${r.color}66`,
                          }}
                        />
                        <span className="font-inter text-sm font-semibold text-ink">{r.label}</span>
                        <span className="font-inter text-[12px] leading-[1.5] text-ink-soft">
                          {r.description}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {fieldErrors.role && <FieldError id="role-error" msg={fieldErrors.role} />}
              </div>

              {/* Availability */}
              <div className="mt-5">
                <div id="availability-group-label" className={GROUP_LABEL}>
                  Availability *
                </div>
                <div
                  role="group"
                  aria-labelledby="availability-group-label"
                  aria-describedby={fieldErrors.availability ? "availability-error" : undefined}
                  className="flex flex-wrap gap-2"
                >
                  {VOLUNTEER_AVAILABILITY_OPTIONS.map((opt) => {
                    const selected = availabilitySelections.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => toggleAvailability(opt)}
                        className={`rounded-full border px-3.5 py-1.5 font-inter text-[13px] font-medium transition-colors motion-reduce:transition-none ${
                          selected
                            ? "border-clay bg-clay/10 text-clay"
                            : "border-sand-2 text-ink-soft hover:border-clay/50"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.availability && (
                  <FieldError id="availability-error" msg={fieldErrors.availability} />
                )}
              </div>

              <div className="mt-5">
                <Field
                  id="experience"
                  label="Relevant experience * (min 20 chars)"
                  helper="What have you done that prepares you for this role?"
                  error={fieldErrors.experience}
                >
                  <textarea
                    id="experience"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    required
                    aria-required="true"
                    aria-invalid={!!fieldErrors.experience}
                    aria-describedby={fieldErrors.experience ? "experience-error" : undefined}
                    minLength={20}
                    maxLength={2000}
                    rows={4}
                    placeholder="Tell us what you've done that's relevant..."
                    className={`${inputCls(fieldErrors.experience)} resize-none`}
                  />
                  <CharCount value={experience} max={2000} />
                </Field>
              </div>

              <div className="mt-4">
                <Field
                  id="motivation"
                  label="Why volunteer? * (min 20 chars)"
                  helper="What do you want to get out of it, and why CCK?"
                  error={fieldErrors.motivation}
                >
                  <textarea
                    id="motivation"
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    required
                    aria-required="true"
                    aria-invalid={!!fieldErrors.motivation}
                    aria-describedby={fieldErrors.motivation ? "motivation-error" : undefined}
                    minLength={20}
                    maxLength={2000}
                    rows={3}
                    placeholder="What excites you about contributing to Claude Community Kenya?"
                    className={`${inputCls(fieldErrors.motivation)} resize-none`}
                  />
                  <CharCount value={motivation} max={2000} />
                </Field>
              </div>

              <div className="mt-5">
                <div className={`${GROUP_LABEL} mb-3`}>Links (optional)</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field id="linkedIn" label="LinkedIn">
                    <input
                      id="linkedIn"
                      type="text"
                      inputMode="url"
                      value={linkedIn}
                      onChange={(e) => setLinkedIn(e.target.value)}
                      placeholder="linkedin.com/in/yourname"
                      className={inputCls()}
                    />
                  </Field>
                  <Field id="github" label="GitHub">
                    <input
                      id="github"
                      type="text"
                      inputMode="url"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      placeholder="github.com/yourname"
                      className={inputCls()}
                    />
                  </Field>
                  <Field id="twitter" label="Twitter / X">
                    <input
                      id="twitter"
                      type="text"
                      inputMode="url"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      placeholder="x.com/yourname"
                      className={inputCls()}
                    />
                  </Field>
                  <Field id="portfolio" label="Portfolio">
                    <input
                      id="portfolio"
                      type="text"
                      inputMode="url"
                      value={portfolio}
                      onChange={(e) => setPortfolio(e.target.value)}
                      placeholder="yoursite.com"
                      className={inputCls()}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-error/30 bg-error/10 p-4 font-inter text-sm text-error"
              >
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
