"use client"

import { useState, useEffect, useTransition } from "react"
import { FolderGit2, Send, CheckCircle, AlertTriangle, Loader2, ChevronRight, Terminal } from "lucide-react"
import Link from "next/link"

const STATUSES = [
  { value: "in-development", label: "In Development", desc: "Still building — not yet released" },
  { value: "live", label: "Live / Deployed", desc: "Available for people to use right now" },
  { value: "in-production", label: "In Production", desc: "Actively used in a production environment" },
]

export default function SubmitProjectPage() {
  const [isPending, startTransition] = useTransition()
  const [csrfToken, setCsrfToken] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [techStack, setTechStack] = useState<string[]>([])
  const [techInput, setTechInput] = useState("")

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {})
  }, [])

  function addTech(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && techInput.trim()) {
      e.preventDefault()
      const val = techInput.trim().replace(/,$/, "")
      if (val && !techStack.includes(val)) setTechStack((prev) => [...prev, val])
      setTechInput("")
    }
  }

  function removeTech(t: string) {
    setTechStack((prev) => prev.filter((x) => x !== t))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (techStack.length === 0) {
      setFieldErrors({ stack: "Add at least one technology to your stack" })
      return
    }

    const form = new FormData(e.currentTarget)
    const data = {
      name: form.get("name") as string,
      builder: form.get("builder") as string,
      description: form.get("description") as string,
      status: form.get("status") as string,
      stack: techStack,
      demoUrl: (form.get("demoUrl") as string) || undefined,
      repoUrl: (form.get("repoUrl") as string) || undefined,
      contactName: form.get("contactName") as string,
      contactEmail: form.get("contactEmail") as string,
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/projects/submit", {
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
          <h1 className="text-xl font-mono font-bold text-text-primary mb-3">Project Submitted!</h1>
          <p className="text-sm font-mono text-text-secondary leading-relaxed mb-6">
            Your project has been received. We&apos;ll review it and feature it on the Projects page once approved.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/projects" className="px-4 py-2 bg-green-primary/10 border border-green-primary/30 rounded text-xs font-mono font-semibold text-green-primary hover:bg-green-primary/20 transition-all">
              View Projects
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
            <span className="text-xs font-mono text-green-primary">Submit Project</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-mono font-bold text-white mb-4">
            Built Something?<br />
            <span className="text-green-primary">Share It With the Community</span>
          </h1>
          <p className="text-sm font-mono text-text-secondary leading-relaxed max-w-lg mx-auto mb-6">
            Showcase your project built with Claude. Get featured on the CCK Projects page and inspire other developers across East Africa.
          </p>
          <div className="flex items-center justify-center gap-6 text-[11px] font-mono text-text-dim">
            {["Free to submit", "Approved projects get featured", "Open source encouraged"].map((item) => (
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
          {/* Project Info */}
          <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
            <div className="flex items-center gap-2 mb-5">
              <FolderGit2 className="w-4 h-4 text-green-primary" />
              <h2 className="text-sm font-mono font-semibold text-text-primary">Project Details</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-1.5">Project Name *</label>
                <input name="name" type="text" required className={inputCls(fieldErrors.name)} placeholder="e.g. Claude Kenya Theme" />
                {fieldErrors.name && <FieldError msg={fieldErrors.name} />}
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-1.5">Builder / Team *</label>
                <input name="builder" type="text" required className={inputCls(fieldErrors.builder)} placeholder="e.g. Claude Community Kenya" />
                {fieldErrors.builder && <FieldError msg={fieldErrors.builder} />}
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-1.5">Description * <span className="text-text-dim">(min 30 chars)</span></label>
                <textarea name="description" required rows={4} className={inputCls(fieldErrors.description) + " resize-none"} placeholder="What does your project do? What problem does it solve?" />
                {fieldErrors.description && <FieldError msg={fieldErrors.description} />}
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-2">Project Status *</label>
                <div className="space-y-2">
                  {STATUSES.map(({ value, label, desc }) => (
                    <label key={value} className="flex items-start gap-3 p-3 rounded border border-border-default hover:border-green-primary/30 hover:bg-bg-card cursor-pointer transition-all has-[:checked]:border-green-primary/50 has-[:checked]:bg-green-primary/5">
                      <input type="radio" name="status" value={value} required className="mt-0.5 accent-green-500" />
                      <div>
                        <div className="text-xs font-mono font-semibold text-text-secondary">{label}</div>
                        <div className="text-[10px] font-mono text-text-dim mt-0.5">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
            <h2 className="text-sm font-mono font-semibold text-text-primary mb-4">Tech Stack *</h2>
            <div>
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={addTech}
                className={inputCls(fieldErrors.stack)}
                placeholder="Type a technology and press Enter (e.g. Next.js, Python, Claude Code)"
              />
              {fieldErrors.stack && <FieldError msg={fieldErrors.stack} />}
              {techStack.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {techStack.map((tech) => (
                    <span key={tech} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-bg-elevated border border-border-default text-[11px] font-mono text-text-secondary">
                      {tech}
                      <button type="button" onClick={() => removeTech(tech)} className="text-text-dim hover:text-red transition-colors">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Links */}
          <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
            <h2 className="text-sm font-mono font-semibold text-text-primary mb-4">Project Links</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-1.5">Demo / Live URL (optional)</label>
                <input name="demoUrl" type="url" className={inputCls()} placeholder="https://your-project.com" />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-1.5">Repository URL (optional)</label>
                <input name="repoUrl" type="url" className={inputCls()} placeholder="https://github.com/..." />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
            <h2 className="text-sm font-mono font-semibold text-text-primary mb-4">Your Contact Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-1.5">Name *</label>
                <input name="contactName" type="text" required className={inputCls(fieldErrors.contactName)} placeholder="Your name" />
                {fieldErrors.contactName && <FieldError msg={fieldErrors.contactName} />}
              </div>
              <div>
                <label className="block text-[11px] font-mono text-text-dim mb-1.5">Email *</label>
                <input name="contactEmail" type="email" required className={inputCls(fieldErrors.contactEmail)} placeholder="you@example.com" />
                {fieldErrors.contactEmail && <FieldError msg={fieldErrors.contactEmail} />}
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
              <><Send className="w-4 h-4" /> Submit Project</>
            )}
          </button>
          <p className="text-center text-[10px] font-mono text-text-dim">
            Projects are reviewed before being featured. All intellectual property remains fully owned by you.
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
