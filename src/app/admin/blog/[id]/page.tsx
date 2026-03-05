import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Edit, Trash2, Eye, Clock, Star, Tag, User, Calendar } from "lucide-react"
import { DeleteBlogButton } from "./DeleteBlogButton"

export const dynamic = "force-dynamic"

export default async function BlogPostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await prisma.blogPost.findUnique({ where: { id } })
  if (!post) notFound()

  const tags = Array.isArray(post.tags) ? (post.tags as string[]) : []

  return (
    <div>
      <AdminHeader title="Blog Post" />
      <div className="p-6 max-w-5xl space-y-4">
        {/* Back + Status */}
        <div className="flex items-center justify-between">
          <Link href="/admin/blog" className="flex items-center gap-1.5 text-xs font-mono text-[#555] hover:text-[#ccc] transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to posts
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/blog/${post.id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[#00ff41] hover:bg-[#00ff41]/20 transition-colors"
            >
              <Edit className="w-3 h-3" />
              Edit
            </Link>
            <DeleteBlogButton id={post.id} title={post.title} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Post Header */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge status={post.status} />
                {post.featured && (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#ffb000]/10 border border-[#ffb000]/30 text-[#ffb000]">
                    <Star className="w-2.5 h-2.5" />
                    Featured
                  </span>
                )}
              </div>
              <h1 className="text-lg font-mono font-bold text-[#e0e0e0] mb-2">{post.title}</h1>
              <p className="text-sm font-mono text-[#888] leading-relaxed mb-4">{post.excerpt}</p>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] border border-[#222] text-[#555]">
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Content Preview */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-5">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Content Preview</h2>
              <div className="text-sm font-mono text-[#aaa] leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto pr-2">
                {post.content}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Author & Slug */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Post Info</h2>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-[#555]" />
                  <span className="text-[11px] font-mono text-[#888]">{post.author}</span>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-[#444] mb-0.5">Slug</div>
                  <div className="text-[11px] font-mono text-[#666] break-all">{post.slug}</div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Stats</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#555]">
                    <Eye className="w-3 h-3" />
                    Views
                  </span>
                  <span className="text-[11px] font-mono text-[#888]">{post.views}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-mono text-[#555]">
                    <Clock className="w-3 h-3" />
                    Reading Time
                  </span>
                  <span className="text-[11px] font-mono text-[#888]">{post.readingTime ? `${post.readingTime} min` : "---"}</span>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg p-4">
              <h2 className="text-[11px] font-mono font-semibold text-[#555] uppercase tracking-wider mb-3">Metadata</h2>
              <div className="space-y-1.5 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-[#555]">Created</span>
                  <span className="text-[#888]">{formatDate(post.createdAt.toISOString())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Updated</span>
                  <span className="text-[#888]">{formatDate(post.updatedAt.toISOString())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-[#555]">
                    <Calendar className="w-2.5 h-2.5" />
                    Published
                  </span>
                  <span className="text-[#888]">{post.publishedAt ? formatDate(post.publishedAt.toISOString()) : "---"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">Status</span>
                  <StatusBadge status={post.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-[#555]">ID</span>
                  <span className="text-[#333] text-[10px]">{post.id.slice(0, 12)}...</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
