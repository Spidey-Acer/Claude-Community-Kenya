"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, Send, Loader2, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

const RESOURCE_TYPES = [
  { key: "MCP", label: "MCP Server", description: "Model Context Protocol server" },
  { key: "PROMPT", label: "Prompt Template", description: "Reusable prompt or chain" },
  { key: "WORKFLOW", label: "Workflow", description: "Automation or workflow script" },
  { key: "TOOL", label: "Tool / Project", description: "App or tool built with Claude" },
] as const

export default function CommunitySubmitPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [type, setType] = useState("")
  const [title, setTitle] = useState("")
  const [shortDescription, setShortDescription] = useState("")
  const [fullDescription, setFullDescription] = useState("")
  const [url, setUrl] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [installInstructions, setInstallInstructions] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [submitterName, setSubmitterName] = useState("")
  const [submitterContact, setSubmitterContact] = useState("")

  function addTag() {
    const tag = tagInput.trim()
    if (tag && tags.length < 10 && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput("")
    }
  }

  function removeTag(index: number) {
    setTags(tags.filter((_, i) => i !== index))
  }

  function handleTagKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag()
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!type) {
      setError("Please select a resource type.")
      return
    }

    startTransition(async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token")
        const { csrfToken } = await csrfRes.json()

        const res = await fetch("/api/community/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-csrf-token": csrfToken,
          },
          body: JSON.stringify({
            type,
            title,
            shortDescription,
            fullDescription,
            url: url || undefined,
            repoUrl: repoUrl || undefined,
            installInstructions: installInstructions || undefined,
            tags,
            submitterName: submitterName || undefined,
            submitterContact: submitterContact || undefined,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Submission failed")
        setSuccess(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  if (success) {
    return (
      <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded border border-green-primary/30 bg-green-primary/5 p-10">
            <h1 className="mb-4 font-mono text-2xl font-bold text-green-primary">
              Submission Received!
            </h1>
            <p className="mb-6 font-sans text-text-secondary">
              Your resource is pending review by the CCK team. Once approved, it will appear on Tools &amp; Prompts.
            </p>
            <Link
              href="/community"
              className="inline-flex items-center gap-2 border border-green-primary bg-green-primary/10 px-6 py-3 font-mono text-sm text-green-primary transition-all hover:bg-green-primary hover:text-bg-primary"
            >
              Browse Tools &amp; Prompts &rarr;
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/community"
          className="mb-8 inline-flex items-center gap-2 font-mono text-sm text-text-dim transition-colors hover:text-green-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tools &amp; Prompts
        </Link>

        <h1 className="mb-2 font-mono text-3xl font-bold text-green-primary">
          Share with the Community
        </h1>
        <p className="mb-8 font-sans text-text-secondary">
          Submit an MCP, prompt, workflow, or tool you&apos;ve built with Claude. Submissions are reviewed before publishing.
        </p>

        {error && (
          <div className="mb-6 rounded border border-red/30 bg-red/5 p-4 font-mono text-sm text-red">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resource Type */}
          <div>
            <label id="submit-resource-type-label" className="mb-3 block font-mono text-sm text-text-secondary">
              Resource Type<span className="ml-0.5 text-red">*</span>
            </label>
            <div
              role="radiogroup"
              aria-labelledby="submit-resource-type-label"
              className="grid grid-cols-2 gap-3"
            >
              {RESOURCE_TYPES.map((rt) => (
                <button
                  key={rt.key}
                  type="button"
                  role="radio"
                  aria-checked={type === rt.key}
                  onClick={() => setType(rt.key)}
                  className={cn(
                    "rounded border p-4 text-left transition-all",
                    type === rt.key
                      ? "border-green-primary/50 bg-green-primary/5"
                      : "border-border-default bg-bg-card hover:border-border-hover"
                  )}
                >
                  <span className={cn("block font-mono text-sm font-medium", type === rt.key ? "text-green-primary" : "text-text-primary")}>
                    {rt.label}
                  </span>
                  <span className="block mt-1 font-sans text-xs text-text-dim">{rt.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <Field label="Title" required id="submit-title">
            <input
              id="submit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Supabase MCP Server"
              required
              minLength={5}
              maxLength={150}
              className="w-full rounded border border-border-default bg-bg-card px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-dim focus:border-green-primary/50 focus:outline-none"
            />
          </Field>

          {/* Short Description */}
          <Field label="Short Description" required hint="20-300 characters. Shows in the card view." id="submit-short-description">
            <textarea
              id="submit-short-description"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={2}
              required
              minLength={20}
              maxLength={300}
              className="w-full resize-none rounded border border-border-default bg-bg-card px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-dim focus:border-green-primary/50 focus:outline-none"
            />
          </Field>

          {/* Full Description */}
          <Field label="Full Description" required hint="Detailed explanation — what it does, how it works, use cases." id="submit-full-description">
            <textarea
              id="submit-full-description"
              value={fullDescription}
              onChange={(e) => setFullDescription(e.target.value)}
              rows={6}
              required
              minLength={50}
              maxLength={5000}
              className="w-full resize-none rounded border border-border-default bg-bg-card px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-dim focus:border-green-primary/50 focus:outline-none"
            />
          </Field>

          {/* URLs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="URL" hint="Live demo or docs" id="submit-url">
              <input
                id="submit-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded border border-border-default bg-bg-card px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-dim focus:border-green-primary/50 focus:outline-none"
              />
            </Field>
            <Field label="GitHub Repo" hint="Source code link" id="submit-repo-url">
              <input
                id="submit-repo-url"
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full rounded border border-border-default bg-bg-card px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-dim focus:border-green-primary/50 focus:outline-none"
              />
            </Field>
          </div>

          {/* Install Instructions */}
          <Field label="Install Instructions" hint="Terminal commands, setup steps, config" id="submit-install-instructions">
            <textarea
              id="submit-install-instructions"
              value={installInstructions}
              onChange={(e) => setInstallInstructions(e.target.value)}
              rows={4}
              maxLength={3000}
              placeholder={"npx @modelcontextprotocol/create-server my-server\ncd my-server\nnpm install"}
              className="w-full resize-none rounded border border-border-default bg-bg-card px-3 py-2.5 font-mono text-sm text-text-primary placeholder:text-text-dim focus:border-green-primary/50 focus:outline-none"
            />
          </Field>

          {/* Tags */}
          <Field label="Tags" hint="Up to 10. Press Enter or comma to add.">
            <div className="space-y-2">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 rounded border border-border-default px-2.5 py-1 font-mono text-xs text-text-secondary"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(i)}
                        aria-label={`Remove ${tag}`}
                        className="ml-0.5 text-text-dim hover:text-red transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="e.g. typescript, mcp, claude"
                  maxLength={30}
                  aria-label="Add a tag"
                  className="flex-1 rounded border border-border-default bg-bg-card px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:border-green-primary/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={tags.length >= 10}
                  className="flex items-center gap-1 rounded border border-border-default px-3 py-2 font-mono text-xs text-text-dim hover:text-green-primary hover:border-green-primary/50 transition-colors disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
            </div>
          </Field>

          {/* Submitter info */}
          <div className="rounded border border-border-default bg-bg-card p-5 space-y-4">
            <h2 className="font-mono text-sm font-medium text-text-secondary">About You (Optional)</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Your Name" id="submit-submitter-name">
                <input
                  id="submit-submitter-name"
                  type="text"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  placeholder="Anonymous if blank"
                  maxLength={100}
                  className="w-full rounded border border-border-default bg-bg-secondary px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:border-green-primary/50 focus:outline-none"
                />
              </Field>
              <Field label="Contact" hint="Email, Twitter, Discord — private, not shown publicly" id="submit-submitter-contact">
                <input
                  id="submit-submitter-contact"
                  type="text"
                  value={submitterContact}
                  onChange={(e) => setSubmitterContact(e.target.value)}
                  placeholder="Optional"
                  maxLength={200}
                  className="w-full rounded border border-border-default bg-bg-secondary px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim focus:border-green-primary/50 focus:outline-none"
                />
              </Field>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !type}
              className="flex items-center gap-2 border border-green-primary bg-green-primary/10 px-6 py-3 font-mono text-sm font-medium text-green-primary transition-all hover:bg-green-primary hover:text-bg-primary disabled:opacity-50"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit for Review
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

function Field({
  label,
  required,
  hint,
  id,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  id?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-mono text-sm text-text-secondary">
        {label}
        {required && <span className="ml-0.5 text-red">*</span>}
      </label>
      {hint && <p className="mb-2 font-sans text-xs text-text-dim">{hint}</p>}
      {children}
    </div>
  )
}
