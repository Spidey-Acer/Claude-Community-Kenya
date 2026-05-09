"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2 } from "lucide-react"

export function TeamMemberNewForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)

    const body = {
      name: form.get("name"),
      role: form.get("role"),
      bio: form.get("bio"),
      linkedIn: form.get("linkedIn") || null,
      github: form.get("github") || null,
      twitter: form.get("twitter") || null,
      website: form.get("website") || null,
      avatar: form.get("avatar") || null,
      order: Number(form.get("order") ?? 0),
      active: form.get("active") === "on",
    }

    startTransition(async () => {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to create team member.")
        return
      }
      router.push("/admin/team")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" name="name" required />
        <Field label="Role / Title *" name="role" required placeholder="e.g. Community Lead" />
      </div>
      <TextareaField label="Bio *" name="bio" required rows={4} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="LinkedIn URL" name="linkedIn" type="url" />
        <Field label="GitHub URL" name="github" type="url" />
        <Field label="Twitter / X URL" name="twitter" type="url" />
        <Field label="Website URL" name="website" type="url" />
      </div>
      <Field label="Avatar URL" name="avatar" type="url" placeholder="https://..." />
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-[11px] font-mono text-[#555] mb-1.5">Display Order</label>
          <input name="order" type="number" min={0} defaultValue={0}
            className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-sm font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50" />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input name="active" id="active-new" type="checkbox" defaultChecked
            className="w-4 h-4 accent-green-500 cursor-pointer" />
          <label htmlFor="active-new" className="text-[11px] font-mono text-[#555] cursor-pointer">Active (visible on site)</label>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-900/40 rounded text-[11px] font-mono text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      <button type="submit" disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-sm font-mono text-[#00ff41] hover:bg-[#00ff41]/20 transition-colors disabled:opacity-50">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {isPending ? "Saving..." : "Add Member"}
      </button>
    </form>
  )
}

function Field({ label, name, required, type = "text", placeholder }: {
  label: string; name: string; required?: boolean; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-mono text-[#555] mb-1.5">{label}</label>
      <input name={name} type={type} required={required} placeholder={placeholder}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-sm font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50 transition-colors" />
    </div>
  )
}

function TextareaField({ label, name, required, rows }: {
  label: string; name: string; required?: boolean; rows: number
}) {
  return (
    <div>
      <label className="block text-[11px] font-mono text-[#555] mb-1.5">{label}</label>
      <textarea name={name} required={required} rows={rows}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-sm font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50 transition-colors resize-y" />
    </div>
  )
}
