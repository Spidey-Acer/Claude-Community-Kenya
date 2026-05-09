"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
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
