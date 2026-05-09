"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, Loader2, ArrowRight } from "lucide-react";

type Status = "verifying" | "success" | "error";

function VerifyInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<Status>("verifying");
  const [error, setError] = useState<string>("");
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    if (!token) {
      setStatus("error");
      setError("Missing verification token.");
      return;
    }

    (async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token");
        const { csrfToken } = await csrfRes.json();
        const res = await fetch("/api/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({ token }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setStatus("error");
          setError(json.error || "Verification failed.");
          return;
        }
        setStatus("success");
      } catch {
        setStatus("error");
        setError("Network error. Please try again.");
      }
    })();
  }, [token]);

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
        <div className="mb-8 text-center">
          <h1 className="font-mono text-lg font-bold text-green-primary">$ ./verify-email</h1>
        </div>

        <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
          {status === "verifying" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 text-green-primary animate-spin" />
              <p className="font-mono text-sm text-text-dim">Verifying your email...</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-primary mx-auto" />
              <p className="font-mono text-sm text-text-primary">Email verified.</p>
              <p className="font-mono text-xs text-text-dim">
                Thanks for confirming. You&apos;re all set.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 mt-2 bg-green-primary/10 border border-green-primary/40 rounded text-xs font-mono font-semibold text-green-primary hover:bg-green-primary/20 transition-colors"
              >
                Go to dashboard <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-red/10 border border-red/30 rounded text-[11px] font-mono text-red">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              <p className="text-xs font-mono text-text-dim leading-relaxed">
                If your link expired, sign in and request a new verification email from your dashboard.
              </p>
              <Link
                href="/login"
                className="block text-center text-xs font-mono text-green-primary hover:underline"
              >
                Sign in &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary" />}>
      <VerifyInner />
    </Suspense>
  );
}
