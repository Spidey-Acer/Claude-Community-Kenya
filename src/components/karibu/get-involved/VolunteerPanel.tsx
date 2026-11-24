"use client";

/**
 * VolunteerPanel — volunteer application panel on /get-involved.
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
import { BTN_OUTLINE, BTN_PRIMARY, Field, INPUT, INPUT_INVALID, Masthead, NewTabNote } from "@/components/karibu/kit";
import { KaribuSelect } from "@/components/karibu/KaribuSelect";
import {
  VOLUNTEER_ROLES,
  VOLUNTEER_CITIES,
  VOLUNTEER_AVAILABILITY_OPTIONS,
} from "@/lib/volunteer-roles";

const WRAP = "mx-auto max-w-[880px] px-6 md:px-10";
const GROUP_LABEL = "mb-1.5 font-inter text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted";

const CITY_OPTIONS = VOLUNTEER_CITIES.map((c) => ({ value: c, label: c }));

const CONTROL = `${INPUT} ${INPUT_INVALID}`;

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
      <span className={`font-inter text-[11px] ${nearLimit ? "text-error" : "text-ink-muted"}`}>
        {value.length} / {max}
      </span>
    </div>
  );
}

export function VolunteerPanel() {
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
              className={BTN_OUTLINE}
            >
              Home
            </Link>
            <a
              href="https://discord.gg/CkD9QWjsHm"
              target="_blank"
              rel="noopener noreferrer"
              className={BTN_PRIMARY}
            >
              Join Discord
              <NewTabNote />
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
        <Masthead
          flush
          eyebrow="Volunteer"
          title={
            <>
              Give a few hours. <span className="italic text-clay">Grow the community.</span>
            </>
          }
          lead="We run on people who show up: helping with events, content, and community care. Pick a role that fits your time and skills."
        />
      </section>

      {/* Form */}
      <section className={`${WRAP} py-10`} aria-label="Volunteer application form">
        <Reveal>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-2xl border border-sand bg-paper-card p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" error={fieldErrors.name}>
                  {(fieldProps) => (
                    <input
                      {...fieldProps}
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="Your full name"
                      className={CONTROL}
                    />
                  )}
                </Field>
                <Field label="Email" error={fieldErrors.email}>
                  {(fieldProps) => (
                    <input
                      {...fieldProps}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className={CONTROL}
                    />
                  )}
                </Field>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Phone (optional)">
                  {(fieldProps) => (
                    <input
                      {...fieldProps}
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      maxLength={20}
                      placeholder="+254 7XX XXX XXX"
                      className={CONTROL}
                    />
                  )}
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
                  Volunteer role
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
                        className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border p-4 pl-5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay has-[:focus-visible]:ring-offset-2 motion-reduce:transition-none ${
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
                          className={`absolute left-2 top-[1.35rem] h-1.5 w-1.5 rounded-full ${
                            checked ? "bg-clay" : "border border-clay/40"
                          }`}
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
                  Availability
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
                        className={`min-h-11 rounded-full border px-3.5 py-1.5 font-inter text-[13px] font-medium transition-colors motion-reduce:transition-none ${
                          selected
                            ? "border-clay bg-paper-card font-semibold text-clay"
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
                  label="Relevant experience"
                  hint="At least 20 characters. What have you done that prepares you for this role?"
                  error={fieldErrors.experience}
                >
                  {(fieldProps) => (
                    <>
                      <textarea
                        {...fieldProps}
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        required
                        minLength={20}
                        maxLength={2000}
                        rows={4}
                        placeholder="Tell us what you've done that's relevant..."
                        className={`${CONTROL} resize-none`}
                      />
                      <CharCount value={experience} max={2000} />
                    </>
                  )}
                </Field>
              </div>

              <div className="mt-4">
                <Field
                  label="Why volunteer?"
                  hint="At least 20 characters. What do you want to get out of it, and why CCK?"
                  error={fieldErrors.motivation}
                >
                  {(fieldProps) => (
                    <>
                      <textarea
                        {...fieldProps}
                        value={motivation}
                        onChange={(e) => setMotivation(e.target.value)}
                        required
                        minLength={20}
                        maxLength={2000}
                        rows={3}
                        placeholder="What excites you about contributing to Claude Community Kenya?"
                        className={`${CONTROL} resize-none`}
                      />
                      <CharCount value={motivation} max={2000} />
                    </>
                  )}
                </Field>
              </div>

              <div className="mt-5">
                <div className={`${GROUP_LABEL} mb-3`}>Links (optional)</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="LinkedIn">
                  {(fieldProps) => (
                    <input
                      {...fieldProps}
                      type="text"
                      inputMode="url"
                      value={linkedIn}
                      onChange={(e) => setLinkedIn(e.target.value)}
                      placeholder="linkedin.com/in/yourname"
                      className={CONTROL}
                    />
                  )}
                </Field>
                  <Field label="GitHub">
                  {(fieldProps) => (
                    <input
                      {...fieldProps}
                      type="text"
                      inputMode="url"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      placeholder="github.com/yourname"
                      className={CONTROL}
                    />
                  )}
                </Field>
                  <Field label="Twitter / X">
                  {(fieldProps) => (
                    <input
                      {...fieldProps}
                      type="text"
                      inputMode="url"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      placeholder="x.com/yourname"
                      className={CONTROL}
                    />
                  )}
                </Field>
                  <Field label="Portfolio">
                  {(fieldProps) => (
                    <input
                      {...fieldProps}
                      type="text"
                      inputMode="url"
                      value={portfolio}
                      onChange={(e) => setPortfolio(e.target.value)}
                      placeholder="yoursite.com"
                      className={CONTROL}
                    />
                  )}
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
              className={`${BTN_PRIMARY} w-full disabled:cursor-not-allowed disabled:opacity-50`}
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
