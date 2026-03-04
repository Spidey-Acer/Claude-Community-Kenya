import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { StatusBadge } from "@/components/admin/StatusBadge"
import { formatDate } from "@/lib/utils"
import { FileText, Plus } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function BlogAdminPage() {
  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      author: true,
      status: true,
      featured: true,
      views: true,
      publishedAt: true,
      tags: true,
      createdAt: true,
    },
  })

  return (
    <div>
      <AdminHeader title="Blog Posts" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono text-[#555]">{posts.length} posts total</p>
          <div className="flex items-center gap-2 px-3 py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded text-[11px] font-mono text-[#00ff41] cursor-not-allowed opacity-60">
            <Plus className="w-3.5 h-3.5" />
            New Post
            <span className="ml-1 text-[9px] text-[#00ff41]/60">(coming soon)</span>
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-hidden">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-8 h-8 text-[#333] mb-3" />
              <p className="text-sm font-mono text-[#555]">No blog posts found</p>
              <p className="text-xs font-mono text-[#333] mt-1">Run the seed script to populate blog posts</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Author</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Views</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Published</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Featured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141414]">
                {posts.map((post) => {
                  const tags = Array.isArray(post.tags) ? (post.tags as string[]) : []
                  return (
                    <tr key={post.id} className="hover:bg-[#111] transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-mono text-[#e0e0e0]">{post.title}</div>
                        <div className="flex gap-1 mt-1">
                          {tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1a1a1a] border border-[#222] text-[#555]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-mono text-[#666]">{post.author}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={post.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-mono text-[#666]">{post.views}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-mono text-[#444]">
                          {post.publishedAt ? formatDate(post.publishedAt.toISOString()) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-mono ${post.featured ? "text-[#00ff41]" : "text-[#333]"}`}>
                          {post.featured ? "Yes" : "—"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
