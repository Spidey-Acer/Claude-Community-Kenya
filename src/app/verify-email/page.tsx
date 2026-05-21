"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { useSkin } from "@/contexts/SkinContext";

type Status = "verifying" | "success" | "error";

function VerifyInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { skin } = useSkin();
  const isPro = skin === "pro";
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

  // ─── Pro / Glassmorphism variant ─────────────────────────────────────────
  if (isPro) {
    const proTitle =
      status === "verifying"
        ? "Verifying your email…"
        : status === "success"
          ? "Email verified"
          : "Verification failed";

    const proSubtitle =
      status === "verifying"
        ? "Hold on while we confirm your address."
        : status === "success"
          ? "Thanks for confirming. You’re all set."
          : "Something went wrong with the link.";

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
          <div className="mb-8 text-center">
            <h1
              className="text-[32px] font-medium text-[#faf9f5] sm:text-[40px]"
              style={{
                fontFamily: "var(--font-display), ui-serif, Georgia, serif",
                letterSpacing: "-0.025em",
              }}
            >
              {proTitle}
            </h1>
            <p className="mt-2 text-[14px] text-[#b0aea5]">{proSubtitle}</p>
          </div>

          <div className="card-elevated rounded-2xl p-7">
            {status === "verifying" && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#d97757]/10 ring-1 ring-[#d97757]/20">
                  <Loader2 className="h-6 w-6 animate-spin text-[#d97757]" />
                </div>
                <p className="text-[14px] text-[#b0aea5]">Confirming your email address…</p>
              </div>
            )}

            {status === "success" && (
              <div className="flex flex-col items-center gap-5 py-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d97757]/10 ring-1 ring-[#d97757]/20">
                  <CheckCircle2 className="h-7 w-7 text-[#d97757]" />
                </div>
                <div>
                  <p className="text-[15px] font-medium text-[#faf9f5]">You&apos;re all set.</p>
                  <p className="mt-1 text-[13px] text-[#b0aea5]">
                    Your email address has been confirmed.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="btn-primary-shadow inline-flex items-center gap-2 rounded-full bg-[#d97757] px-5 py-2.5 text-[14px] font-semibold text-[#faf9f5] transition-all hover:bg-[#c06848]"
                >
                  Go to dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-5">
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-[#b85a3e]/30 bg-[#b85a3e]/10 p-3.5 text-[12px] text-[#e89576]"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <p className="text-[13px] leading-relaxed text-[#7a7870]">
                  If your link expired, sign in and request a new verification email from your
                  dashboard.
                </p>
                <Link
                  href="/login"
                  className="block text-center text-[13px] text-[#d97757] underline decoration-[#d97757]/40 underline-offset-2 hover:decoration-[#d97757]"
                >
                  Sign in →
                </Link>
              </div>
            )}
          </div>
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
