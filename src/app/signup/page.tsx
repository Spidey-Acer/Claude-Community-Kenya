"use client";

import { useEffect, useState, useTransition } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, AlertTriangle, Loader2, ArrowLeft, User } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const { status } = useSession();
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
        // Auto sign-in after successful signup
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (signInResult?.error) {
          // Account created but login failed — send them to login page to retry
          router.push("/login");
          return;
        }
        window.location.href = "/dashboard";
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
                  htmlFor="signup-firstName"
                  className="block text-[11px] font-mono text-text-dim mb-1.5"
                >
                  <User className="w-3 h-3 inline mr-1.5" />
                  First name
                </label>
                <input
                  id="signup-firstName"
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
                  htmlFor="signup-lastName"
                  className="block text-[11px] font-mono text-text-dim mb-1.5"
                >
                  <User className="w-3 h-3 inline mr-1.5" />
                  Last name
                </label>
                <input
                  id="signup-lastName"
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
                htmlFor="signup-email"
                className="block text-[11px] font-mono text-text-dim mb-1.5"
              >
                <Mail className="w-3 h-3 inline mr-1.5" />
                Email
              </label>
              <input
                id="signup-email"
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
                htmlFor="signup-password"
                className="block text-[11px] font-mono text-text-dim mb-1.5"
              >
                <Lock className="w-3 h-3 inline mr-1.5" />
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
