"use client";

import { useState, useTransition, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, AlertTriangle, Loader2, ArrowLeft } from "lucide-react";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MODERATOR"]);

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const { status, data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // If already signed in, send them to the right place.
  useEffect(() => {
    if (status !== "authenticated") return;
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (callbackUrl) {
      window.location.href = callbackUrl;
      return;
    }
    window.location.href = role && ADMIN_ROLES.has(role) ? "/admin" : "/dashboard";
  }, [status, session, callbackUrl]);

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
      // Refresh the session via a full navigation so server layouts pick up the role.
      // The useEffect above will handle the role-based redirect on next paint.
      window.location.reload();
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
                minLength={8}
                className="w-full bg-bg-card border border-border-default rounded px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 focus:ring-1 focus:ring-green-primary/20 transition-colors"
                placeholder="••••••••"
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
