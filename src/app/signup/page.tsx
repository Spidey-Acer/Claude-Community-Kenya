"use client";

import { useEffect, useState, useTransition } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BTN_PRIMARY, Field, INPUT, Masthead, WRAP } from "@/components/karibu/kit";

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

  return (
    <>
      <Masthead
        eyebrow="Join"
        title="Create your account"
        lead="Join Kenya's independent, volunteer-run Claude community."
      />
      <section className={`${WRAP} pb-16`}>
        <div className="max-w-md rounded-2xl border border-sand bg-paper-card p-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First name">
                {(control) => (
                  <input
                    {...control}
                    name="firstName"
                    type="text"
                    required
                    maxLength={60}
                    autoComplete="given-name"
                    className={INPUT}
                    placeholder="Wanjiru"
                  />
                )}
              </Field>
              <Field label="Last name">
                {(control) => (
                  <input
                    {...control}
                    name="lastName"
                    type="text"
                    required
                    maxLength={60}
                    autoComplete="family-name"
                    className={INPUT}
                    placeholder="Mwangi"
                  />
                )}
              </Field>
            </div>

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
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  className={INPUT}
                  placeholder="At least 8 characters"
                />
              )}
            </Field>

            <p className="font-inter text-xs leading-relaxed text-ink-muted">
              By creating an account you agree to the{" "}
              <Link href="/code-of-conduct" className="text-clay underline underline-offset-2">
                CCK Code of Conduct
              </Link>
              .
            </p>

            {error && (
              <p role="alert" className="font-inter text-sm text-error">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending || !csrfToken}
              className={`${BTN_PRIMARY} w-full disabled:opacity-60`}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 font-inter text-sm text-ink-soft">
          Already have an account?{" "}
          <Link href="/login" className="text-clay underline underline-offset-2">
            Sign in
          </Link>
        </p>
      </section>
    </>
  );
}
