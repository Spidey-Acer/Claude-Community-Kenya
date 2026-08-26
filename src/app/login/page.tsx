"use client";

import { useState, useTransition, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";
import { useSkin } from "@/contexts/SkinContext";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MODERATOR"]);

/** Only trust same-origin relative callback paths — never full https:// URLs. */
function safeCallbackPath(raw: string | null): string | null {
  if (!raw) return null;
  try {
    // NextAuth sometimes encodes a full URL — extract just the pathname+search
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return url.pathname + url.search;
  } catch {
    // Already a relative path like "/admin"
    return raw.startsWith("/") ? raw : null;
  }
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl");
  const { status, data: session } = useSession();
  const { skin } = useSkin();
  const isPro = skin === "pro";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Redirect when session is confirmed. Uses router.replace to avoid adding a
  // history entry and to stay within the SPA navigation model (no full reload).
  useEffect(() => {
    if (status !== "authenticated") return;
    const role = (session?.user as { role?: string } | undefined)?.role;
    const safePath = safeCallbackPath(rawCallback);
    const dest = safePath ?? (role && ADMIN_ROLES.has(role) ? "/admin" : "/dashboard");
    router.replace(dest);
  }, [status, session, rawCallback, router]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const password = form.get("password") as string;

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }
      // router.refresh() updates server components and triggers a session
      // re-read — the useEffect above then fires and does the redirect.
      router.refresh();
    });
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
              href="/"
              className="inline-flex items-center gap-1.5 text-[13px] text-[#7a7870] transition-colors hover:text-[#e8e6dc]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
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
              Welcome back
            </h1>
            <p className="mt-2 text-[14px] text-[#b0aea5]">
              Sign in to your Claude Community Kenya account.
            </p>
          </div>

          <div className="card-elevated rounded-2xl p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="login-email-pro"
                  className="mb-1.5 block text-[12px] font-medium text-[#b0aea5]"
                >
                  <Mail className="mr-1.5 inline h-3.5 w-3.5" />
                  Email
                </label>
                <input
                  id="login-email-pro"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-[#2a2a28] bg-[#1e1e1d]/80 px-3.5 py-2.5 text-[14px] text-[#faf9f5] placeholder:text-[#7a7870] transition-colors focus:border-[#d97757]/60 focus:outline-none focus:ring-1 focus:ring-[#d97757]/30"
                  placeholder="you@email.com"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password-pro"
                  className="mb-1.5 block text-[12px] font-medium text-[#b0aea5]"
                >
                  <Lock className="mr-1.5 inline h-3.5 w-3.5" />
                  Password
                </label>
                <input
                  id="login-password-pro"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-[#2a2a28] bg-[#1e1e1d]/80 px-3.5 py-2.5 text-[14px] text-[#faf9f5] placeholder:text-[#7a7870] transition-colors focus:border-[#d97757]/60 focus:outline-none focus:ring-1 focus:ring-[#d97757]/30"
                  placeholder="••••••••"
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
                disabled={isPending}
                className="btn-primary-shadow flex w-full items-center justify-center gap-2 rounded-full bg-[#d97757] px-5 py-3 text-[14px] font-semibold text-[#faf9f5] transition-all hover:bg-[#c06848] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in <span aria-hidden="true">→</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1">
                <Link
                  href="/forgot-password"
                  className="link-refined text-[13px] text-[#d97757] underline decoration-[#d97757]/40 underline-offset-2 hover:decoration-[#d97757]"
                >
                  Forgot password?
                </Link>
                <Link
                  href="/signup"
                  className="link-refined text-[13px] text-[#d97757] underline decoration-[#d97757]/40 underline-offset-2 hover:decoration-[#d97757]"
                >
                  New here? Create account
                </Link>
              </div>
            </form>
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
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-text-dim hover:text-green-primary transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> back to home
          </Link>
        </div>

        <div className="mb-8 text-center">
          <h1 className="font-mono text-lg font-bold text-green-primary">$ ./signin</h1>
          <p className="mt-1 text-xs font-mono text-text-dim">
            Welcome back to Claude Community Kenya
          </p>
        </div>

        <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-green-primary" />
              <h2 className="text-sm font-mono font-semibold text-text-primary">Sign In</h2>
            </div>
            <p className="text-xs font-mono text-text-dim pl-6">
              Use the email you registered with
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-[11px] font-mono text-text-dim mb-1.5"
              >
                <Mail className="w-3 h-3 inline mr-1.5" />
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full bg-bg-card border border-border-default rounded px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 focus:ring-1 focus:ring-green-primary/20 transition-colors"
                placeholder="you@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-[11px] font-mono text-text-dim mb-1.5"
              >
                <Lock className="w-3 h-3 inline mr-1.5" />
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full bg-bg-card border border-border-default rounded px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 focus:ring-1 focus:ring-green-primary/20 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div role="alert" className="flex items-center gap-2 p-3 bg-red/10 border border-red/30 rounded text-[11px] font-mono text-red">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-primary/10 hover:bg-green-primary/20 border border-green-primary/40 hover:border-green-primary/60 rounded text-sm font-mono font-semibold text-green-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>

            <Link
              href="/forgot-password"
              className="block text-center text-[11px] font-mono text-text-dim hover:text-green-primary transition-colors"
            >
              Forgot password?
            </Link>
          </form>
        </div>

        <p className="mt-5 text-center text-xs font-mono text-text-dim">
          New here?{" "}
          <Link href="/signup" className="text-green-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary" />}>
      <LoginInner />
    </Suspense>
  );
}
