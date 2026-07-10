"use client";

/**
 * KaribuNewsletter — warm-light "Newsletter" page for the Karibu identity.
 *
 * Preserves the existing subscribe capability (POST /api/newsletter with a
 * CSRF token) and the past-issues list, restyled to match KaribuLearn.tsx.
 */

import { useEffect, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { NewsletterIssueView } from "@/lib/data";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

/** Formats a date string as "May 2026" */
function formatIssueMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Pads an issue number to 2 digits: 3 → "03" */
function padIssueNumber(n: number): string {
  return String(n).padStart(2, "0");
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -6% 0px" }}
      transition={{ duration: 0.6, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Warm-light subscribe form — same /api/newsletter + CSRF flow as HeroEmailCapture. */
function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {});
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("idle");

    startTransition(async () => {
      try {
        const res = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({ email }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setStatus("error");
          setMessage(json.error ?? "Couldn't subscribe — try again.");
          return;
        }
        setStatus("success");
        setMessage(json.message ?? "You're in. Watch your inbox.");
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-md">
      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-3 rounded-full border border-sand bg-paper-card px-5 py-3.5"
            role="status"
            aria-live="polite"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-clay text-[11px] font-bold text-paper-card"
            >
              ✓
            </span>
            <span className="font-inter text-sm text-ink">{message}</span>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex w-full flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
              disabled={isPending}
              autoComplete="email"
              aria-label="Email address"
              aria-describedby={status === "error" ? "newsletter-email-error" : undefined}
              className="min-w-0 flex-1 rounded-lg border border-sand-2 bg-paper px-3 py-2.5 font-inter text-sm text-ink focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isPending || !csrfToken}
              aria-label={isPending ? "Subscribing, please wait" : "Subscribe to the newsletter"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-clay px-7 py-3.5 font-inter text-[15px] font-semibold text-paper-card transition-colors hover:bg-clay-dark disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <span
                    aria-hidden="true"
                    className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-paper-card/30 border-t-paper-card"
                  />
                  Sending
                </>
              ) : (
                <>
                  Subscribe
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {status === "error" && (
        <p
          id="newsletter-email-error"
          role="alert"
          className="mt-2 text-center font-inter text-xs text-clay"
        >
          {message}
        </p>
      )}
    </div>
  );
}

export function KaribuNewsletter({ issues }: { issues: readonly NewsletterIssueView[] }) {
  return (
    <>
      {/* Header + subscribe */}
      <section className={`${WRAP} pb-10 pt-16 text-center`} aria-label="Newsletter header">
        <Reveal>
          <div className={`${KICKER} mb-4 flex items-center justify-center gap-2`}>
            <span>Newsletter · Jarida</span>
            {issues.length > 0 && (
              <span className="rounded-full bg-clay/10 px-2 py-0.5 text-[10px] font-semibold text-clay">
                {issues.length} issue{issues.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <h1 className="mx-auto mb-4 max-w-[720px] font-newsreader text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink sm:text-[56px]">
            The <span className="italic text-clay">CCK Newsletter</span>
          </h1>
          <p className="mx-auto mb-8 max-w-[560px] font-inter text-[17px] leading-[1.6] text-ink-soft">
            Claude tips, community projects, event recaps, and what&apos;s
            shipping in the Kenyan AI scene — delivered monthly.
          </p>
          <SubscribeForm />
        </Reveal>
      </section>

      {/* Past issues */}
      <section className={`${WRAP} py-10`} aria-label="Past issues">
        <Reveal>
          <div className={`${KICKER} mb-6`}>Past Issues</div>

          {issues.length === 0 ? (
            <div className="rounded-2xl border border-sand bg-paper-card p-10 text-center">
              <p className="mb-2 font-newsreader text-xl text-ink">First issue ships soon.</p>
              <p className="font-inter text-sm text-ink-muted">
                Subscribe above and you&apos;ll be the first to read it.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4" role="list">
              {issues.map((issue) => (
                <li key={issue.slug}>
                  <Link
                    href={`/newsletter/${issue.slug}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-sand bg-paper-card p-7 transition-colors hover:border-clay sm:flex-row sm:items-start sm:justify-between sm:gap-6"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex items-center gap-3">
                        <span className="font-mono text-xs text-clay">
                          {padIssueNumber(issue.number)}
                        </span>
                        <span className="font-inter text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                          {formatIssueMonth(issue.publishedAt)}
                        </span>
                      </div>
                      <h2 className="mb-2 font-newsreader text-[24px] text-ink group-hover:text-clay">
                        {issue.title}
                      </h2>
                      <p className="line-clamp-2 font-inter text-[14.5px] leading-[1.55] text-ink-soft">
                        {issue.excerpt}
                      </p>
                    </div>
                    <span className="mt-1 shrink-0 font-inter text-sm font-semibold text-clay group-hover:underline">
                      Read →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Reveal>
      </section>
    </>
  );
}
