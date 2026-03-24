"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

const TYPES = [
  { key: "", label: "All" },
  { key: "MCP", label: "MCPs" },
  { key: "PROMPT", label: "Prompts" },
  { key: "WORKFLOW", label: "Workflows" },
  { key: "TOOL", label: "Tools" },
] as const

const SORTS = [
  { key: "recent", label: "Recent" },
  { key: "popular", label: "Popular" },
] as const

interface CommunityFiltersProps {
  activeType?: string
  activeSort: string
}

export function CommunityFilters({ activeType, activeSort }: CommunityFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/community?${params.toString()}`)
  }

  return (
    <div className="mb-8 flex flex-wrap items-center gap-4">
      {/* Type filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => updateParams("type", t.key)}
            className={cn(
              "shrink-0 border px-4 py-2 font-mono text-sm transition-all duration-200",
              (activeType ?? "") === t.key
                ? "border-green-primary text-green-primary bg-green-primary/10"
                : "border-border-default text-text-dim hover:border-border-hover hover:text-text-secondary"
            )}
            aria-pressed={(activeType ?? "") === t.key}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="ml-auto flex gap-2">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => updateParams("sort", s.key)}
            className={cn(
              "shrink-0 border px-3 py-1.5 font-mono text-xs transition-all duration-200",
              activeSort === s.key
                ? "border-amber/50 text-amber bg-amber/10"
                : "border-border-default text-text-dim hover:border-border-hover hover:text-text-secondary"
            )}
            aria-pressed={activeSort === s.key}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
