"use client"

import { Fragment, useRef, useState, useTransition } from "react"
import {
  BookOpen,
  Plus,
  X,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle,
  AlertTriangle,
  UploadCloud,
  FileText,
} from "lucide-react"
import { csrfHeaders, csrfToken } from "@/lib/csrf-client"
import { GUIDE_AUDIENCES, GUIDE_AUDIENCE_LABELS, formatFileSize, type GuideAudience } from "@/lib/guides"

interface AdminGuide {
  id: string
  slug: string
  title: string
  summary: string
  audience: string
  fileUrl: string
  fileSize: number
  pageCount: number | null
  coverUrl: string | null
  eventSlug: string | null
  sortOrder: number
  publishedAt: string | null
}

interface GuideFormState {
  title: string
  summary: string
  audience: GuideAudience
  fileUrl: string
  fileSize: number
  pageCount: string
  coverUrl: string
  eventSlug: string
  sortOrder: string
  published: boolean
}

const EMPTY_FORM: GuideFormState = {
  title: "",
  summary: "",
  audience: "BEGINNER",
  fileUrl: "",
  fileSize: 0,
  pageCount: "",
  coverUrl: "",
  eventSlug: "",
  sortOrder: "0",
  published: false,
}

function guideToForm(g: AdminGuide): GuideFormState {
  return {
    title: g.title,
    summary: g.summary,
    audience: (g.audience as GuideAudience) ?? "BEGINNER",
    fileUrl: g.fileUrl,
    fileSize: g.fileSize,
    pageCount: g.pageCount ? String(g.pageCount) : "",
    coverUrl: g.coverUrl ?? "",
    eventSlug: g.eventSlug ?? "",
    sortOrder: String(g.sortOrder),
    published: Boolean(g.publishedAt),
  }
}

/** Builds the JSON body the API expects from a form's string-typed fields. */
function formToPayload(f: GuideFormState) {
  return {
    title: f.title,
    summary: f.summary,
    audience: f.audience,
    fileUrl: f.fileUrl,
    fileSize: f.fileSize,
    pageCount: f.pageCount ? Number(f.pageCount) : undefined,
    coverUrl: f.coverUrl || undefined,
    eventSlug: f.eventSlug || undefined,
    sortOrder: f.sortOrder ? Number(f.sortOrder) : 0,
    published: f.published,
  }
}

async function uploadToGuides(file: File, folder: "guides" = "guides"): Promise<{ url: string; size: number }> {
  const token = await csrfToken()
  const formData = new FormData()
  formData.append("file", file)
  formData.append("folder", folder)

  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "x-csrf-token": token },
    body: formData,
  })
  const data = await res.json()
  if (!res.ok || !data.success) throw new Error(data.error || "Upload failed")
  return { url: data.url as string, size: data.size as number }
}

