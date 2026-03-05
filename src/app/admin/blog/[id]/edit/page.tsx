"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, X, Loader2 } from "lucide-react"

interface BlogPostData {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  author: string
  tags: string[]
  publishedAt: string | null
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
  readingTime: number | null
  featured: boolean
}

interface ApiResponse {
  success: boolean
  data: BlogPostData
  error?: string
  details?: Array<{ message: string }>
}

export default function EditBlogPostPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const [isPending, startTransition] = useTransition()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [slug, setSlug] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [content, setContent] = useState("")
  const [author, setAuthor] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [publishedAt, setPublishedAt] = useState("")
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT")
  const [readingTime, setReadingTime] = useState<number | "">("")
  const [featured, setFeatured] = useState(false)

  const fetchPost = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/blog/${id}`)
      const data = await res.json() as ApiResponse
      if (!res.ok) throw new Error(data.error || "Failed to fetch post")

      const post = data.data
      setTitle(post.title)
      setSlug(post.slug)
      setExcerpt(post.excerpt)
      setContent(post.content)
      setAuthor(post.author)
      setTags(Array.isArray(post.tags) ? post.tags : [])
      setPublishedAt(post.publishedAt ? post.publishedAt.slice(0, 10) : "")
      setStatus(post.status)
      setReadingTime(post.readingTime ?? "")
      setFeatured(post.featured)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load post")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetchPost()
  }, [fetchPost])

  function addTag(value: string) {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed])
    }
    setTagInput("")
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag(tagInput)
    }
    if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        const csrfRes = await fetch("/api/csrf-token")
        const { csrfToken } = await csrfRes.json() as { csrfToken: string }

        const body: Record<string, unknown> = {
          title,
          slug,
          excerpt,
          content,
          author,
          tags,
          status,
          featured,
        }
        if (readingTime !== "") body.readingTime = Number(readingTime)

        const res = await fetch(`/api/admin/blog/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
          body: JSON.stringify(body),
        })

        const data = await res.json() as ApiResponse
        if (!res.ok) {
          const detail = data.details?.[0]?.message
          throw new Error(detail || data.error || "Failed to update post")
        }

        setSuccess("Post updated successfully")
        setTimeout(() => router.push(`/admin/blog/${id}`), 1000)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update post")
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-5 h-5 text-[#555] animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={`/admin/blog/${id}`} className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to post
        </Link>
        <h1 className="text-sm font-mono font-semibold text-[#e0e0e0]">Edit Post</h1>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#ff3333]/10 border border-[#ff3333]/30 rounded text-[11px] font-mono text-[#ff3333]">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41]">
          {success}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={3}
              maxLength={200}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#1e1e1e] rounded text-sm font-mono text-[#e0e0e0] placeholder-[#333] focus:outline-none focus:border-[#00ff41]/50 transition-colors"
              placeholder="Post title"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-1.5">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#1e1e1e] rounded text-sm font-mono text-[#888] placeholder-[#333] focus:outline-none focus:border-[#00ff41]/50 transition-colors"
              placeholder="post-slug"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-1.5">Excerpt</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              required
              minLength={10}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#1e1e1e] rounded text-sm font-mono text-[#e0e0e0] placeholder-[#333] focus:outline-none focus:border-[#00ff41]/50 transition-colors resize-vertical"
              placeholder="Short description of the post"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-1.5">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              minLength={50}
              rows={24}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#1e1e1e] rounded text-sm font-mono text-[#e0e0e0] placeholder-[#333] focus:outline-none focus:border-[#00ff41]/50 transition-colors resize-vertical leading-relaxed"
              placeholder="Full post content..."
            />
          </div>

          {/* Author + Status row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-1.5">Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                required
                maxLength={100}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#1e1e1e] rounded text-sm font-mono text-[#e0e0e0] placeholder-[#333] focus:outline-none focus:border-[#00ff41]/50 transition-colors"
                placeholder="Author name"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "DRAFT" | "PUBLISHED" | "ARCHIVED")}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#1e1e1e] rounded text-sm font-mono text-[#e0e0e0] focus:outline-none focus:border-[#00ff41]/50 transition-colors"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#222] text-[#888]">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-[#555] hover:text-[#ff3333] transition-colors">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => { if (tagInput.trim()) addTag(tagInput) }}
              className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#1e1e1e] rounded text-sm font-mono text-[#e0e0e0] placeholder-[#333] focus:outline-none focus:border-[#00ff41]/50 transition-colors"
              placeholder="Type tag and press Enter or comma to add"
            />
          </div>

          {/* Published At + Reading Time + Featured row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-1.5">Published At</label>
              <input
                type="date"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#1e1e1e] rounded text-sm font-mono text-[#e0e0e0] focus:outline-none focus:border-[#00ff41]/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-1.5">Reading Time (min)</label>
              <input
                type="number"
                value={readingTime}
                onChange={(e) => setReadingTime(e.target.value ? parseInt(e.target.value, 10) : "")}
                min={1}
                className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#1e1e1e] rounded text-sm font-mono text-[#e0e0e0] placeholder-[#333] focus:outline-none focus:border-[#00ff41]/50 transition-colors"
                placeholder="5"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1e1e1e] bg-[#0a0a0a] text-[#00ff41] focus:ring-[#00ff41]/50 accent-[#00ff41]"
                />
                <span className="text-[11px] font-mono text-[#888]">Featured post</span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href={`/admin/blog/${id}`}
            className="px-4 py-2 text-[11px] font-mono text-[#555] hover:text-[#888] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41] hover:bg-[#00ff41]/20 transition-colors disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  )
}
