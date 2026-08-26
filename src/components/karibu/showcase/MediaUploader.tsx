"use client"

import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { Loader2, Upload, X, AlertTriangle, Film } from "lucide-react"
import {
  MAX_DEMO_BYTES,
  MAX_IMAGE_BYTES,
  MAX_MEDIA_PER_POST,
  UPLOAD_CONTENT_TYPES,
} from "@/lib/showcase/constants"
import type { MediaDescriptor } from "@/lib/showcase/media"

/**
 * MediaUploader — three-step client flow per file: presign, PUT to R2,
 * finalize. Each file tracks its own progress independently, and a failed
 * PUT or finalize drops only that file — the rest of the batch keeps going.
 *
 * `onChange` is a state setter (not a plain callback) so concurrent finalize
 * responses append to the latest media array instead of racing each other on
 * a stale closure.
 */

const IMAGE_CONTENT_TYPES = new Set<string>(["image/jpeg", "image/png", "image/webp"])

/** Mirrors the server's validateMediaSize ceiling per kind. */
function sizeLimitFor(contentType: string): number {
  return IMAGE_CONTENT_TYPES.has(contentType) ? MAX_IMAGE_BYTES : MAX_DEMO_BYTES
}

interface InFlightUpload {
  id: string
  fileName: string
  previewUrl?: string
  progress: number
  status: "uploading" | "finalizing" | "error"
  error?: string
}

interface MediaUploaderProps {
  value: MediaDescriptor[]
  onChange: Dispatch<SetStateAction<MediaDescriptor[]>>
  csrfToken: string
  disabled?: boolean
}

export function MediaUploader({ value, onChange, csrfToken, disabled }: MediaUploaderProps) {
  const [inFlight, setInFlight] = useState<InFlightUpload[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const xhrRefs = useRef<Record<string, XMLHttpRequest>>({})

  const slotsUsed = value.length + inFlight.length
  const atCapacity = slotsUsed >= MAX_MEDIA_PER_POST

  function updateInFlight(id: string, patch: Partial<InFlightUpload>) {
    setInFlight((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)))
  }

  function dismissInFlight(id: string) {
    xhrRefs.current[id]?.abort()
    delete xhrRefs.current[id]
    setInFlight((prev) => prev.filter((u) => u.id !== id))
  }

  function removeFinalized(key: string) {
    onChange((prev) => prev.filter((m) => m.key !== key))
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const picked = Array.from(fileList)
    if (inputRef.current) inputRef.current.value = ""

    if (slotsUsed + picked.length > MAX_MEDIA_PER_POST) {
      window.alert(`You can attach up to ${MAX_MEDIA_PER_POST} files per post.`)
      return
    }

    // Client-side pre-checks are a courtesy that avoids a wasted round trip —
    // the server re-checks the real bytes in finalize regardless.
    const accepted: File[] = []
    for (const file of picked) {
      if (!(UPLOAD_CONTENT_TYPES as readonly string[]).includes(file.type)) {
        window.alert(`${file.name}: unsupported file type.`)
        continue
      }
      const limit = sizeLimitFor(file.type)
      if (file.size > limit) {
        window.alert(`${file.name}: file is too large. Limit is ${Math.round(limit / (1024 * 1024))}MB.`)
        continue
      }
      accepted.push(file)
    }
    if (accepted.length === 0) return

    const items: InFlightUpload[] = accepted.map((file) => ({
      id: crypto.randomUUID(),
      fileName: file.name,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      progress: 0,
      status: "uploading",
    }))
    setInFlight((prev) => [...prev, ...items])

    let uploads: { uploadId: string; uploadUrl: string; key: string }[]
    try {
      const res = await fetch("/api/showcase/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({
          files: accepted.map((f) => ({ fileName: f.name, contentType: f.type, size: f.size })),
        }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Could not start upload")
      uploads = json.data.uploads
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not start upload"
      items.forEach((item) => updateInFlight(item.id, { status: "error", error: message }))
      return
    }

    accepted.forEach((file, i) => {
      const item = items[i]
      const target = uploads[i]
      if (!target) {
        updateInFlight(item.id, { status: "error", error: "Upload was not accepted" })
        return
      }
      putThenFinalize(file, target, item)
    })
  }

  function putThenFinalize(
    file: File,
    target: { uploadId: string; uploadUrl: string; key: string },
    item: InFlightUpload,
  ) {
    const xhr = new XMLHttpRequest()
    xhrRefs.current[item.id] = xhr
    xhr.open("PUT", target.uploadUrl)
    xhr.setRequestHeader("Content-Type", file.type)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        updateInFlight(item.id, { progress: Math.round((e.loaded / e.total) * 100) })
      }
    }

    xhr.onerror = () => updateInFlight(item.id, { status: "error", error: "Upload failed" })
    xhr.onabort = () => {
      /* dismissed by the member — no error state needed */
    }

    xhr.onload = () => {
      delete xhrRefs.current[item.id]
      if (xhr.status < 200 || xhr.status >= 300) {
        updateInFlight(item.id, { status: "error", error: "Upload failed" })
        return
      }
      updateInFlight(item.id, { status: "finalizing", progress: 100 })
      finalizeOne(target.key, item)
    }

    xhr.send(file)
  }

  async function finalizeOne(key: string, item: InFlightUpload) {
    try {
      const res = await fetch("/api/showcase/media/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({ key }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Could not process that upload")
      onChange((prev) => [...prev, json.data.media as MediaDescriptor])
      setInFlight((prev) => prev.filter((u) => u.id !== item.id))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not process that upload"
      updateInFlight(item.id, { status: "error", error: message })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {value.map((media) => (
          <div key={media.key} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-sand-2 bg-paper">
            {media.kind === "mp4" ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-muted">
                <Film className="h-6 w-6" />
                <span className="font-inter text-[9px]">MP4</span>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- R2-hosted upload, not a Next-optimizable local asset
              <img src={media.url} alt={media.alt || ""} className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => removeFinalized(media.key)}
              disabled={disabled}
              aria-label="Remove file"
              className="absolute right-0.5 top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-scrim/70 text-scrim-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {inFlight.map((item) => (
          <div key={item.id} className="relative h-24 w-24 overflow-hidden rounded-lg border border-sand-2 bg-paper">
            {item.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not a Next-optimizable asset
              <img src={item.previewUrl} alt="" className="h-full w-full object-cover opacity-60" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ink-muted">
                <Film className="h-6 w-6" />
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-paper/70 p-1 text-center">
              {item.status === "error" ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-error" />
                  <span className="font-inter text-[9px] leading-tight text-error">{item.error}</span>
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-clay" />
                  <span className="font-inter text-[9px] text-ink-soft">
                    {item.status === "finalizing" ? "Processing..." : `${item.progress}%`}
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissInFlight(item.id)}
              aria-label="Cancel upload"
              className="absolute right-0.5 top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-scrim/70 text-scrim-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {!atCapacity && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-sand-2 text-ink-muted transition-colors hover:border-clay hover:text-clay disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Upload className="h-5 w-5" />
            <span className="font-inter text-[10px]">Add file</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={UPLOAD_CONTENT_TYPES.join(",")}
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      <p className="font-inter text-[11px] text-ink-muted">
        Up to {MAX_MEDIA_PER_POST} files. Images up to {Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB, MP4 demos up to{" "}
        {Math.round(MAX_DEMO_BYTES / (1024 * 1024))}MB.
      </p>
    </div>
  )
}