export function GuidesManager({ initialGuides }: { initialGuides: AdminGuide[] }) {
  const [guides, setGuides] = useState<AdminGuide[]>(initialGuides)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<GuideFormState>(EMPTY_FORM)
  const [addUploading, setAddUploading] = useState<"file" | "cover" | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<GuideFormState>(EMPTY_FORM)
  const [editUploading, setEditUploading] = useState<"file" | "cover" | null>(null)

  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null)

  const addFileInput = useRef<HTMLInputElement>(null)
  const editFileInput = useRef<HTMLInputElement>(null)

  function showFeedback(type: "success" | "error", message: string) {
    setFeedback({ type, message })
    if (type === "success") setTimeout(() => setFeedback(null), 3000)
  }

  async function handleFileUpload(
    file: File,
    target: "add" | "edit",
    kind: "file" | "cover"
  ) {
    const setUploading = target === "add" ? setAddUploading : setEditUploading
    const setForm = target === "add" ? setAddForm : setEditForm
    setUploading(kind)
    try {
      const { url, size } = await uploadToGuides(file)
      setForm((prev) =>
        kind === "file" ? { ...prev, fileUrl: url, fileSize: size } : { ...prev, coverUrl: url }
      )
    } catch (err) {
      showFeedback("error", err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(null)
    }
  }

  function handleCreate() {
    if (!addForm.title || !addForm.summary || !addForm.fileUrl) {
      showFeedback("error", "Title, summary and a PDF file are required")
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/guides", {
          method: "POST",
          headers: await csrfHeaders(),
          body: JSON.stringify(formToPayload(addForm)),
        })
        const data = await res.json()
        if (!data.success) {
          showFeedback("error", data.error || "Failed to create guide")
          return
        }
        setGuides((prev) => [...prev, data.data].sort((a, b) => a.sortOrder - b.sortOrder))
        setShowAddForm(false)
        setAddForm(EMPTY_FORM)
        showFeedback("success", "Guide created")
      } catch {
        showFeedback("error", "Network error — please try again")
      }
    })
  }

  function startEdit(guide: AdminGuide) {
    setEditingId(guide.id)
    setEditForm(guideToForm(guide))
    setConfirmingDelete(null)
  }

  function handleUpdate(id: string) {
    if (!editForm.title || !editForm.summary || !editForm.fileUrl) {
      showFeedback("error", "Title, summary and a PDF file are required")
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/guides/${id}`, {
          method: "PATCH",
          headers: await csrfHeaders(),
          body: JSON.stringify(formToPayload(editForm)),
        })
        const data = await res.json()
        if (!data.success) {
          showFeedback("error", data.error || "Failed to update guide")
          return
        }
        setGuides((prev) =>
          prev.map((g) => (g.id === id ? data.data : g)).sort((a, b) => a.sortOrder - b.sortOrder)
        )
        setEditingId(null)
        showFeedback("success", "Guide updated")
      } catch {
        showFeedback("error", "Network error — please try again")
      }
    })
  }

  function handleDelete(id: string) {
    if (confirmingDelete !== id) {
      setConfirmingDelete(id)
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/guides/${id}`, {
          method: "DELETE",
          headers: await csrfHeaders(),
        })
        const data = await res.json()
        if (!data.success) {
          showFeedback("error", data.error || "Failed to delete guide")
          setConfirmingDelete(null)
          return
        }
        setGuides((prev) => prev.filter((g) => g.id !== id))
        setConfirmingDelete(null)
        showFeedback("success", "Guide deleted")
      } catch {
        showFeedback("error", "Network error — please try again")
        setConfirmingDelete(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#00ff41]" />
          <h2 className="text-sm font-mono font-semibold text-[#e0e0e0]">Guides</h2>
          <span className="text-[10px] font-mono text-[#444]">({guides.length})</span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] rounded text-[11px] font-mono font-semibold hover:bg-[#00ff41]/20 transition-all"
        >
          {showAddForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showAddForm ? "Cancel" : "New Guide"}
        </button>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 p-3 rounded border text-[11px] font-mono ${
            feedback.type === "success"
              ? "bg-[#00ff41]/5 border-[#00ff41]/20 text-[#00ff41]"
              : "bg-[#ff3333]/5 border-[#ff3333]/20 text-[#ff3333]"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          {feedback.message}
        </div>
      )}

      {showAddForm && (
        <GuideForm
          form={addForm}
          setForm={setAddForm}
          uploading={addUploading}
          fileInputRef={addFileInput}
          onFileUpload={(file) => handleFileUpload(file, "add", "file")}
          onCoverUpload={(file) => handleFileUpload(file, "add", "cover")}
          onSubmit={handleCreate}
          isPending={isPending}
          submitLabel="Create Guide"
          heading="New Guide"
        />
      )}

      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-x-auto">
        {guides.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="w-8 h-8 text-[#333] mb-3" />
            <p className="text-sm font-mono text-[#555]">No guides yet</p>
            <p className="text-xs font-mono text-[#333] mt-1">Add the first one above</p>
          </div>
        ) : (
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-[#1e1e1e]">
                <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Audience</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Published</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Size</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Pages</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-right text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]">
              {guides.map((guide) => (
                <Fragment key={guide.id}>
                  <tr className="hover:bg-[#111] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="text-sm font-mono text-[#e0e0e0]">{guide.title}</div>
                      <div className="text-[11px] font-mono text-[#444]">/{guide.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#888]">
                        {GUIDE_AUDIENCE_LABELS[guide.audience as GuideAudience] ?? guide.audience}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                          guide.publishedAt
                            ? "text-[#00ff41] bg-[#00ff41]/5 border-[#00ff41]/20"
                            : "text-[#888] bg-[#888]/5 border-[#333]"
                        }`}
                      >
                        {guide.publishedAt ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#666]">{formatFileSize(guide.fileSize)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#666]">{guide.pageCount ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-mono text-[#666]">{guide.sortOrder}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => (editingId === guide.id ? setEditingId(null) : startEdit(guide))}
                          title="Edit"
                          className="p-1.5 rounded text-[#555] hover:text-[#ffb000] hover:bg-[#ffb000]/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(guide.id)}
                          disabled={isPending}
                          title={confirmingDelete === guide.id ? "Click again to confirm" : "Delete"}
                          className={`p-1.5 rounded transition-colors ${
                            confirmingDelete === guide.id
                              ? "text-[#ff3333] bg-[#ff3333]/10"
                              : "text-[#555] hover:text-[#ff3333] hover:bg-[#ff3333]/10"
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === guide.id && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <GuideForm
                          form={editForm}
                          setForm={setEditForm}
                          uploading={editUploading}
                          fileInputRef={editFileInput}
                          onFileUpload={(file) => handleFileUpload(file, "edit", "file")}
                          onCoverUpload={(file) => handleFileUpload(file, "edit", "cover")}
                          onSubmit={() => handleUpdate(guide.id)}
                          onCancel={() => setEditingId(null)}
                          isPending={isPending}
                          submitLabel="Save Changes"
                          heading={`Editing "${guide.title}"`}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function GuideForm({
  form,
  setForm,
  uploading,
  fileInputRef,
  onFileUpload,
  onCoverUpload,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
  heading,
}: {
  form: GuideFormState
  setForm: React.Dispatch<React.SetStateAction<GuideFormState>>
  uploading: "file" | "cover" | null
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onFileUpload: (file: File) => void
  onCoverUpload: (file: File) => void
  onSubmit: () => void
  onCancel?: () => void
  isPending: boolean
  submitLabel: string
  heading: string
}) {
  return (
    <div className="bg-[#0d0d0d] border border-[#00ff41]/20 rounded-lg p-4 space-y-3 m-3">
      <div className="text-[11px] font-mono font-semibold text-[#00ff41] uppercase tracking-wider">{heading}</div>

      <div>
        <label className="block text-[10px] font-mono text-[#555] mb-1">Title</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41]/50 focus:outline-none transition-colors"
          placeholder="Build Day notes: Claude from zero"
        />
      </div>

      <div>
        <label className="block text-[10px] font-mono text-[#555] mb-1">Summary</label>
        <textarea
          value={form.summary}
          onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))}
          rows={3}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41]/50 focus:outline-none transition-colors resize-y"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-[10px] font-mono text-[#555] mb-1">Audience</label>
          <select
            value={form.audience}
            onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value as GuideAudience }))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41]/50 focus:outline-none transition-colors"
          >
            {GUIDE_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {GUIDE_AUDIENCE_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-mono text-[#555] mb-1">Page count (optional)</label>
          <input
            type="number"
            min={1}
            value={form.pageCount}
            onChange={(e) => setForm((p) => ({ ...p, pageCount: e.target.value }))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41]/50 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono text-[#555] mb-1">Order</label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
            className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41]/50 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-mono text-[#555] mb-1">Event slug (optional)</label>
        <input
          type="text"
          value={form.eventSlug}
          onChange={(e) => setForm((p) => ({ ...p, eventSlug: e.target.value }))}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded px-3 py-2 text-sm font-mono text-[#e0e0e0] focus:border-[#00ff41]/50 focus:outline-none transition-colors"
          placeholder="build-day-2026-09"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[10px] font-mono text-[#555] mb-1">PDF file</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onFileUpload(file)
              e.target.value = ""
            }}
            className="w-full text-[11px] font-mono text-[#888] file:mr-3 file:px-3 file:py-1.5 file:rounded file:border file:border-[#222] file:bg-[#0a0a0a] file:text-[#888] file:text-[11px] file:font-mono"
          />
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono">
            {uploading === "file" ? (
              <span className="flex items-center gap-1 text-[#ffb000]">
                <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
              </span>
            ) : form.fileUrl ? (
              <span className="flex items-center gap-1 text-[#00ff41]">
                <FileText className="w-3 h-3" /> {formatFileSize(form.fileSize)} uploaded
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#555]">
                <UploadCloud className="w-3 h-3" /> No file yet — required
              </span>
            )}
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-mono text-[#555] mb-1">Cover image (optional)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onCoverUpload(file)
              e.target.value = ""
            }}
            className="w-full text-[11px] font-mono text-[#888] file:mr-3 file:px-3 file:py-1.5 file:rounded file:border file:border-[#222] file:bg-[#0a0a0a] file:text-[#888] file:text-[11px] file:font-mono"
          />
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono">
            {uploading === "cover" ? (
              <span className="flex items-center gap-1 text-[#ffb000]">
                <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
              </span>
            ) : form.coverUrl ? (
              <span className="text-[#00ff41]">Cover uploaded</span>
            ) : (
              <span className="text-[#555]">No cover — title card will show instead</span>
            )}
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-[11px] font-mono text-[#888]">
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))}
          className="accent-[#00ff41]"
        />
        Published — visible on /resources
      </label>

      <div className="flex items-center gap-2">
        <button
          onClick={onSubmit}
          disabled={isPending || uploading !== null}
          className="flex items-center gap-2 px-4 py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] rounded text-xs font-mono font-semibold hover:bg-[#00ff41]/20 disabled:opacity-40 transition-all"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {isPending ? "Saving..." : submitLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-mono text-[#555] hover:text-[#888] transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
