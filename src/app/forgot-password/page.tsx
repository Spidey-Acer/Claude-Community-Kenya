"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { useSkin } from "@/contexts/SkinContext";

export default function ForgotPasswordPage() {
  const { skin } = useSkin();
  const isPro = skin === "pro";
  const [csrfToken, setCsrfToken] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {});
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({ email }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || "Something went wrong. Try again.");
          return;
        }
        setSubmitted(true);
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  function handleResend() {
    setSubmitted(false);
    setError(null);
  }

  // ─── Pro / Glassmorphism variant ─────────────────────────────────────────
  if (isPro) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 60% 40% at 50% -10%, rgba(217, 119, 87, 0.08), transparent 60%),
              radial-gradient(ellipse 40% 40% at 90% 80%, rgba(106, 155, 204, 0.05), transparent 65%)
            `,
          }}
        />

        <div className="relative w-full max-w-md">
          <div className="mb-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-[13px] text-[#7a7870] transition-colors hover:text-[#e8e6dc]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </div>

          <div className="mb-8 text-center">
            <h1
              className="text-[32px] font-medium text-[#faf9f5] sm:text-[40px]"
              style={{
                fontFamily: "var(--font-display), ui-serif, Georgia, serif",
                letterSpacing: "-0.025em",
              }}
            >
              Reset your password
            </h1>
            <p className="mt-2 text-[14px] text-[#b0aea5]">
              We&apos;ll email you a reset link.
            </p>
          </div>

          <div className="card-elevated rounded-2xl p-7">
            {submitted ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#d97757]/10 ring-1 ring-[#d97757]/20">
                  <CheckCircle2 className="h-6 w-6 text-[#d97757]" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-[#faf9f5]">Check your email</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#b0aea5]">
                    We sent a reset link to{" "}
                    <span className="text-[#faf9f5]">{email}</span>. It expires in 60 minutes.
                  </p>
                </div>
                <p className="text-[13px] text-[#7a7870]">
                  Didn&apos;t get one?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    className="link-refined text-[#d97757] underline decoration-[#d97757]/40 underline-offset-2 hover:decoration-[#d97757]"
                  >
                    Resend
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="forgot-email-pro"
                    className="mb-1.5 block text-[12px] font-medium text-[#b0aea5]"
                  >
                    <Mail className="mr-1.5 inline h-3.5 w-3.5" />
                    Email
                  </label>
                  <input
                    id="forgot-email-pro"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full rounded-lg border border-[#2a2a28] bg-[#1e1e1d]/80 px-3.5 py-2.5 text-[14px] text-[#faf9f5] placeholder:text-[#7a7870] transition-colors focus:border-[#d97757]/60 focus:outline-none focus:ring-1 focus:ring-[#d97757]/30"
                    placeholder="you@email.com"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-lg border border-[#b85a3e]/30 bg-[#b85a3e]/10 p-3 text-[12px] text-[#e89576]"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending || !csrfToken}
                  className="btn-primary-shadow flex w-full items-center justify-center gap-2 rounded-full bg-[#d97757] px-5 py-3 text-[14px] font-semibold text-[#faf9f5] transition-all hover:bg-[#c06848] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      Send reset link <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <p className="mt-5 text-center text-[13px] text-[#b0aea5]">
            <Link
              href="/login"
              className="link-refined text-[#d97757] underline decoration-[#d97757]/40 underline-offset-2 hover:decoration-[#d97757]"
            >
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ─── Dev / Terminal Noir variant ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#00ff41 1px, transparent 1px), linear-gradient(90deg, #00ff41 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-text-dim hover:text-green-primary transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> back to sign in
          </Link>
        </div>

        <div className="mb-8 text-center">
          <h1 className="font-mono text-lg font-bold text-green-primary">$ ./reset-password</h1>
          <p className="mt-1 text-xs font-mono text-text-dim">
            Enter your email and we&apos;ll send you a reset link
          </p>
        </div>

        <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
          {submitted ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-primary mx-auto" />
              <p className="font-mono text-sm text-text-primary">
                If an account exists for that email, a reset link has been sent.
              </p>
              <p className="font-mono text-xs text-text-dim leading-relaxed">
                Check your inbox (and spam folder). The link expires in 60 minutes.
              </p>
              <Link
                href="/login"
                className="inline-block mt-2 text-xs font-mono text-green-primary hover:underline"
              >
                $ cd /login &rarr;
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="block text-[11px] font-mono text-text-dim mb-1.5"
                >
                  <Mail className="w-3 h-3 inline mr-1.5" />
                  Email
                </label>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full bg-bg-card border border-border-default rounded px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 focus:ring-1 focus:ring-green-primary/20 transition-colors"
                  placeholder="you@email.com"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red/10 border border-red/30 rounded text-[11px] font-mono text-red">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending || !csrfToken}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-primary/10 hover:bg-green-primary/20 border border-green-primary/40 hover:border-green-primary/60 rounded text-sm font-mono font-semibold text-green-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
