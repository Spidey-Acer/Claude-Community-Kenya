"use client";

/**
 * KaribuBlog — warm-light "Blog" listing for the Karibu identity.
 *
 * Renders the community's published posts: a larger featured card for the
 * first/featured post, followed by a responsive grid of the rest. Falls
 * back to a friendly empty state when there are no posts yet.
 */

import Link from "next/link";
import { Calendar, Clock, User } from "lucide-react";
import type { BlogPostView } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Reveal } from "@/components/karibu/motion/Reveal";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

function PostMeta({ post }: { post: BlogPostView }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-inter text-[13px] text-ink-muted">
      <span className="inline-flex items-center gap-1.5">
        <User className="h-3.5 w-3.5" aria-hidden="true" />
        {post.author}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
        {formatDate(post.date)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {post.readingTime} min read
      </span>
    </div>
  );
}

function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-sand-2 bg-paper-alt px-3 py-0.5 font-inter text-xs text-ink-soft"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function FeaturedCard({ post }: { post: BlogPostView }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-2xl border border-sand bg-paper-card p-8 transition-colors hover:border-clay sm:p-10"
      aria-label={`Read: ${post.title}`}
    >
      <div className={`${KICKER} mb-4`}>Featured</div>
      <h2 className="mb-4 max-w-[720px] font-newsreader text-[32px] leading-[1.1] tracking-[-0.01em] text-ink sm:text-[40px]">
        {post.title}
      </h2>
      <p className="mb-5 max-w-[640px] font-inter text-[16px] leading-[1.6] text-ink-soft">
        {post.excerpt}
      </p>
      <div className="mb-5">
        <PostMeta post={post} />
      </div>
      <div className="mb-6">
        <TagList tags={post.tags} />
      </div>
      <span className="font-inter text-sm font-semibold text-clay group-hover:underline">
        Read the post →
      </span>
    </Link>
  );
}

function PostCard({ post }: { post: BlogPostView }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-2xl border border-sand bg-paper-card p-7 transition-colors hover:border-clay"
      aria-label={`Read: ${post.title}`}
    >
      <h3 className="mb-2 font-newsreader text-[22px] leading-[1.15] text-ink">{post.title}</h3>
      <p className="mb-4 flex-1 font-inter text-[14.5px] leading-[1.55] text-ink-soft line-clamp-3">
        {post.excerpt}
      </p>
      <div className="mb-4">
        <PostMeta post={post} />
      </div>
      <div className="mb-4">
        <TagList tags={post.tags} />
      </div>
      <span className="font-inter text-sm font-semibold text-clay group-hover:underline">
        Read more →
      </span>
    </Link>
  );
}

export function KaribuBlog({ posts }: { posts: readonly BlogPostView[] }) {
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = featured ? posts.filter((p) => p.slug !== featured.slug) : posts;

  return (
    <>
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Blog header">
        <Reveal>
          <div className={`${KICKER} mb-4`}>Blog</div>
          <h1 className="mb-4 max-w-[820px] font-newsreader text-[44px] font-normal leading-[1.03] tracking-[-0.02em] text-ink sm:text-[56px]">
            Notes from the <span className="italic text-clay">community.</span>
          </h1>
          <p className="max-w-[600px] font-inter text-[17px] leading-[1.6] text-ink-soft">
            Tutorials, meetup recaps and developer stories from Kenya&apos;s Claude
            community — written by the people building with it.
          </p>
        </Reveal>
      </section>

      {posts.length === 0 ? (
        <section className={`${WRAP} py-10`} aria-label="No posts yet">
          <Reveal>
            <div className="rounded-2xl border border-dashed border-sand-2 bg-paper-card p-10 text-center">
              <p className="font-newsreader text-2xl text-ink">No posts yet — karibu tena.</p>
              <p className="mt-2 font-inter text-[15px] text-ink-soft">
                We&apos;re writing up our first recaps and guides. Check back soon.
              </p>
            </div>
          </Reveal>
        </section>
      ) : (
        <>
          {featured && (
            <section className={`${WRAP} py-5`} aria-label="Featured post">
              <Reveal>
                <FeaturedCard post={featured} />
              </Reveal>
            </section>
          )}

          {rest.length > 0 && (
            <section className={`${WRAP} py-5 pb-16`} aria-label="More posts">
              <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </Reveal>
            </section>
          )}
        </>
      )}
    </>
  );
}
