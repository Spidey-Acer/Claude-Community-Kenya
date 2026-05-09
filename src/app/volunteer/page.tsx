"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { ScrollReveal } from "@/components/terminal";
import { PersonaHeading } from "@/components/persona/PersonaHeading";
import { PersonaText } from "@/components/persona/PersonaText";
import { HandHeart, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";

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

export default function VolunteerPage() {
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
      <div className="min-h-screen flex items-center justify-center px-4 py-20">
        <ScrollReveal>
          <TerminalWindow title="volunteer-application" variant="command" className="max-w-lg w-full">
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-primary" />
              <h2 className="font-mono text-lg font-bold text-green-primary">Application Submitted!</h2>
              <p className="text-sm font-mono text-text-secondary max-w-sm">
                Thank you for volunteering with Claude Community Kenya. We&apos;ll review your application and get back to you soon.
              </p>
              <div className="flex gap-3 mt-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 border border-green-primary px-4 py-2 font-mono text-sm text-green-primary hover:bg-green-primary hover:text-bg-primary transition-all"
                >
                  &gt; HOME
                </Link>
                <a
                  href="https://discord.gg/CkD9QWjsHm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border border-amber px-4 py-2 font-mono text-sm text-amber hover:bg-amber hover:text-bg-primary transition-all"
                >
                  &gt; JOIN_DISCORD
                </a>
              </div>
            </div>
          </TerminalWindow>
        </ScrollReveal>
      </div>
    );
  }

  const inputClass = "w-full bg-bg-primary border border-border-default rounded px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-dim focus:border-green-primary focus:outline-none transition-colors";
  const labelClass = "text-[11px] font-mono font-semibold text-text-dim uppercase tracking-wider mb-1.5 block";
  const errorClass = "text-[10px] font-mono text-red mt-1";

  return (
    <div className="min-h-screen px-4 py-20">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <ScrollReveal>
          <div className="mb-8">
            <PersonaHeading
              page="volunteer"
              section="hero"
              as="h1"
              className="font-mono text-2xl text-green-primary mb-2"
            />
            <PersonaText
              page="volunteer"
              section="hero"
              field="subtitle"
              className="font-sans text-text-secondary max-w-xl"
            />
          </div>
        </ScrollReveal>

        {/* Available Roles */}
        <ScrollReveal delay={200}>
          <div className="mb-8 grid grid-cols-2 gap-3">
            {VOLUNTEER_ROLES.map((r) => (
              <div
                key={r.value}
                className="border border-border-default bg-bg-card rounded p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <HandHeart className="w-3.5 h-3.5 text-green-primary" />
                  <span className="text-xs font-mono font-semibold text-text-primary">{r.label}</span>
                </div>
                <p className="text-[11px] font-mono text-text-dim">{r.description}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* Form */}
        <ScrollReveal delay={400}>
          <TerminalWindow title="volunteer-application.sh" variant="command">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red/10 border border-red/30 rounded">
                  <AlertCircle className="w-4 h-4 text-red flex-shrink-0" />
                  <span className="text-sm font-mono text-red">{error}</span>
                </div>
              )}

              {/* Name & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="Your full name"
                    className={inputClass}
                  />
                  {fieldErrors.name && <p className={errorClass}>{fieldErrors.name}</p>}
                </div>
                <div>
                  <label className={labelClass}>Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                  {fieldErrors.email && <p className={errorClass}>{fieldErrors.email}</p>}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className={labelClass}>Phone (optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={20}
                  placeholder="+254 7XX XXX XXX"
                  className={inputClass}
                />
              </div>

              {/* Role */}
              <div>
                <label className={labelClass}>Volunteer Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className={inputClass}
                >
                  <option value="">Select a role...</option>
                  {VOLUNTEER_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {fieldErrors.role && <p className={errorClass}>{fieldErrors.role}</p>}
              </div>

              {/* Availability */}
              <div>
                <label className={labelClass}>Availability *</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  required
                  className={inputClass}
                >
                  <option value="">Select availability...</option>
                  {AVAILABILITY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {fieldErrors.availability && <p className={errorClass}>{fieldErrors.availability}</p>}
              </div>

              {/* Experience */}
              <div>
                <label className={labelClass}>Relevant Experience *</label>
                <textarea
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  required
                  minLength={20}
                  maxLength={2000}
                  rows={4}
                  placeholder="Tell us about your experience relevant to this role..."
                  className={inputClass + " resize-none"}
                />
                {fieldErrors.experience && <p className={errorClass}>{fieldErrors.experience}</p>}
              </div>

              {/* Motivation */}
              <div>
                <label className={labelClass}>Why do you want to volunteer? *</label>
                <textarea
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  required
                  minLength={20}
                  maxLength={2000}
                  rows={3}
                  placeholder="What excites you about contributing to Claude Community Kenya?"
                  className={inputClass + " resize-none"}
                />
                {fieldErrors.motivation && <p className={errorClass}>{fieldErrors.motivation}</p>}
              </div>

              {/* Social Links */}
              <div>
                <div className="text-[11px] font-mono font-semibold text-text-dim uppercase tracking-wider mb-3">
                  Social Links (optional)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono text-text-dim mb-1 block">LinkedIn</label>
                    <input
                      type="url"
                      value={linkedIn}
                      onChange={(e) => setLinkedIn(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-text-dim mb-1 block">GitHub</label>
                    <input
                      type="url"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      placeholder="https://github.com/..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-text-dim mb-1 block">Twitter / X</label>
                    <input
                      type="url"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      placeholder="https://twitter.com/..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-text-dim mb-1 block">Portfolio</label>
                    <input
                      type="url"
                      value={portfolio}
                      onChange={(e) => setPortfolio(e.target.value)}
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 border border-green-primary px-5 py-3 font-mono text-sm font-bold text-green-primary hover:bg-green-primary hover:text-bg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    &gt; SUBMIT_APPLICATION
                  </>
                )}
              </button>
            </form>
          </TerminalWindow>
        </ScrollReveal>
      </div>
    </div>
  );
}
