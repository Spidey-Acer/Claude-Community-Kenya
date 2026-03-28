"use client"

import { useState, useMemo } from "react"
import { Search, X } from "lucide-react"
import { Accordion } from "@/components/ui/Accordion"
import { CommandPrefix } from "@/components/terminal"
import type { FAQ } from "@/data/faq"

interface FaqCategory {
  key: string
  label: string
  command: string
}

interface FaqClientProps {
  faqs: FAQ[]
  categories: FaqCategory[]
}

export function FaqClient({ faqs, categories }: FaqClientProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim()) return null
    const q = query.toLowerCase()
    return faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q)
    )
  }, [query, faqs])

  return (
    <div>
      {/* Search */}
      <div className="mx-auto max-w-xl mb-12">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions..."
            className="w-full bg-bg-card border border-border-default rounded px-9 py-3 font-mono text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-green-primary/50 focus:ring-1 focus:ring-green-primary/20 transition-colors"
            aria-label="Search FAQ"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-secondary transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {filtered !== null && (
          <p className="mt-2 text-xs font-mono text-text-dim text-center">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {/* Results */}
      {filtered !== null ? (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-mono text-sm text-text-dim">No matching questions found.</p>
              <p className="font-mono text-xs text-text-dim/60 mt-1">Try a different search term or browse categories below.</p>
            </div>
          ) : (
            <Accordion
              items={filtered.map((faq) => ({
                id: faq.id,
                title: faq.question,
                content: faq.answer,
              }))}
            />
          )}
        </div>
      ) : (
        <div className="space-y-12">
          {categories.map((category) => {
            const items = faqs
              .filter((faq) => faq.category === category.key)
              .map((faq) => ({
                id: faq.id,
                title: faq.question,
                content: faq.answer,
              }))

            return (
              <div key={category.key} id={`faq-${category.key}`}>
                <h2 className="mb-4 flex items-center gap-2 font-mono text-base text-text-primary">
                  <CommandPrefix />
                  <span className="text-text-secondary">{category.command}</span>
                  <span className="ml-2 font-mono text-xs text-text-dim">
                    ({items.length})
                  </span>
                </h2>
                <Accordion items={items} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
