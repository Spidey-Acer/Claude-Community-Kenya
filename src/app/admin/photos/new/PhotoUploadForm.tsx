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

/** Per-file metadata, kept alongside the File so the two cannot fall out of order. */
interface FileEntry {
  file: File
  alt: string
  caption: string
}

/**
 * Upload form for one or more meetup photos.
 *
 * Alt text and caption are per file. They used to be single fields applied to
 * the whole batch, which meant uploading forty photos gave all forty the same
 * alt text — forty identical descriptions is noise to a screen reader, and
 * strictly worse than none at all.
 *
 * Empty alt is a legitimate, and usually correct, answer. Most gallery shots
 * are decorative crowd photos carrying no information the caption does not
 * already give; `alt=""` tells a screen reader to skip them. Alt is worth
 * writing when *who* or *what* matters — a speaker, a demo, a whiteboard.
 */
export function PhotoUploadForm({ events }: { events: EventOption[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [failures, setFailures] = useState<string[]>([])
  const [entries, setEntries] = useState<FileEntry[]>([])

  function onFilesPicked(fileList: FileList | null) {
    setEntries(
      Array.from(fileList ?? []).map((file) => ({ file, alt: "", caption: "" })),
    )
  }

  function updateEntry(index: number, patch: Partial<FileEntry>) {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFailures([])

    if (entries.length === 0) {
      setError("Pick at least one photo.")
      return
    }

    const form = e.currentTarget
    const data = new FormData()
    const eventId = (form.elements.namedItem("eventId") as HTMLSelectElement).value
    const photographer = (form.elements.namedItem("photographer") as HTMLInputElement).value
    const featured = (form.elements.namedItem("featured") as HTMLInputElement).checked

    if (eventId) data.set("eventId", eventId)
    if (photographer) data.set("photographer", photographer)
    data.set("featured", String(featured))

    // Appended in lockstep so the server can index-match files to metadata.
    for (const entry of entries) {
      data.append("files", entry.file)
      data.append("alt", entry.alt)
      data.append("caption", entry.caption)
    }

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
        if (result.created.length > 0) router.push("/admin/photos")
        return
      }

      router.push("/admin/photos")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d] p-6">
      {/* File picker */}
      <div>
        <label htmlFor="photo-files" className="mb-1.5 block font-mono text-[11px] text-[#555]">
          Photos *
        </label>
        <input
          id="photo-files"
          name="files"
          type="file"
          accept="image/*"
          multiple
          required
          onChange={(e) => onFilesPicked(e.currentTarget.files)}
          className="w-full rounded border border-[#1e1e1e] bg-[#111] px-3 py-2 font-mono text-sm text-[#ccc] transition-colors file:mr-3 file:rounded file:border-0 file:bg-[#1e1e1e] file:px-2 file:py-1 file:font-mono file:text-[11px] file:text-[#888] hover:file:bg-[#2a2a2a] focus:border-[#00ff41]/50 focus:outline-none"
        />
        {entries.length > 0 && (
          <p className="mt-1 font-mono text-[11px] text-[#555]">
            {entries.length} file{entries.length !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>

      {/* Event dropdown */}
      <div>
        <label htmlFor="photo-event" className="mb-1.5 block font-mono text-[11px] text-[#555]">
          Event <span className="text-[#333]">(optional)</span>
        </label>
        <select
          id="photo-event"
          name="eventId"
          className="w-full rounded border border-[#1e1e1e] bg-[#111] px-3 py-2 font-mono text-sm text-[#ccc] transition-colors focus:border-[#00ff41]/50 focus:outline-none"
        >
          <option value="">— general / no event —</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
      </div>

      {/* Batch-wide metadata — only the fields that genuinely are batch-wide. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="photo-photographer" className="mb-1.5 block font-mono text-[11px] text-[#555]">
            Photographer
          </label>
          <input
            id="photo-photographer"
            name="photographer"
            type="text"
            placeholder="e.g. John Doe"
            className="w-full rounded border border-[#1e1e1e] bg-[#111] px-3 py-2 font-mono text-sm text-[#ccc] transition-colors placeholder:text-[#333] focus:border-[#00ff41]/50 focus:outline-none"
          />
        </div>
        <div>
          <span className="mb-1.5 block font-mono text-[11px] text-[#555]">Featured</span>
          <div className="flex items-center gap-2 pt-1">
            <input name="featured" id="featured-upload" type="checkbox" className="h-4 w-4 cursor-pointer accent-green-500" />
            <label htmlFor="featured-upload" className="cursor-pointer font-mono text-[11px] text-[#555]">
              Mark all as featured
            </label>
          </div>
        </div>
      </div>

      {/* Per-file metadata */}
      {entries.length > 0 && (
        <fieldset className="space-y-3 rounded border border-[#1e1e1e] p-4">
          <legend className="px-1 font-mono text-[11px] text-[#555]">
            Per-photo details — leave alt empty for decorative shots
          </legend>
          {entries.map((entry, i) => (
            <div key={`${entry.file.name}-${i}`} className="grid gap-2 border-b border-[#161616] pb-3 last:border-0 last:pb-0 sm:grid-cols-[1fr_1fr]">
              <p className="col-span-full truncate font-mono text-[11px] text-[#777]" title={entry.file.name}>
                {entry.file.name}{" "}
                <span className="text-[#444]">({Math.round(entry.file.size / 1024)} KB)</span>
              </p>
              <div>
                <label htmlFor={`alt-${i}`} className="mb-1 block font-mono text-[10px] text-[#444]">
                  Alt text
                </label>
                <input
                  id={`alt-${i}`}
                  type="text"
                  value={entry.alt}
                  onChange={(e) => updateEntry(i, { alt: e.currentTarget.value })}
                  placeholder="Only if who/what matters"
                  className="w-full rounded border border-[#1e1e1e] bg-[#111] px-2.5 py-1.5 font-mono text-xs text-[#ccc] transition-colors placeholder:text-[#333] focus:border-[#00ff41]/50 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor={`caption-${i}`} className="mb-1 block font-mono text-[10px] text-[#444]">
                  Caption
                </label>
                <input
                  id={`caption-${i}`}
                  type="text"
                  value={entry.caption}
                  onChange={(e) => updateEntry(i, { caption: e.currentTarget.value })}
                  placeholder="Shown under the photo"
                  className="w-full rounded border border-[#1e1e1e] bg-[#111] px-2.5 py-1.5 font-mono text-xs text-[#ccc] transition-colors placeholder:text-[#333] focus:border-[#00ff41]/50 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </fieldset>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded border border-red-900/40 bg-red-900/20 p-3 font-mono text-[11px] text-red-400" role="alert">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
      {failures.length > 0 && (
        <div className="space-y-1 rounded border border-red-900/40 bg-red-900/20 p-3" role="alert">
          <p className="font-mono text-[11px] font-semibold text-red-400">Some files failed:</p>
          {failures.map((f, i) => (
            <p key={i} className="font-mono text-[11px] text-red-400">• {f}</p>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-2 rounded border border-[#00ff41]/30 bg-[#00ff41]/10 px-4 py-2 font-mono text-sm text-[#00ff41] transition-colors hover:bg-[#00ff41]/20 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {isPending
          ? `Uploading ${entries.length} file${entries.length !== 1 ? "s" : ""}…`
          : "Upload Photos"}
      </button>
    </form>
  )
}
