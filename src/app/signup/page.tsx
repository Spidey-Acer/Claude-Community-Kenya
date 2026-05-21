"use client";

import { useEffect, useState, useTransition } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertTriangle, Loader2, ArrowLeft, User } from "lucide-react";
import { useSkin } from "@/contexts/SkinContext";

export default function SignupPage() {
  const router = useRouter();
  const { status } = useSession();
  const { skin } = useSkin();
  const isPro = skin === "pro";
  const [csrfToken, setCsrfToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {});
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const firstName = (form.get("firstName") as string).trim();
    const lastName = (form.get("lastName") as string).trim();
    const email = (form.get("email") as string).trim();
    const password = form.get("password") as string;

    if (!firstName || !lastName || !email || !password) {
      setError("All fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify({ firstName, lastName, email, password }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || "Signup failed. Please try again.");
          return;
        }
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (signInResult?.error) {
          router.push("/login");
          return;
        }
        window.location.href = "/dashboard";
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

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
              style={{ fontFamily: 'var(--font-display), ui-serif, Georgia, serif', letterSpacing: "-0.02em" }}
            >
              Create your account
            </h1>
            <p className="mt-2 text-[14px] text-[#b0aea5]">
              Join Africa&apos;s first Claude developer community.
            </p>
          </div>

          <div className="card-elevated rounded-2xl p-7">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="signup-firstName"
                    className="mb-1.5 block text-[12px] font-medium text-[#b0aea5]"
                  >
                    <User className="mr-1.5 inline h-3.5 w-3.5" />
                    First name
                  </label>
                  <input
                    id="signup-firstName"
                    name="firstName"
                    type="text"
                    required
                    maxLength={60}
                    autoComplete="given-name"
                    className="w-full rounded-lg border border-[#2a2a28] bg-[#1e1e1d]/80 px-3.5 py-2.5 text-[14px] text-[#faf9f5] placeholder:text-[#7a7870] transition-colors focus:border-[#d97757]/60 focus:outline-none focus:ring-1 focus:ring-[#d97757]/30"
                    placeholder="Wanjiru"
                  />
                </div>
                <div>
                  <label
                    htmlFor="signup-lastName"
                    className="mb-1.5 block text-[12px] font-medium text-[#b0aea5]"
                  >
                    <User className="mr-1.5 inline h-3.5 w-3.5" />
                    Last name
                  </label>
                  <input
                    id="signup-lastName"
                    name="lastName"
                    type="text"
                    required
                    maxLength={60}
                    autoComplete="family-name"
                    className="w-full rounded-lg border border-[#2a2a28] bg-[#1e1e1d]/80 px-3.5 py-2.5 text-[14px] text-[#faf9f5] placeholder:text-[#7a7870] transition-colors focus:border-[#d97757]/60 focus:outline-none focus:ring-1 focus:ring-[#d97757]/30"
                    placeholder="Mwangi"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="mb-1.5 block text-[12px] font-medium text-[#b0aea5]"
                >
                  <Mail className="mr-1.5 inline h-3.5 w-3.5" />
                  Email
                </label>
                <input
                  id="signup-email"
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
                  htmlFor="signup-password"
                  className="mb-1.5 block text-[12px] font-medium text-[#b0aea5]"
                >
                  <Lock className="mr-1.5 inline h-3.5 w-3.5" />
                  Password
                </label>
                <input
                  id="signup-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-[#2a2a28] bg-[#1e1e1d]/80 px-3.5 py-2.5 text-[14px] text-[#faf9f5] placeholder:text-[#7a7870] transition-colors focus:border-[#d97757]/60 focus:outline-none focus:ring-1 focus:ring-[#d97757]/30"
                  placeholder="At least 8 characters"
                />
              </div>

              <p className="text-[12px] leading-relaxed text-[#7a7870]">
                By creating an account you agree to the{" "}
                <Link
                  href="/code-of-conduct"
                  className="text-[#d97757] underline decoration-[#d97757]/40 underline-offset-2 hover:decoration-[#d97757]"
                >
                  CCK Code of Conduct
                </Link>
                .
              </p>

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
                    Creating account…
                  </>
                ) : (
                  <>
                    Create account
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-[13px] text-[#b0aea5]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#d97757] underline decoration-[#d97757]/40 underline-offset-2 hover:decoration-[#d97757]"
            >
              Sign in
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

      <div className="relative w-full max-w-md">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-text-dim hover:text-green-primary transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> back to home
          </Link>
        </div>

        <div className="mb-8 text-center">
          <h1 className="font-mono text-lg font-bold text-green-primary">$ ./create-account</h1>
          <p className="mt-1 text-xs font-mono text-text-dim">
            Join Claude Community Kenya
          </p>
        </div>

        <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="signup-firstName-dev"
                  className="block text-[11px] font-mono text-text-dim mb-1.5"
                >
                  <User className="w-3 h-3 inline mr-1.5" />
                  First name
                </label>
                <input
                  id="signup-firstName-dev"
                  name="firstName"
                  type="text"
                  required
                  maxLength={60}
                  autoComplete="given-name"
                  className="w-full bg-bg-card border border-border-default rounded px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 focus:ring-1 focus:ring-green-primary/20 transition-colors"
                  placeholder="Wanjiru"
                />
              </div>
              <div>
                <label
                  htmlFor="signup-lastName-dev"
                  className="block text-[11px] font-mono text-text-dim mb-1.5"
                >
                  <User className="w-3 h-3 inline mr-1.5" />
                  Last name
                </label>
                <input
                  id="signup-lastName-dev"
                  name="lastName"
                  type="text"
                  required
                  maxLength={60}
                  autoComplete="family-name"
                  className="w-full bg-bg-card border border-border-default rounded px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 focus:ring-1 focus:ring-green-primary/20 transition-colors"
                  placeholder="Mwangi"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-email-dev"
                className="block text-[11px] font-mono text-text-dim mb-1.5"
              >
                <Mail className="w-3 h-3 inline mr-1.5" />
                Email
              </label>
              <input
                id="signup-email-dev"
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
                htmlFor="signup-password-dev"
                className="block text-[11px] font-mono text-text-dim mb-1.5"
              >
                <Lock className="w-3 h-3 inline mr-1.5" />
                Password
              </label>
              <input
                id="signup-password-dev"
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                className="w-full bg-bg-card border border-border-default rounded px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 focus:ring-1 focus:ring-green-primary/20 transition-colors"
                placeholder="At least 8 characters"
              />
            </div>

            <p className="text-[11px] font-mono text-text-dim leading-relaxed">
              By creating an account you agree to the{" "}
              <Link href="/code-of-conduct" className="text-green-primary hover:underline">
                CCK Code of Conduct
              </Link>
              .
            </p>

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
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs font-mono text-text-dim">
          Already have an account?{" "}
          <Link href="/login" className="text-green-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
