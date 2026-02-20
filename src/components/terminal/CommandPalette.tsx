"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, Command, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/constants";
import { events } from "@/data/events";
import { blogPosts } from "@/data/blog-posts";
import { faqs } from "@/data/faq";
import { resources } from "@/data/resources";

interface SearchResult {
  id: string;
  label: string;
  category: string;
  path: string;
  description?: string;
}

function buildSearchIndex(): SearchResult[] {
  const results: SearchResult[] = [];

  // Pages
  NAV_LINKS.forEach((link) => {
    results.push({
      id: `page-${link.href}`,
      label: link.label,
      category: "Pages",
      path: link.href,
      description: `Navigate to ${link.label}`,
    });
  });

  // Events
  events.forEach((event) => {
    results.push({
      id: `event-${event.slug}`,
      label: event.title,
      category: "Events",
      path: `/events/${event.slug}`,
      description: `${event.city} — ${event.date}`,
    });
  });

  // Blog posts
  blogPosts.forEach((post) => {
    results.push({
      id: `blog-${post.slug}`,
      label: post.title,
      category: "Blog",
      path: `/blog/${post.slug}`,
      description: post.excerpt,
    });
  });

  // FAQ
  faqs.forEach((faq) => {
    results.push({
      id: `faq-${faq.id}`,
      label: faq.question,
      category: "FAQ",
      path: `/faq#${faq.id}`,
      description: faq.answer.slice(0, 80) + "...",
    });
  });

  // Resources
  resources.forEach((resource) => {
    results.push({
      id: `resource-${resource.id}`,
      label: resource.title,
      category: "Resources",
      path: `/resources#${resource.id}`,
      description: resource.description,
    });
  });

  return results;
}

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;

  // Simple fuzzy: all query chars appear in order
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const searchIndex = useMemo(buildSearchIndex, []);

  const results = useMemo(() => {
    if (!query.trim()) return searchIndex.slice(0, 8);
    return searchIndex
      .filter(
        (item) =>
          fuzzyMatch(query, item.label) ||
          fuzzyMatch(query, item.category) ||
          (item.description && fuzzyMatch(query, item.description))
      )
      .slice(0, 10);
  }, [query, searchIndex]);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      close();
      router.push(path);
    },
    [close, router]
  );

  // Keyboard shortcut: Ctrl+K or /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        isOpen ? close() : open();
        return;
      }

      // "/" opens palette unless user is typing in an input
      if (
        e.key === "/" &&
        !isOpen &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        open();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, open, close]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Reset selected index on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (results[selectedIndex]) {
          navigate(results[selectedIndex].path);
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />

      {/* Palette */}
      <div
        className="relative w-full max-w-lg border border-border-default bg-bg-card shadow-[0_0_30px_rgba(0,255,65,0.08)]"
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
      >
        {/* Input */}
        <div className="flex items-center gap-2 border-b border-border-default px-4 py-3">
          <span className="font-mono text-green-primary select-none" aria-hidden="true">$</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent font-mono text-sm text-text-primary outline-none placeholder:text-text-dim"
            aria-label="Search commands"
            aria-activedescendant={
              results[selectedIndex]
                ? `cmd-${results[selectedIndex].id}`
                : undefined
            }
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-autocomplete="list"
          />
          <kbd className="flex items-center gap-0.5 rounded border border-border-default px-1.5 py-0.5 font-mono text-xs text-text-dim">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          id="command-results"
          role="listbox"
          className="max-h-80 overflow-y-auto py-2"
        >
          {results.length === 0 && (
            <div className="px-4 py-8 text-center font-mono text-sm text-text-dim">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.map((result, i) => (
            <button
              key={result.id}
              id={`cmd-${result.id}`}
              role="option"
              aria-selected={i === selectedIndex}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                i === selectedIndex
                  ? "bg-bg-elevated text-green-primary"
                  : "text-text-secondary hover:bg-bg-elevated/50"
              )}
              onClick={() => navigate(result.path)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <ArrowRight
                size={14}
                className={cn(
                  "shrink-0 transition-opacity",
                  i === selectedIndex ? "opacity-100" : "opacity-0"
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-sm">{result.label}</div>
                {result.description && (
                  <div className="truncate text-xs text-text-dim">
                    {result.description}
                  </div>
                )}
              </div>
              <span className="shrink-0 font-mono text-xs text-text-dim">
                {result.category}
              </span>
            </button>
          ))}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-border-default px-4 py-2 font-mono text-xs text-text-dim">
          <span className="flex items-center gap-1">
            <CornerDownLeft size={12} /> Select
          </span>
          <span className="flex items-center gap-1">↑↓ Navigate</span>
          <span className="ml-auto flex items-center gap-1">
            <Command size={12} />K to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
