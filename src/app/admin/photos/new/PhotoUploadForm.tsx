"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react"
import { csrfToken } from "@/lib/csrf-client"

interface EventOption {
  id: string
  title: string
}

interface UploadResult {
  created: unknown[]
  failures: string[]
}

/** Upload form for one or more meetup photos. Submits multipart to /api/admin/photos/upload. */
export function PhotoUploadForm({ events }: { events: EventOption[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [failures, setFailures] = useState<string[]>([])
  const [fileCount, setFileCount] = useState(0)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFailures([])
    const form = e.currentTarget
    const data = new FormData(form)

    startTransition(async () => {
      const res = await fetch("/api/admin/photos/upload", {
        method: "POST",
        headers: { "x-csrf-token": await csrfToken() },
        body: data,
      })
      const json = (await res.json()) as { success: boolean; error?: string; data?: UploadResult }

      if (!res.ok || !json.success) {
        setError(json.error ?? "Upload failed.")
        return
      }

      const result = json.data!
      if (result.failures.length > 0) {
        setFailures(result.failures)
        // If some succeeded, redirect; otherwise stay and show all failures
        if (result.created.length > 0) {
          router.push("/admin/photos")
        }
        return
      }

      router.push("/admin/photos")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6">
      {/* File picker */}
      <div>
        <label className="block text-[11px] font-mono text-[#555] mb-1.5">
          Photos * <span className="text-[#333]">(up to 10 images, max 5 MB each)</span>
        </label>
        <input
          name="files"
          type="file"
          accept="image/*"
          multiple
          required
          onChange={e => setFileCount(e.currentTarget.files?.length ?? 0)}
          className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-sm font-mono text-[#ccc] file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-mono file:bg-[#1e1e1e] file:text-[#888] hover:file:bg-[#2a2a2a] focus:outline-none focus:border-[#00ff41]/50 transition-colors"
        />
        {fileCount > 0 && (
          <p className="mt-1 text-[11px] font-mono text-[#555]">{fileCount} file{fileCount !== 1 ? "s" : ""} selected</p>
        )}
      </div>

      {/* Event dropdown */}
      <div>
        <label className="block text-[11px] font-mono text-[#555] mb-1.5">Event <span className="text-[#333]">(optional)</span></label>
        <select
          name="eventId"
          className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-sm font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50 transition-colors"
        >
          <option value="">— general / no event —</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
      </div>

      {/* Metadata (applied to all uploaded files) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Photographer" name="photographer" placeholder="e.g. John Doe" />
        <div>
          <label className="block text-[11px] font-mono text-[#555] mb-1.5">Featured</label>
          <div className="flex items-center gap-2 pt-1">
            <input name="featured" id="featured-upload" type="checkbox" value="true"
              className="w-4 h-4 accent-green-500 cursor-pointer" />
            <label htmlFor="featured-upload" className="text-[11px] font-mono text-[#555] cursor-pointer">Mark all as featured</label>
          </div>
        </div>
      </div>
      <Field label="Caption" name="caption" placeholder="Applies to all uploaded photos" />
      <Field label="Alt text" name="alt" placeholder="Describes the image for screen readers" />

      {/* Errors */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-900/40 rounded text-[11px] font-mono text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}
      {failures.length > 0 && (
        <div className="p-3 bg-red-900/20 border border-red-900/40 rounded space-y-1">
          <p className="text-[11px] font-mono text-red-400 font-semibold">Some files failed:</p>
          {failures.map((f, i) => (
            <p key={i} className="text-[11px] font-mono text-red-400">• {f}</p>
          ))}
        </div>
      )}

      <button type="submit" disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-sm font-mono text-[#00ff41] hover:bg-[#00ff41]/20 transition-colors disabled:opacity-50">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {isPending ? `Uploading ${fileCount} file${fileCount !== 1 ? "s" : ""}…` : "Upload Photos"}
      </button>
    </form>
  )
}

function Field({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-mono text-[#555] mb-1.5">{label}</label>
      <input name={name} type="text" placeholder={placeholder}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-sm font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50 transition-colors" />
    </div>
  )
}
