"use client"

import { useState, useEffect, useTransition } from "react"
import { Lightbulb, Send, CheckCircle, AlertTriangle, Loader2, ChevronRight, Terminal } from "lucide-react"
import Link from "next/link"

const STAGES = [
  { value: "IDEA", label: "Idea / Concept", desc: "Still in the brainstorming phase" },
  { value: "MVP", label: "MVP Built", desc: "I have a working prototype or early version" },
  { value: "GROWING", label: "Growing / Scaling", desc: "Product is live and gaining users" },
]

const SEEKING_ROLES = [
  { value: "COFOUNDER", label: "Co-Founder" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "DESIGNER", label: "Designer" },
  { value: "MENTOR", label: "Mentor / Advisor" },
  { value: "FUNDER", label: "Investor / Funder" },
]

export default function SubmitIdeaPage() {
  const [isPending, startTransition] = useTransition()
  const [csrfToken, setCsrfToken] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [techStack, setTechStack] = useState<string[]>([])
  const [techInput, setTechInput] = useState("")

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {})
  }, [])

  function toggleRole(role: string) {
    setSelectedRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role])
  }

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

    if (selectedRoles.length === 0) {
      setFieldErrors({ seekingRoles: "Select at least one role you're seeking" })
      return
    }

    const form = new FormData(e.currentTarget)
    const data = {
      title: form.get("title") as string,
      description: form.get("description") as string,
      stage: form.get("stage") as string,
      seekingRoles: selectedRoles,
      techStack: techStack.length > 0 ? techStack : undefined,
      timeline: (form.get("timeline") as string) || undefined,
      contactName: form.get("contactName") as string,
      contactEmail: form.get("contactEmail") as string,
      linkedIn: (form.get("linkedIn") as string) || undefined,
      github: (form.get("github") as string) || undefined,
      website: (form.get("website") as string) || undefined,
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/ideas/submit", {
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-[#00ff41]/10 border border-[#00ff41]/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-[#00ff41]" />
          </div>
          <h1 className="text-xl font-mono font-bold text-[#e0e0e0] mb-3">Idea Submitted!</h1>
          <p className="text-sm font-mono text-[#888] leading-relaxed mb-6">
            Your project idea has been received. We&apos;ll review it and may feature it in the community if approved. Approved ideas will be showcased on our Projects page.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/projects" className="px-4 py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-xs font-mono font-semibold text-[#00ff41] hover:bg-[#00ff41]/20 transition-all">
              View Projects
            </Link>
            <Link href="/" className="px-4 py-2 bg-[#161616] border border-[#222] rounded text-xs font-mono text-[#888] hover:text-[#ccc] transition-all">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Hero */}
      <section className="border-b border-[#1a1a1a] px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00d4ff]/10 border border-[#00d4ff]/20 rounded-full mb-5">
            <Terminal className="w-3.5 h-3.5 text-[#00d4ff]" />
            <span className="text-xs font-mono text-[#00d4ff]">Submit Your Idea</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-mono font-bold text-white mb-4">
            Building Something?<br />
            <span className="text-[#00d4ff]">Find Your Collaborators</span>
          </h1>
          <p className="text-sm font-mono text-[#888] leading-relaxed max-w-lg mx-auto mb-6">
            Share your project or startup idea with Kenya&apos;s AI developer community. Find co-founders, developers, designers, mentors, or early backers.
          </p>
          <div className="flex items-center justify-center gap-6 text-[11px] font-mono text-[#555]">
            {["Free to submit", "Approved ideas get featured", "Connect with builders"].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 text-[#00d4ff]" />
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
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-5">
              <Lightbulb className="w-4 h-4 text-[#00d4ff]" />
              <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Project Details</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-[#555] mb-1.5">Project Name *</label>
                <input name="title" type="text" required className={inputCls(fieldErrors.title)} placeholder="Your project or startup name" />
                {fieldErrors.title && <FieldError msg={fieldErrors.title} />}
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[#555] mb-1.5">Description * <span className="text-[#333]">(min 50 chars)</span></label>
                <textarea name="description" required rows={4} className={inputCls(fieldErrors.description) + " resize-none"} placeholder="What does your project do? What problem does it solve? Who is it for?" />
                {fieldErrors.description && <FieldError msg={fieldErrors.description} />}
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[#555] mb-2">Project Stage *</label>
                <div className="space-y-2">
                  {STAGES.map(({ value, label, desc }) => (
                    <label key={value} className="flex items-start gap-3 p-3 rounded border border-[#1e1e1e] hover:border-[#00d4ff]/30 hover:bg-[#111] cursor-pointer transition-all has-[:checked]:border-[#00d4ff]/50 has-[:checked]:bg-[#00d4ff]/5">
                      <input type="radio" name="stage" value={value} required className="mt-0.5 accent-[#00d4ff]" />
                      <div>
                        <div className="text-xs font-mono font-semibold text-[#ccc]">{label}</div>
                        <div className="text-[10px] font-mono text-[#555] mt-0.5">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[#555] mb-1.5">Target Timeline (optional)</label>
                <input name="timeline" type="text" className={inputCls()} placeholder="e.g. Launch in 3 months, Seeking funding in Q2 2026" />
              </div>
            </div>
          </div>

          {/* What you're seeking */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6">
            <h2 className="text-sm font-mono font-semibold text-[#e0e0e0] mb-4">What Are You Looking For? *</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SEEKING_ROLES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleRole(value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded border text-xs font-mono transition-all ${
                    selectedRoles.includes(value)
                      ? "bg-[#00d4ff]/10 border-[#00d4ff]/50 text-[#00d4ff]"
                      : "bg-transparent border-[#1e1e1e] text-[#666] hover:border-[#2a2a2a] hover:text-[#888]"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full border ${selectedRoles.includes(value) ? "bg-[#00d4ff] border-[#00d4ff]" : "border-[#444]"}`} />
                  {label}
                </button>
              ))}
            </div>
            {fieldErrors.seekingRoles && <FieldError msg={fieldErrors.seekingRoles} />}
          </div>

          {/* Tech Stack */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6">
            <h2 className="text-sm font-mono font-semibold text-[#e0e0e0] mb-4">Tech Stack (optional)</h2>
            <div>
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={addTech}
                className={inputCls()}
                placeholder="Type a technology and press Enter (e.g. React, Python, Claude API)"
              />
              {techStack.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {techStack.map((tech) => (
                    <span key={tech} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#222] text-[11px] font-mono text-[#888]">
                      {tech}
                      <button type="button" onClick={() => removeTech(tech)} className="text-[#444] hover:text-[#ff3333] transition-colors">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6">
            <h2 className="text-sm font-mono font-semibold text-[#e0e0e0] mb-4">Contact Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-[#555] mb-1.5">Name *</label>
                <input name="contactName" type="text" required className={inputCls(fieldErrors.contactName)} placeholder="Your name" />
                {fieldErrors.contactName && <FieldError msg={fieldErrors.contactName} />}
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[#555] mb-1.5">Email *</label>
                <input name="contactEmail" type="email" required className={inputCls(fieldErrors.contactEmail)} placeholder="you@example.com" />
                {fieldErrors.contactEmail && <FieldError msg={fieldErrors.contactEmail} />}
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[#555] mb-1.5">LinkedIn (optional)</label>
                <input name="linkedIn" type="url" className={inputCls()} placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-[#555] mb-1.5">GitHub (optional)</label>
                <input name="github" type="url" className={inputCls()} placeholder="https://github.com/..." />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono text-[#555] mb-1.5">Website (optional)</label>
                <input name="website" type="url" className={inputCls()} placeholder="https://..." />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-4 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-sm font-mono text-[#ff3333]">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !csrfToken}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#00d4ff]/10 hover:bg-[#00d4ff]/20 border border-[#00d4ff]/40 hover:border-[#00d4ff]/60 rounded text-sm font-mono font-bold text-[#00d4ff] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="w-4 h-4" /> Submit Idea</>
            )}
          </button>
          <p className="text-center text-[10px] font-mono text-[#333]">
            All intellectual property remains fully owned by you. We only share approved ideas publicly.
          </p>
        </form>
      </section>
    </div>
  )
}

function inputCls(hasError?: string) {
  return `w-full bg-[#111] border ${hasError ? "border-[#ff3333]/50" : "border-[#1e1e1e]"} rounded px-3 py-2.5 text-sm font-mono text-[#e0e0e0] placeholder:text-[#333] focus:outline-none focus:border-[#00d4ff]/50 focus:ring-1 focus:ring-[#00d4ff]/20 transition-colors`
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 text-[10px] font-mono text-[#ff3333]">{msg}</p>
}
