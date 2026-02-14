import Link from "next/link";
import type { BlogPost } from "@/data/blog-posts";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Calendar, Clock, User } from "lucide-react";

interface BlogPostCardProps {
  post: BlogPost;
}

export function BlogPostCard({ post }: BlogPostCardProps) {
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
