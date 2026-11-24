"use client";

import { useState, useTransition, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { BTN_PRIMARY, Field, INPUT, LINK, Masthead, WRAP } from "@/components/karibu/kit";

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

  return (
    <>
      <Masthead eyebrow="Sign in" title="Welcome back" lead="Sign in to your Claude Community Kenya account." />
      <section className={`${WRAP} pb-16`}>
        <div className="max-w-md rounded-2xl border border-sand bg-paper-card p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Email">
              {(control) => (
                <input
                  {...control}
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className={INPUT}
                  placeholder="you@email.com"
                />
              )}
            </Field>

            <Field label="Password">
              {(control) => (
                <input
                  {...control}
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  minLength={8}
                  className={INPUT}
                  placeholder="••••••••"
                />
              )}
            </Field>

            {error && (
              <p role="alert" className="font-inter text-sm text-error">
                {error}
              </p>
            )}

            <button type="submit" disabled={isPending} className={`${BTN_PRIMARY} w-full disabled:opacity-60`}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 font-inter text-sm">
              <Link href="/forgot-password" className={LINK}>
                Forgot password?
              </Link>
              <Link href="/signup" className={LINK}>
                New here? Create account
              </Link>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginInner />
    </Suspense>
  );
}
