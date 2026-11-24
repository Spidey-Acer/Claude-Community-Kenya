/**
 * PostCard: one blog post as a link card: date and reading time, title,
 * excerpt. No cover image, because blog posts carry none.
 */

import Link from "next/link";
import type { BlogPostView } from "@/lib/data";
import { CARD, META } from "./tokens";

export function PostCard({ post }: { post: BlogPostView }) {
  return (
    <Link href={`/blog/${post.slug}`} className={CARD}>
      <div className="flex flex-1 flex-col p-6">
        <p className={`${META} mb-2`}>
          {post.date} · {post.readingTime} min read
        </p>
        <h3 className="mb-2 font-newsreader text-[22px] leading-tight text-ink">{post.title}</h3>
        <p className="line-clamp-3 font-inter text-[14.5px] leading-[1.55] text-ink-soft">{post.excerpt}</p>
      </div>
    </Link>
  );
}
