"use client";

/**
 * KaribuNewsletterForm: the footer's email sign-up. Posts to the existing
 * `/api/newsletter` route exactly as the legacy footer does (CSRF token from
 * `/api/csrf-token` in the `x-csrf-token` header, JSON `{ email }`), restyled
 * for the always-dark footer. Server validation and rate limiting are unchanged.
 */

import { useEffect, useState, useTransition, type FormEvent } from "react";

type Status = "idle" | "success" | "error";

export function KaribuNewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [csrfToken, setCsrfToken] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((res) => res.json())
      .then((json: { csrfToken?: string }) => setCsrfToken(json.csrfToken ?? ""))
      .catch(() => setStatus("idle"));
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus("idle");
    startTransition(async () => {
      try {
        const res = await fetch("/api/newsletter", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({ email }),
        });
        const json = (await res.json()) as { message?: string; error?: string };
        if (!res.ok) {
          setStatus("error");
          setMessage(json.error || "Failed to subscribe.");
          return;
        }
        setStatus("success");
        setMessage(json.message ?? "You're subscribed!");
        setEmail("");
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Newsletter sign-up">
      <label htmlFor="footer-newsletter-email" className="mb-2 block font-inter text-[14.5px] text-footer-text-soft">
        Community updates by email
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="footer-newsletter-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-h-11 w-full rounded-full border border-footer-border bg-transparent px-4 font-inter text-sm text-footer-text placeholder:text-footer-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-footer-accent sm:max-w-[320px]"
        />
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 rounded-full bg-footer-accent-bg px-6 font-inter text-sm font-semibold text-footer-cta-text transition-colors hover:bg-footer-accent-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-footer-accent disabled:opacity-60"
        >
          {isPending ? "Subscribing..." : "Subscribe"}
        </button>
      </div>
      <p role="status" className="mt-2 min-h-5 font-inter text-[13px] text-footer-text-soft">
        {status === "idle" ? "" : message}
      </p>
    </form>
  );
}
