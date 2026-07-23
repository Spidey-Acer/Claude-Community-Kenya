"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"
import { csrfHeaders, csrfToken } from "@/lib/csrf-client"

interface TeamMember {
  id: string
  slug: string | null
  name: string
  role: string
  tagline: string | null
  location: string | null
  bio: string
  longBio: string | null
  linkedIn: string | null
  github: string | null
  twitter: string | null
  website: string | null
  avatar: string | null
  order: number
  active: boolean
  featured: boolean
}

export function TeamMemberEditForm({ member }: { member: TeamMember }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)

    const body = {
      slug: (form.get("slug") as string)?.trim() || null,
      name: form.get("name"),
      role: form.get("role"),
      tagline: (form.get("tagline") as string)?.trim() || null,
      location: (form.get("location") as string)?.trim() || null,
      bio: form.get("bio"),
      longBio: (form.get("longBio") as string)?.trim() || null,
      linkedIn: form.get("linkedIn") || null,
      github: form.get("github") || null,
      twitter: form.get("twitter") || null,
      website: form.get("website") || null,
      avatar: form.get("avatar") || null,
      order: Number(form.get("order") ?? 0),
      active: form.get("active") === "on",
      featured: form.get("featured") === "on",
    }

    startTransition(async () => {
      const res = await fetch(`/api/admin/team/${member.id}`, {
        method: "PATCH",
        headers: await csrfHeaders(),
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error || "Failed to update.")
        return
      }
      router.push("/admin/team")
    })
  }

  function handleDelete() {
    if (!confirm(`Delete ${member.name}? This cannot be undone.`)) return
    startDelete(async () => {
      await fetch(`/api/admin/team/${member.id}`, {
        method: "DELETE",
        headers: { "x-csrf-token": await csrfToken() },
      })
      router.push("/admin/team")
    })
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button onClick={handleDelete} disabled={isDeleting}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-red-900/40 rounded text-[11px] font-mono text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50">
          <Trash2 className="w-3 h-3" />
          {isDeleting ? "Deleting..." : "Delete Member"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name *" name="name" defaultValue={member.name} required />
          <Field label="Role / Title *" name="role" defaultValue={member.role} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="URL slug" name="slug" defaultValue={member.slug ?? ""} placeholder="e.g. peter-kibet" />
          <Field label="Location" name="location" defaultValue={member.location ?? ""} placeholder="e.g. Nairobi, Kenya" />
        </div>
        <Field label="Tagline (short headline)" name="tagline" defaultValue={member.tagline ?? ""} placeholder="e.g. Founder, Spidey Labs" />
        <TextareaField label="Short bio *" name="bio" defaultValue={member.bio} required rows={3} />
        <TextareaField label="Long bio (for /team/[slug] detail page)" name="longBio" defaultValue={member.longBio ?? ""} rows={6} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="LinkedIn URL" name="linkedIn" type="url" defaultValue={member.linkedIn ?? ""} />
          <Field label="GitHub URL" name="github" type="url" defaultValue={member.github ?? ""} />
          <Field label="Twitter / X URL" name="twitter" type="url" defaultValue={member.twitter ?? ""} />
          <Field label="Website URL" name="website" type="url" defaultValue={member.website ?? ""} />
        </div>
        <Field label="Avatar URL" name="avatar" type="url" defaultValue={member.avatar ?? ""} />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[11px] font-mono text-[#555] mb-1.5">Display Order</label>
            <input name="order" type="number" min={0} defaultValue={member.order}
              className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-sm font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50" />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input name="active" id="active-edit" type="checkbox" defaultChecked={member.active}
              className="w-4 h-4 accent-green-500 cursor-pointer" />
            <label htmlFor="active-edit" className="text-[11px] font-mono text-[#555] cursor-pointer">Active (visible on site)</label>
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input name="featured" id="featured-edit" type="checkbox" defaultChecked={member.featured}
              className="w-4 h-4 accent-amber-500 cursor-pointer" />
            <label htmlFor="featured-edit" className="text-[11px] font-mono text-[#555] cursor-pointer">Featured (top of /team list)</label>
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
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </>
  )
}

function Field({ label, name, required, type = "text", defaultValue, placeholder }: {
  label: string; name: string; required?: boolean; type?: string; defaultValue?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-mono text-[#555] mb-1.5">{label}</label>
      <input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-sm font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50 transition-colors" />
    </div>
  )
}

function TextareaField({ label, name, required, rows, defaultValue }: {
  label: string; name: string; required?: boolean; rows: number; defaultValue?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-mono text-[#555] mb-1.5">{label}</label>
      <textarea name={name} required={required} rows={rows} defaultValue={defaultValue}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-sm font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50 transition-colors resize-y" />
    </div>
  )
}
