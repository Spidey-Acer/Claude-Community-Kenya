"use client";

import { useState, useEffect, useTransition, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface HeroEmailCaptureProps {
  label?: string;
  placeholder?: string;
  buttonLabel?: string;
  successMessage?: string;
  className?: string;
}

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Inline email capture for the hero primary slot.
 * Replaces the off-site Discord CTA so we keep the lead instead of pushing
 * it to an external platform before we've ever captured an email.
 */
export function HeroEmailCapture({
  label = "Get event invites + the monthly digest",
  placeholder = "you@email.com",
  buttonLabel = "Get invites",
  successMessage = "You're in. Watch your inbox.",
  className,
}: HeroEmailCaptureProps) {
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
        setMessage(json.message ?? successMessage);
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    });
  }

  return (
    <div className={className}>
      <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#7a7870]">
        {label}
      </p>

      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="card-elevated mx-auto flex max-w-md items-center gap-3 rounded-full px-5 py-3.5"
            role="status"
            aria-live="polite"
          >
            <span
              aria-hidden="true"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d97757] text-[11px] font-bold text-[#faf9f5]"
            >
              ✓
            </span>
            <span className="text-[14px] text-[#faf9f5]">{message}</span>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="mx-auto flex w-full max-w-md flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="hero-email" className="sr-only">
              Email address
            </label>
            <input
              id="hero-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              required
              disabled={isPending}
              autoComplete="email"
              className="min-w-0 flex-1 rounded-full border border-[#2a2a28] bg-[#1e1e1d]/90 px-5 py-3.5 text-[14px] text-[#faf9f5] placeholder:text-[#7a7870] backdrop-blur-sm transition-colors focus:border-[#d97757]/60 focus:outline-none focus:ring-1 focus:ring-[#d97757]/30 disabled:opacity-50"
              aria-label="Email address"
              aria-describedby={status === "error" ? "hero-email-error" : undefined}
            />
            <button
              type="submit"
              disabled={isPending || !csrfToken}
              aria-label={isPending ? "Subscribing, please wait" : "Subscribe for event invites and the monthly digest"}
              className="btn-primary-shadow inline-flex items-center justify-center gap-2 rounded-full bg-[#d97757] px-7 py-3.5 text-[14px] font-semibold text-[#faf9f5] transition-all hover:bg-[#c06848] disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <span
                    aria-hidden="true"
                    className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#faf9f5]/30 border-t-[#faf9f5]"
                  />
                  Sending
                </>
              ) : (
                <>
                  {buttonLabel}
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {status === "error" && (
        <p
          id="hero-email-error"
          role="alert"
          className="mx-auto mt-2 max-w-md text-center text-[12px] text-[#b85a3e]"
        >
          {message}
        </p>
      )}
    </div>
  );
}
