"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"
import { csrfHeaders, csrfToken } from "@/lib/csrf-client"

interface EventOption {
  id: string
  title: string
}

interface Photo {
  id: string
  url: string
  thumbnailUrl: string | null
  alt: string | null
  caption: string | null
  photographer: string | null
  eventId: string | null
  featured: boolean
  order: number
  takenAt: Date | null
}

/** Edit form for a single meetup photo. Reads-only the URL; all other fields are editable. */
export function PhotoEditForm({ photo, events }: { photo: Photo; events: EventOption[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDelete] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)

    const takenAtRaw = form.get("takenAt") as string | null
    const body = {
      caption: (form.get("caption") as string) || null,
      alt: (form.get("alt") as string) || null,
      photographer: (form.get("photographer") as string) || null,
      eventId: form.get("eventId") as string,
      featured: form.get("featured") === "on",
      order: Number(form.get("order") ?? 0),
      takenAt: takenAtRaw ? new Date(takenAtRaw).toISOString() : null,
    }

    startTransition(async () => {
      const res = await fetch(`/api/admin/photos/${photo.id}`, {
        method: "PATCH",
        headers: await csrfHeaders(),
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok || !json.success) {
        setError(json.error ?? "Failed to update.")
        return
      }
      router.push("/admin/photos")
    })
  }

  function handleDelete() {
    if (!window.confirm("Delete this photo? This is permanent.")) return
    startDelete(async () => {
      await fetch(`/api/admin/photos/${photo.id}`, {
        method: "DELETE",
        headers: { "x-csrf-token": await csrfToken() },
      })
      router.push("/admin/photos")
    })
  }

  // Format takenAt for datetime-local input (YYYY-MM-DDTHH:mm)
  const takenAtValue = photo.takenAt
    ? new Date(photo.takenAt).toISOString().slice(0, 16)
    : ""

  return (
    <>
      {/* Image preview */}
      <div className="mb-4">
        <img
          src={photo.thumbnailUrl ?? photo.url}
          alt={photo.alt ?? ""}
          className="h-40 w-auto max-w-full rounded border border-[#1e1e1e] object-cover bg-[#111]"
        />
        <p className="mt-1 text-[11px] font-mono text-[#444] break-all">{photo.url}</p>
      </div>

      <div className="mb-4 flex justify-end">
        <button onClick={handleDelete} disabled={isDeleting}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-red-900/40 rounded text-[11px] font-mono text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50">
          <Trash2 className="w-3 h-3" />
          {isDeleting ? "Deleting…" : "Delete Photo"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-6">
        {/* Event dropdown */}
        <div>
          <label className="block text-[11px] font-mono text-[#555] mb-1.5">Event</label>
          <select
            name="eventId"
            required
            defaultValue={photo.eventId ?? ""}
            className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-sm font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50 transition-colors"
          >
            {!photo.eventId && (
              <option value="" disabled>
                Select an event…
              </option>
            )}
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] font-mono text-[#444]">
            /gallery is an index of event albums — a photo with no event has no page to appear on.
          </p>
        </div>

        <TextareaField label="Caption" name="caption" defaultValue={photo.caption ?? ""} rows={2} />
        <TextareaField label="Alt text" name="alt" defaultValue={photo.alt ?? ""} rows={2} />
        <Field label="Photographer" name="photographer" defaultValue={photo.photographer ?? ""} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[11px] font-mono text-[#555] mb-1.5">Display Order</label>
            <input name="order" type="number" min={0} defaultValue={photo.order}
              className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-sm font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50" />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-[#555] mb-1.5">Taken At</label>
            <input name="takenAt" type="datetime-local" defaultValue={takenAtValue}
              className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-sm font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input name="featured" id="featured-edit" type="checkbox" defaultChecked={photo.featured}
            className="w-4 h-4 accent-green-500 cursor-pointer" />
          <label htmlFor="featured-edit" className="text-[11px] font-mono text-[#555] cursor-pointer">Featured (shown first on gallery)</label>
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
          {isPending ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </>
  )
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-mono text-[#555] mb-1.5">{label}</label>
      <input name={name} type="text" defaultValue={defaultValue}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-sm font-mono text-[#ccc] placeholder:text-[#333] focus:outline-none focus:border-[#00ff41]/50 transition-colors" />
    </div>
  )
}

function TextareaField({ label, name, rows, defaultValue }: {
  label: string; name: string; rows: number; defaultValue?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-mono text-[#555] mb-1.5">{label}</label>
      <textarea name={name} rows={rows} defaultValue={defaultValue}
        className="w-full bg-[#111] border border-[#1e1e1e] rounded px-3 py-2 text-sm font-mono text-[#ccc] focus:outline-none focus:border-[#00ff41]/50 transition-colors resize-y" />
    </div>
  )
}
