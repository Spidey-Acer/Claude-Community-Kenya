"use client"

import Link from "next/link";
import type { BlogPostView } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Calendar, Clock, User } from "lucide-react";
import { useSkin } from "@/contexts/SkinContext";

interface BlogPostCardProps {
  post: BlogPostView;
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  const { skin } = useSkin()
  const isPro = skin === "pro"

  if (isPro) {
    return (
      <Link
        href={`/blog/${post.slug}`}
        className="group block"
        aria-label={`Read: ${post.title}`}
      >
        <div
          className="rounded-2xl border transition-all duration-300 hover:-translate-y-1 backdrop-blur-xl"
          style={{
            borderColor: "#2a2a28",
            backgroundColor: "rgba(30,30,29,0.6)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "#3a3a37"
            ;(e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)"
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "#2a2a28"
            ;(e.currentTarget as HTMLDivElement).style.boxShadow = "none"
          }}
        >
          {/* Content */}
          <div className="p-6">
            {/* Title */}
            <h3
              className="mb-3 text-lg font-semibold transition-colors duration-200"
              style={{ color: "#faf9f5" }}
            >
              <span className="group-hover:text-[#d97757] transition-colors duration-200">{post.title}</span>
            </h3>

            {/* Meta info */}
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm" style={{ color: "#7a7870" }}>
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{formatDate(post.date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{post.readingTime} min read</span>
              </div>
            </div>

            {/* Excerpt */}
            <p className="mb-4 text-sm line-clamp-2" style={{ color: "#b0aea5" }}>
              {post.excerpt}
            </p>

            {/* Tags */}
            <div className="mb-4 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-3 py-0.5 text-xs"
                  style={{
                    backgroundColor: "rgba(217,119,87,0.1)",
                    color: "#d97757",
                    border: "1px solid rgba(217,119,87,0.2)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Read more CTA */}
            <div
              className="text-sm font-medium transition-colors duration-200 group-hover:text-[#d97757]"
              style={{ color: "#6a9bcc" }}
            >
              Read More &rarr;
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block"
      aria-label={`Read: ${post.title}`}
    >
      <div
        className={cn(
          "border border-border-default bg-bg-card transition-all duration-300",
          "hover:border-border-hover hover:-translate-y-0.5",
          "hover:shadow-[0_4px_20px_rgba(0,255,65,0.08)]"
        )}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border-default px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-primary" />
          </div>
          <span className="ml-2 font-mono text-xs text-text-dim">
            blog/{post.slug}
          </span>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Title */}
          <h3 className="mb-3 font-mono text-lg font-semibold text-green-primary group-hover:text-amber transition-colors duration-200">
            {post.title}
          </h3>

          {/* Meta info */}
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-dim">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{post.author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{formatDate(post.date)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{post.readingTime} min read</span>
            </div>
          </div>

          {/* Excerpt */}
          <p className="mb-4 text-sm text-text-secondary line-clamp-2">
            {post.excerpt}
          </p>

          {/* Tags */}
          <div className="mb-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="border border-border-default bg-bg-elevated px-2 py-0.5 font-mono text-xs text-text-dim"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Read more CTA */}
          <div className="font-mono text-sm font-medium text-green-primary group-hover:text-amber transition-colors duration-200">
            <span className="text-text-dim">&gt; </span>
            Read More &rarr;
          </div>
        </div>
      </div>
    </Link>
  );
}
