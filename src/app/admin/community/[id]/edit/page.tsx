"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Loader2 } from "lucide-react"

const SUBMISSION_TYPES = ["MCP", "PROMPT", "WORKFLOW", "TOOL"] as const
const SUBMISSION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const

const TYPE_LABELS: Record<string, string> = {
  MCP: "MCP",
  PROMPT: "Prompt",
  WORKFLOW: "Workflow",
  TOOL: "Tool",
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
}

interface SubmissionData {
  id: string
  title: string
  shortDescription: string
  fullDescription: string | null
  url: string | null
  repoUrl: string | null
  installInstructions: string | null
  tags: string[] | null
  type: string
  status: string
  reviewNotes: string | null
  submitterName: string
  submitterContact: string | null
}

export default function EditCommunityPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [title, setTitle] = useState("")
  const [shortDescription, setShortDescription] = useState("")
  const [fullDescription, setFullDescription] = useState("")
  const [url, setUrl] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [installInstructions, setInstallInstructions] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [type, setType] = useState("MCP")
  const [status, setStatus] = useState("PENDING")
  const [reviewNotes, setReviewNotes] = useState("")

  useEffect(() => {
    async function fetchSubmission() {
      try {
        const res = await fetch(`/api/admin/community/${id}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "Failed to fetch submission")
        const sub: SubmissionData = json.data
        setTitle(sub.title)
        setShortDescription(sub.shortDescription)
        setFullDescription(sub.fullDescription ?? "")
        setUrl(sub.url ?? "")
        setRepoUrl(sub.repoUrl ?? "")
        setInstallInstructions(sub.installInstructions ?? "")
        setTagsInput((sub.tags ?? []).join(", "))
        setType(sub.type)
        setStatus(sub.status)
        setReviewNotes(sub.reviewNotes ?? "")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load submission")
      } finally {
        setLoading(false)
      }
    }
    fetchSubmission()
  }, [id])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token")
        const { csrfToken } = await csrfRes.json()

        const tags = tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)

        const body: Record<string, unknown> = {
          title,
          shortDescription,
          fullDescription: fullDescription || undefined,
          url: url || undefined,
          repoUrl: repoUrl || undefined,
          installInstructions: installInstructions || undefined,
          tags,
          type,
          status,
          reviewNotes: reviewNotes || undefined,
        }

        const res = await fetch(`/api/admin/community/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify(body),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to update submission")
        setSuccess(true)
        router.push(`/admin/community/${id}`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      }
    })
  }

  if (loading) {
    return (
      <div>
        <header className="h-14 border-b border-[#1e1e1e] bg-[#0d0d0d] px-6 flex items-center">
          <h1 className="text-sm font-mono font-semibold text-[#e0e0e0] tracking-wide">Edit Submission</h1>
        </header>
        <div className="p-6 flex items-center gap-2 text-sm font-mono text-[#555]">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading submission...
        </div>
      </div>
    )
  }

  return (
    <div>
      <header className="h-14 border-b border-[#1e1e1e] bg-[#0d0d0d] px-6 flex items-center">
        <h1 className="text-sm font-mono font-semibold text-[#e0e0e0] tracking-wide">Edit Submission</h1>
      </header>
      <div className="p-6 max-w-3xl space-y-4">
        <Link href={`/admin/community/${id}`} className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to submission
        </Link>

        {error && (
          <div className="p-3 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41]">
            Submission updated successfully. Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
            <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Basic Info</h2>
            <FieldInput label="Title" value={title} onChange={setTitle} required />
            <FieldTextarea label="Short Description" value={shortDescription} onChange={setShortDescription} rows={2} required />
            <FieldTextarea label="Full Description" value={fullDescription} onChange={setFullDescription} rows={5} />
          </div>

          {/* Links */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
            <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Links</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldInput label="URL" type="url" value={url} onChange={setUrl} placeholder="https://..." />
              <FieldInput label="Repository URL" type="url" value={repoUrl} onChange={setRepoUrl} placeholder="https://github.com/..." />
            </div>
          </div>

          {/* Install Instructions */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
            <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Install Instructions</h2>
            <FieldTextarea label="Install Instructions" value={installInstructions} onChange={setInstallInstructions} rows={4} />
          </div>

          {/* Classification */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
            <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Classification</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldSelect label="Type" value={type} onChange={setType} options={SUBMISSION_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))} />
              <FieldSelect label="Status" value={status} onChange={setStatus} options={SUBMISSION_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
            </div>
            <FieldInput label="Tags" value={tagsInput} onChange={setTagsInput} placeholder="Comma-separated, e.g. ai, mcp, tool" />
          </div>

          {/* Review */}
          <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
            <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider">Review</h2>
            <FieldTextarea label="Review Notes" value={reviewNotes} onChange={setReviewNotes} rows={3} />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Link
              href={`/admin/community/${id}`}
              className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#1e1e1e] rounded text-xs font-mono text-[#888] transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00ff41]/10 hover:bg-[#00ff41]/20 border border-[#00ff41]/30 rounded text-xs font-mono font-semibold text-[#00ff41] transition-all disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* --- Reusable Form Components --- */

function FieldInput({
  label, value, onChange, type = "text", placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean
}) {
  const inputId = `field-${label.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <div>
      <label htmlFor={inputId} className="block text-[11px] font-mono text-[#555] mb-1.5">
        {label}{required && <span className="text-[#ff3333] ml-0.5">*</span>}
      </label>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50"
      />
    </div>
  )
}

function FieldTextarea({
  label, value, onChange, rows = 3, required,
}: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; required?: boolean
}) {
  const inputId = `field-${label.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <div>
      <label htmlFor={inputId} className="block text-[11px] font-mono text-[#555] mb-1.5">
        {label}{required && <span className="text-[#ff3333] ml-0.5">*</span>}
      </label>
      <textarea
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        required={required}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50 resize-none"
      />
    </div>
  )
}

function FieldSelect({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  const inputId = `field-${label.toLowerCase().replace(/\s+/g, "-")}`
  return (
    <div>
      <label htmlFor={inputId} className="block text-[11px] font-mono text-[#555] mb-1.5">{label}</label>
      <select
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-xs font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
