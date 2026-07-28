"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react"
import { csrfToken } from "@/lib/csrf-client"

interface EventOption {
  id: string
  title: string
}

interface PresignedUpload {
  photoId: string
  fileName: string
  uploadUrl: string
  contentType: string
  ext: string
}

/** Concurrent direct-to-R2 uploads. Enough to saturate a link, few enough
 *  not to starve the browser's connection pool on a phone. */
const UPLOAD_CONCURRENCY = 4

/** Run `worker` over `items` with a bounded number in flight. */
async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      results[i] = await worker(items[i], i)
    }
  })
  await Promise.all(runners)
  return results
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
  const [progress, setProgress] = useState({ done: 0, total: 0 })

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
    const eventId = (form.elements.namedItem("eventId") as HTMLSelectElement).value
    const photographer = (form.elements.namedItem("photographer") as HTMLInputElement).value
    const featured = (form.elements.namedItem("featured") as HTMLInputElement).checked

    if (!eventId) {
      setError("Choose an event — /gallery is an index of event albums, and a photo with no event has no page to appear on.")
      return
    }

    startTransition(async () => {
      const token = await csrfToken()
      const localFailures: string[] = []

      // 1. Ask the server for one signed PUT URL per file. This also creates
      //    the rows, so an interrupted batch leaves visible, cleanable records
      //    rather than orphaned objects in the bucket.
      const presignRes = await fetch("/api/admin/photos/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": token },
        body: JSON.stringify({
          eventId,
          photographer: photographer || null,
          featured,
          files: entries.map((entry) => ({
            fileName: entry.file.name,
            contentType: entry.file.type,
            size: entry.file.size,
            alt: entry.alt,
            caption: entry.caption,
          })),
        }),
      })
      const presignJson = (await presignRes.json()) as {
        success: boolean
        error?: string
        data?: { uploads: PresignedUpload[] }
      }
      if (!presignRes.ok || !presignJson.success || !presignJson.data) {
        setError(presignJson.error ?? "Could not start the upload.")
        return
      }

      const uploads = presignJson.data.uploads
      setProgress({ done: 0, total: uploads.length })

      // 2. Upload each original straight to R2. Bytes never touch the app.
      // 3. Then finalize that one photo, which generates its derivatives.
      await pool(uploads, UPLOAD_CONCURRENCY, async (upload, i) => {
        try {
          const put = await fetch(upload.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": upload.contentType },
            body: entries[i].file,
          })
          if (!put.ok) throw new Error(`storage rejected the upload (${put.status})`)

          const finalizeRes = await fetch("/api/admin/photos/finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-csrf-token": token },
            body: JSON.stringify({
              photoId: upload.photoId,
              ext: upload.ext,
              contentType: upload.contentType,
            }),
          })
          const finalizeJson = (await finalizeRes.json()) as { success: boolean; error?: string }
          if (!finalizeRes.ok || !finalizeJson.success) {
            throw new Error(finalizeJson.error ?? "processing failed")
          }
        } catch (err) {
          localFailures.push(
            `${upload.fileName}: ${err instanceof Error ? err.message : String(err)}`,
          )
        } finally {
          setProgress((p) => ({ done: p.done + 1, total: p.total }))
        }
      })

      if (localFailures.length > 0) {
        setFailures(localFailures)
        // Some succeeded — send the user to the list to see them rather than
        // stranding them on a form they would have to re-fill.
        if (localFailures.length < uploads.length) router.push("/admin/photos")
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
          Photos * <span className="text-[#333]">(up to 200, max 25 MB each)</span>
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
          Event *
        </label>
        <select
          id="photo-event"
          name="eventId"
          required
          defaultValue=""
          className="w-full rounded border border-[#1e1e1e] bg-[#111] px-3 py-2 font-mono text-sm text-[#ccc] transition-colors focus:border-[#00ff41]/50 focus:outline-none"
        >
          <option value="" disabled>
            Select an event…
          </option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
        <p className="mt-1 font-mono text-[11px] text-[#444]">
          /gallery is an index of event albums — a photo with no event has no page to appear on.
        </p>
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
          ? progress.total > 0
            ? `Uploading ${progress.done} / ${progress.total}…`
            : "Preparing…"
          : "Upload Photos"}
      </button>
    </form>
  )
}
