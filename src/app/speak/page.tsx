"use client"

import { useState, useEffect, useTransition } from "react"
import { Mic2, Send, CheckCircle, AlertTriangle, Loader2, ChevronRight, Terminal } from "lucide-react"
import Link from "next/link"

const CATEGORIES = [
  { value: "FINTECH", label: "Fintech & Finance Tech", desc: "M-Pesa integrations, open banking, payment systems" },
  { value: "TECHNICAL", label: "Technical Deep-Dive", desc: "AI/ML, system design, advanced engineering topics" },
  { value: "CAREER", label: "Career & Community", desc: "Developer career paths, community building, freelancing" },
  { value: "LIVE_DEMO", label: "Live Demo / Build Session", desc: "Real-time building or showcasing a project live" },
  { value: "OTHER", label: "Other", desc: "Something that doesn't fit the above categories" },
]

const CITIES = ["Nairobi", "Mombasa", "Either"]

export default function SpeakPage() {
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
      phone: (form.get("phone") as string) || undefined,
      topic: form.get("topic") as string,
      abstract: form.get("abstract") as string,
      bio: form.get("bio") as string,
      category: form.get("category") as string,
      preferredEvent: (form.get("preferredEvent") as string) || undefined,
      preferredCity: (form.get("preferredCity") as string) || undefined,
      linkedIn: (form.get("linkedIn") as string) || undefined,
      github: (form.get("github") as string) || undefined,
      portfolio: (form.get("portfolio") as string) || undefined,
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/speakers/apply", {
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
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-primary/10 border border-green-primary/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-primary" />
          </div>
          <h1 className="text-xl font-mono font-bold text-text-primary mb-3">Application Received!</h1>
          <p className="text-sm font-mono text-text-secondary leading-relaxed mb-6">
            Thank you for applying to speak at a CCK event. We&apos;ll review your application and reach out within 2 weeks.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/events" className="px-4 py-2 bg-green-primary/10 border border-green-primary/30 rounded text-xs font-mono font-semibold text-green-primary hover:bg-green-primary/20 transition-all">
              View Events
            </Link>
            <Link href="/" className="px-4 py-2 bg-bg-card border border-border-default rounded text-xs font-mono text-text-secondary hover:text-text-secondary transition-all">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero */}
      <section className="border-b border-bg-elevated px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-primary/10 border border-green-primary/20 rounded-full mb-5">
            <Terminal className="w-3.5 h-3.5 text-green-primary" />
            <span className="text-xs font-mono text-green-primary">Apply to Speak</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-mono font-bold text-white mb-4">
            Share Your Knowledge<br />
            <span className="text-green-primary">with Kenya&apos;s AI Community</span>
          </h1>
          <p className="text-sm font-mono text-text-secondary leading-relaxed max-w-lg mx-auto mb-6">
            CCK events bring together Kenya&apos;s best developers. If you have insights on AI, Claude Code, engineering, fintech, or building in Kenya — we want to hear from you.
          </p>
          <div className="flex items-center justify-center gap-6 text-[11px] font-mono text-text-dim">
            {["30–45 min slots", "Live demos welcome", "Nairobi & Mombasa events"].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-green-primary" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="max-w-2xl mx-auto px-4 py-12">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Info */}
          <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
            <div className="flex items-center gap-2 mb-5">
              <Mic2 className="w-4 h-4 text-green-primary" />
              <h2 className="text-sm font-mono font-semibold text-text-primary">About You</h2>
            </div>
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
              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-1.5">Phone (optional)</label>
                <input name="phone" type="tel" className={inputCls()} placeholder="+254 ..." />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-1.5">LinkedIn (optional)</label>
                <input name="linkedIn" type="url" className={inputCls()} placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-1.5">GitHub (optional)</label>
                <input name="github" type="url" className={inputCls()} placeholder="https://github.com/..." />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-1.5">Portfolio / Website (optional)</label>
                <input name="portfolio" type="url" className={inputCls()} placeholder="https://..." />
              </div>
            </div>
          </div>

          {/* Talk Details */}
          <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
            <div className="flex items-center gap-2 mb-5">
              <Send className="w-4 h-4 text-cyan" />
              <h2 className="text-sm font-mono font-semibold text-text-primary">Your Talk</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-1.5">Talk Title *</label>
                <input name="topic" type="text" required className={inputCls(fieldErrors.topic)} placeholder="e.g. Building a production RAG pipeline with Claude" />
                {fieldErrors.topic && <FieldError msg={fieldErrors.topic} />}
              </div>

              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-1.5">Category *</label>
                <div className="grid grid-cols-1 gap-2">
                  {CATEGORIES.map(({ value, label, desc }) => (
                    <label key={value} className="flex items-start gap-3 p-3 rounded border border-border-default hover:border-green-primary/30 hover:bg-bg-card cursor-pointer transition-all has-[:checked]:border-green-primary/50 has-[:checked]:bg-green-primary/5">
                      <input type="radio" name="category" value={value} required className="mt-0.5 accent-green-primary" />
                      <div>
                        <div className="text-xs font-mono font-semibold text-text-secondary">{label}</div>
                        <div className="text-[10px] font-mono text-text-dim mt-0.5">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {fieldErrors.category && <FieldError msg={fieldErrors.category} />}
              </div>

              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-1.5">Abstract * <span className="text-text-dim">(min 100 chars)</span></label>
                <textarea name="abstract" required rows={4} className={inputCls(fieldErrors.abstract) + " resize-none"} placeholder="Brief summary of your talk — what attendees will learn, what you'll cover..." />
                {fieldErrors.abstract && <FieldError msg={fieldErrors.abstract} />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-text-dim mb-1.5">Preferred City</label>
                  <select name="preferredCity" className={inputCls()}>
                    <option value="">Any city</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-text-dim mb-1.5">Preferred Event Type</label>
                  <input name="preferredEvent" type="text" className={inputCls()} placeholder="e.g. Meetup, Workshop, Hackathon" />
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
            <h2 className="text-sm font-mono font-semibold text-text-primary mb-4">Speaker Bio *</h2>
            <textarea name="bio" required rows={4} className={inputCls(fieldErrors.bio) + " resize-none"} placeholder="Tell us about yourself — your background, what you build, what you're passionate about..." />
            {fieldErrors.bio && <FieldError msg={fieldErrors.bio} />}
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
              <><Send className="w-4 h-4" /> Submit Application</>
            )}
          </button>
          <p className="text-center text-[10px] font-mono text-text-dim">
            By submitting, you agree to the{" "}
            <Link href="/code-of-conduct" className="text-text-dim hover:text-text-dim underline">CCK Code of Conduct</Link>
          </p>
        </form>
      </section>
    </div>
  )
}

function inputCls(hasError?: string) {
  return `w-full bg-bg-card border ${hasError ? "border-red/50" : "border-border-default"} rounded px-3 py-2.5 text-sm font-mono text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 focus:ring-1 focus:ring-green-primary/20 transition-colors`
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 text-[10px] font-mono text-red">{msg}</p>
}
