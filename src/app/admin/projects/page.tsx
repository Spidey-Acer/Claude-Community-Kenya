import { prisma } from "@/lib/prisma"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { Rocket } from "lucide-react"
import { ProjectFeaturedToggle } from "@/components/admin/ProjectFeaturedToggle"

export const dynamic = "force-dynamic"

/**
 * Admin listing for community-submitted projects.
 *
 * getProjects() (src/lib/data.ts) is unfiltered — the public /projects
 * showcase shows every submission. This page exists so an admin can flip
 * `featured`, the flag that controls the homepage spotlight and the AI
 * chat context (both read via getFeaturedProjects()). No create/delete/
 * other-field editing here by design — projects come in through the public
 * submission form, this is just the featured toggle.
 */
export default async function ProjectsAdminPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, builder: true, featured: true, createdAt: true },
  })

  return (
    <div>
      <AdminHeader title="Projects" />
      <div className="p-6 space-y-4">
        <p className="text-xs font-mono text-[#555]">
          {projects.length} project{projects.length !== 1 ? "s" : ""} total — toggle Featured to surface a project on
          the homepage spotlight
        </p>

        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg overflow-x-auto">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Rocket className="w-8 h-8 text-[#333] mb-3" />
              <p className="text-sm font-mono text-[#555]">No projects yet</p>
              <p className="text-xs font-mono text-[#333] mt-1">Submissions come in through the public /submit-project form.</p>
            </div>
          ) : (
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Builder</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono font-semibold text-[#555] uppercase tracking-wider">Featured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1a1a]">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-[#111] transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-[#ccc]">{p.name}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#888]">{p.builder}</td>
                    <td className="px-4 py-3">
                      <ProjectFeaturedToggle id={p.id} featured={p.featured} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
