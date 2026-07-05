"use client"

import { useState, useTransition } from "react"
import { signIn, signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Terminal, Lock, Mail, AlertTriangle, Loader2 } from "lucide-react"

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "MODERATOR"])

/**
 * Admin sign-in form. Server-side parent (`page.tsx`) already redirected
 * authenticated admins to /admin before we get here, so this component
 * only needs to handle:
 *   1. Submitting credentials and routing to /admin on success.
 *   2. The "you're signed in but not an admin" recovery state — show a
 *      sign-out button instead of the submit, so the user can swap accounts
 *      without bouncing through the layout's access-denied screen.
 */
export function AdminLoginForm() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const sessionRole = (session?.user as { role?: string } | undefined)?.role
  const signedInNonAdmin =
    status === "authenticated" && (!sessionRole || !ADMIN_ROLES.has(sessionRole))

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    const email = form.get("email") as string
    const password = form.get("password") as string

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        setError("Invalid email or password.")
        return
      }
      // Full reload so the server-rendered layout picks up the new session
      // cookie and re-evaluates the admin-redirect in page.tsx.
      window.location.assign("/admin")
    })
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(#00ff41 1px, transparent 1px), linear-gradient(90deg, #00ff41 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded bg-green-primary/10 border border-green-primary/30 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-green-primary" />
            </div>
            <div className="text-left">
              <div className="text-sm font-mono font-bold text-green-primary">CCK Admin</div>
              <div className="text-[11px] font-mono text-text-dim">claude community kenya</div>
            </div>
          </div>
          <p className="text-xs font-mono text-text-dim">Authorized personnel only</p>
        </div>

        <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-green-primary" />
              <h1 className="text-sm font-mono font-semibold text-text-primary">Sign In</h1>
            </div>
            <p className="text-xs font-mono text-text-dim pl-6">Enter your admin credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-[11px] font-mono text-text-dim mb-1.5">
                <Mail className="w-3 h-3 inline mr-1.5" />
                Email Address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full bg-bg-card border border-border-default rounded px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 focus:ring-1 focus:ring-green-primary/20 transition-colors"
                placeholder="admin@claudekenya.org"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-[11px] font-mono text-text-dim mb-1.5">
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

            {signedInNonAdmin && (
              <div className="flex items-start gap-2 p-3 bg-red/10 border border-red/30 rounded text-[11px] font-mono text-red">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                <span className="flex-1">
                  This account doesn&apos;t have admin access. Sign out and sign in
                  with an admin account.
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red/10 border border-red/30 rounded text-[11px] font-mono text-red">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {signedInNonAdmin ? (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/admin/login" })}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-bg-card hover:bg-bg-elevated border border-border-default hover:border-border-hover rounded text-sm font-mono font-semibold text-text-primary transition-all"
              >
                Sign out
              </button>
            ) : (
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
            )}
          </form>
        </div>

        <p className="mt-4 text-center text-[10px] font-mono text-text-dim">
          Claude Community Kenya — Admin Dashboard
        </p>
      </div>
    </div>
  )
}
