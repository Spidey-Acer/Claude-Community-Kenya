"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Lock, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [csrfToken, setCsrfToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
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

    if (!token) {
      setError("Missing or invalid reset token.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({ token, password }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || "Failed to reset password.");
          return;
        }
        setSuccess(true);
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
          <h1 className="font-mono text-lg font-bold text-green-primary">$ ./set-new-password</h1>
          <p className="mt-1 text-xs font-mono text-text-dim">
            Choose a new password for your account
          </p>
        </div>

        <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
          {success ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-primary mx-auto" />
              <p className="font-mono text-sm text-text-primary">
                Password updated.
              </p>
              <Link
                href="/login"
                className="inline-block px-4 py-2 mt-2 bg-green-primary/10 border border-green-primary/40 rounded text-xs font-mono font-semibold text-green-primary hover:bg-green-primary/20 transition-colors"
              >
                Sign in &rarr;
              </Link>
            </div>
          ) : !token ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-red/10 border border-red/30 rounded text-[11px] font-mono text-red">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Missing reset token. Request a new link.
              </div>
              <Link
                href="/forgot-password"
                className="block text-center text-xs font-mono text-green-primary hover:underline"
              >
                Request a new reset link &rarr;
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-password"
                  className="block text-[11px] font-mono text-text-dim mb-1.5"
                >
                  <Lock className="w-3 h-3 inline mr-1.5" />
                  New password
                </label>
                <input
                  id="reset-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-bg-card border border-border-default rounded px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 focus:ring-1 focus:ring-green-primary/20 transition-colors"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="reset-confirm"
                  className="block text-[11px] font-mono text-text-dim mb-1.5"
                >
                  <Lock className="w-3 h-3 inline mr-1.5" />
                  Confirm password
                </label>
                <input
                  id="reset-confirm"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-bg-card border border-border-default rounded px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 focus:ring-1 focus:ring-green-primary/20 transition-colors"
                  placeholder="Type it again"
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
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary" />}>
      <ResetPasswordInner />
    </Suspense>
  );
}
