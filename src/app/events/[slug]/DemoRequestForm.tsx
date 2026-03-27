"use client"

import { useState, useEffect, useTransition } from "react"
import { Monitor, Send, CheckCircle, AlertTriangle, Loader2 } from "lucide-react"
import Link from "next/link"

const TIME_OPTIONS = [
  { value: "5", label: "5 minutes — Lightning demo" },
  { value: "10", label: "10 minutes — Standard demo" },
  { value: "15", label: "15 minutes — Extended demo" },
  { value: "20", label: "20 minutes — Deep dive" },
]

export function DemoRequestForm({ eventSlug }: { eventSlug: string }) {
  const [isPending, startTransition] = useTransition()
  const [csrfToken, setCsrfToken] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {})
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const form = new FormData(e.currentTarget)
    const data = {
      name: form.get("name") as string,
      email: form.get("email") as string,
      projectTitle: form.get("projectTitle") as string,
      description: form.get("description") as string,
      estimatedTime: form.get("estimatedTime") as string,
      demoUrl: (form.get("demoUrl") as string) || undefined,
      repoUrl: (form.get("repoUrl") as string) || undefined,
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/events/${eventSlug}/demo-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify(data),
        })
        const json = await res.json()
        if (!res.ok) {
          if (json.details) setFieldErrors(json.details as Record<string, string>)
          setError(json.error || "Submission failed. Please try again.")
          return
        }
        setSubmitted(true)
      } catch {
        setError("Network error. Please check your connection and try again.")
      }
    })
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full bg-green-primary/10 border border-green-primary/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-green-primary" />
        </div>
        <h3 className="text-lg font-mono font-bold text-text-primary mb-2">Demo Request Submitted!</h3>
        <p className="text-sm font-mono text-text-secondary max-w-md mx-auto mb-4">
          We&apos;ll review your request and confirm your slot within 3 business days. Check your email for updates.
        </p>
        <Link
          href="/events"
          className="inline-flex px-4 py-2 bg-bg-card border border-border-default rounded text-xs font-mono text-text-secondary hover:text-green-primary transition-colors"
        >
          View All Events
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
        <div className="flex items-center gap-2 mb-5">
          <Monitor className="w-4 h-4 text-cyan" />
          <h3 className="text-sm font-mono font-semibold text-text-primary">Your Demo</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-text-dim mb-1.5">Full Name *</label>
              <input name="name" type="text" required className={inputCls(fieldErrors.name)} placeholder="Your full name" />
              {fieldErrors.name && <FieldError msg={fieldErrors.name} />}
            </div>
            <div>
              <label className="block text-[11px] font-mono text-text-dim mb-1.5">Email *</label>
              <input name="email" type="email" required className={inputCls(fieldErrors.email)} placeholder="you@example.com" />
              {fieldErrors.email && <FieldError msg={fieldErrors.email} />}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-text-dim mb-1.5">Project / Demo Title *</label>
            <input name="projectTitle" type="text" required className={inputCls(fieldErrors.projectTitle)} placeholder="e.g. AI-Powered M-Pesa Transaction Analyzer" />
            {fieldErrors.projectTitle && <FieldError msg={fieldErrors.projectTitle} />}
          </div>

          <div>
            <label className="block text-[11px] font-mono text-text-dim mb-1.5">
              What will you demo? * <span className="text-text-dim">(min 20 chars)</span>
            </label>
            <textarea
              name="description"
              required
              rows={3}
              className={inputCls(fieldErrors.description) + " resize-none"}
              placeholder="Describe what you'll show — the problem it solves, what makes it interesting, and what the audience will see..."
            />
            {fieldErrors.description && <FieldError msg={fieldErrors.description} />}
          </div>

          <div>
            <label className="block text-[11px] font-mono text-text-dim mb-1.5">Estimated Time *</label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_OPTIONS.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex items-center gap-2.5 p-3 rounded border border-border-default hover:border-green-primary/30 hover:bg-bg-card cursor-pointer transition-all has-[:checked]:border-green-primary/50 has-[:checked]:bg-green-primary/5"
                >
                  <input type="radio" name="estimatedTime" value={value} required className="accent-green-primary" />
                  <span className="text-xs font-mono text-text-secondary">{label}</span>
                </label>
              ))}
            </div>
            {fieldErrors.estimatedTime && <FieldError msg={fieldErrors.estimatedTime} />}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono text-text-dim mb-1.5">Live URL (optional)</label>
              <input name="demoUrl" type="url" className={inputCls()} placeholder="https://your-demo.vercel.app" />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-text-dim mb-1.5">Repository (optional)</label>
              <input name="repoUrl" type="url" className={inputCls()} placeholder="https://github.com/..." />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 bg-red/10 border border-red/30 rounded text-sm font-mono text-red">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !csrfToken}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-primary/10 hover:bg-green-primary/20 border border-green-primary/40 hover:border-green-primary/60 rounded text-sm font-mono font-bold text-green-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
        ) : (
          <><Send className="w-4 h-4" /> Request Demo Slot</>
        )}
      </button>
      <p className="text-center text-[10px] font-mono text-text-dim">
        By submitting, you agree to the{" "}
        <Link href="/code-of-conduct" className="text-text-dim hover:text-text-dim underline">CCK Code of Conduct</Link>
      </p>
    </form>
  )
}

function inputCls(hasError?: string) {
  return `w-full bg-bg-card border ${hasError ? "border-red/50" : "border-border-default"} rounded px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 focus:ring-1 focus:ring-green-primary/20 transition-colors`
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 text-[10px] font-mono text-red">{msg}</p>
}
