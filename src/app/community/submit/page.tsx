"use client"

import { useId, useState, useTransition } from "react"
import Link from "next/link"
import { ArrowLeft, Send, Loader2, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

const RESOURCE_TYPES = [
  { key: "MCP", label: "MCP Server", description: "Model Context Protocol server" },
  { key: "PROMPT", label: "Prompt Template", description: "Reusable prompt or chain" },
  { key: "WORKFLOW", label: "Workflow", description: "Automation or workflow script" },
  { key: "TOOL", label: "Tool / Project", description: "App or tool built with Claude" },
] as const

const INPUT_CLASS =
  "w-full rounded-lg border border-sand-2 bg-paper-card px-3 py-2.5 font-inter text-sm text-ink placeholder:text-ink-muted focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/20"

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

  const ids = {
    title: useId(),
    shortDescription: useId(),
    fullDescription: useId(),
    url: useId(),
    repoUrl: useId(),
    installInstructions: useId(),
    tagInput: useId(),
    submitterName: useId(),
    submitterContact: useId(),
    error: useId(),
  }

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
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div
            role="status"
            className="rounded-2xl border border-success/30 bg-success/10 p-10"
          >
            <h1 className="mb-4 font-newsreader text-[28px] text-ink">
              Submission received!
            </h1>
            <p className="mb-6 font-inter text-[15px] leading-[1.6] text-ink-soft">
              Your resource is pending review by the CCK team. Once approved, it
              will appear on the Community Hub.
            </p>
            <Link
              href="/community"
              className="inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark"
            >
              Browse Community Hub &rarr;
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/community"
          className="mb-8 inline-flex items-center gap-2 font-inter text-[13px] text-ink-muted transition-colors hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Community Hub
        </Link>

        <h1 className="mb-2 font-newsreader text-[36px] leading-[1.1] tracking-[-0.01em] text-ink">
          Share with the community
        </h1>
        <p className="mb-8 font-inter text-[15.5px] leading-[1.6] text-ink-soft">
          Submit an MCP, prompt, workflow, or tool you&apos;ve built with Claude.
          Submissions are reviewed before publishing.
        </p>

        {error && (
          <div
            id={ids.error}
            role="alert"
            className="mb-6 rounded-xl border border-error/30 bg-error/10 p-4 font-inter text-sm text-error"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Resource type — native radios (sr-only) styled via their labels so
           * selection state, grouping and arrow-key behavior all come free. */}
          <fieldset>
            <legend className="mb-3 block font-inter text-sm font-medium text-ink-soft">
              Resource type<span className="ml-0.5 text-error" aria-hidden="true">*</span>
              <span className="sr-only"> (required)</span>
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {RESOURCE_TYPES.map((rt) => (
                <label
                  key={rt.key}
                  className={cn(
                    "cursor-pointer rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-clay",
                    type === rt.key
                      ? "border-clay bg-clay/10"
                      : "border-sand-2 bg-paper-card hover:border-clay/50"
                  )}
                >
                  <input
                    type="radio"
                    name="resource-type"
                    value={rt.key}
                    checked={type === rt.key}
                    onChange={() => setType(rt.key)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      "block font-inter text-sm font-semibold",
                      type === rt.key ? "text-clay" : "text-ink"
                    )}
                  >
                    {rt.label}
                  </span>
                  <span className="mt-1 block font-inter text-xs text-ink-muted">
                    {rt.description}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Field id={ids.title} label="Title" required>
            <input
              id={ids.title}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Supabase MCP Server"
              required
              minLength={5}
              maxLength={150}
              className={INPUT_CLASS}
            />
          </Field>

          <Field
            id={ids.shortDescription}
            label="Short description"
            required
            hint="20-300 characters. Shows in the card view."
          >
            <textarea
              id={ids.shortDescription}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              rows={2}
              required
              minLength={20}
              maxLength={300}
              className={cn(INPUT_CLASS, "resize-none")}
            />
          </Field>

          <Field
            id={ids.fullDescription}
            label="Full description"
            required
            hint="Detailed explanation — what it does, how it works, use cases."
          >
            <textarea
              id={ids.fullDescription}
              value={fullDescription}
              onChange={(e) => setFullDescription(e.target.value)}
              rows={6}
              required
              minLength={50}
              maxLength={5000}
              className={cn(INPUT_CLASS, "resize-none")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id={ids.url} label="URL" hint="Live demo or docs">
              <input
                id={ids.url}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className={INPUT_CLASS}
              />
            </Field>
            <Field id={ids.repoUrl} label="GitHub repo" hint="Source code link">
              <input
                id={ids.repoUrl}
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/..."
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          <Field
            id={ids.installInstructions}
            label="Install instructions"
            hint="Terminal commands, setup steps, config"
          >
            <textarea
              id={ids.installInstructions}
              value={installInstructions}
              onChange={(e) => setInstallInstructions(e.target.value)}
              rows={4}
              maxLength={3000}
              placeholder={"npx @modelcontextprotocol/create-server my-server\ncd my-server\nnpm install"}
              className={cn(INPUT_CLASS, "resize-none font-mono text-[13px]")}
            />
          </Field>

          <Field id={ids.tagInput} label="Tags" hint="Up to 10. Press Enter or comma to add.">
            <div className="space-y-2">
              {tags.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => (
                    <li
                      key={tag}
                      className="flex items-center gap-1 rounded-full border border-sand-2 bg-paper-card px-2.5 py-1 font-inter text-xs text-ink-soft"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(i)}
                        aria-label={`Remove tag: ${tag}`}
                        className="ml-0.5 rounded-full p-0.5 text-ink-muted transition-colors hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input
                  id={ids.tagInput}
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="e.g. typescript, mcp, claude"
                  maxLength={30}
                  className={cn(INPUT_CLASS, "flex-1")}
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={tags.length >= 10}
                  className="inline-flex items-center gap-1 rounded-lg border border-sand-2 px-3 py-2 font-inter text-xs font-semibold text-ink-soft transition-colors hover:border-clay hover:text-clay disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  Add
                </button>
              </div>
            </div>
          </Field>

          <fieldset className="space-y-4 rounded-2xl border border-sand bg-paper-card p-5">
            <legend className="px-1 font-inter text-sm font-semibold text-ink-soft">
              About you (optional)
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id={ids.submitterName} label="Your name">
                <input
                  id={ids.submitterName}
                  type="text"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  placeholder="Anonymous if blank"
                  maxLength={100}
                  className={INPUT_CLASS}
                />
              </Field>
              <Field
                id={ids.submitterContact}
                label="Contact"
                hint="Email, Twitter, Discord — private, not shown publicly"
              >
                <input
                  id={ids.submitterContact}
                  type="text"
                  value={submitterContact}
                  onChange={(e) => setSubmitterContact(e.target.value)}
                  placeholder="Optional"
                  maxLength={200}
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          </fieldset>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending || !type}
              className="inline-flex items-center gap-2 rounded-full bg-clay px-6 py-3 font-inter text-sm font-semibold text-paper-card transition-colors hover:bg-clay-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit for review
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-inter text-sm font-medium text-ink-soft">
        {label}
        {required && (
          <>
            <span className="ml-0.5 text-error" aria-hidden="true">*</span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      {hint && <p className="mb-2 font-inter text-xs text-ink-muted">{hint}</p>}
      {children}
    </div>
  )
}
