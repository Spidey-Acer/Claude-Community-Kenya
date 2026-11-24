"use client";

/**
 * KaribuBlog: the Blog listing on the page kit. A larger featured card for the
 * first or featured post, then a grid of kit `PostCard`s. A designed empty
 * state when there are no posts yet.
 */

import Image from "next/image";
import Link from "next/link";
import type { BlogPostView } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { CtaBand } from "@/components/karibu/CtaBand";
import { EmptyState, EYEBROW, Masthead, PostCard, WRAP } from "@/components/karibu/kit";

function FeaturedCard({ post }: { post: BlogPostView }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-2xl border border-sand bg-paper-card p-8 transition-colors hover:border-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2 sm:p-10"
    >
      <p className={`${EYEBROW} mb-4`}>Featured</p>
      <h2 className="mb-4 max-w-[720px] font-newsreader text-[32px] leading-[1.1] tracking-[-0.01em] text-ink sm:text-[40px]">
        {post.title}
      </h2>
      <p className="mb-5 max-w-[640px] font-inter text-[16px] leading-[1.6] text-ink-soft">{post.excerpt}</p>
      <p className="mb-5 font-inter text-[13px] text-ink-muted">
        {post.author} · {formatDate(post.date)} · {post.readingTime} min read
      </p>
      <span className="font-inter text-sm font-semibold text-clay transition-colors group-hover:text-clay-dark">Read the post</span>
    </Link>
  );
}

export function KaribuBlog({ posts }: { posts: readonly BlogPostView[] }) {
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = featured ? posts.filter((p) => p.slug !== featured.slug) : posts;

  return (
    <>
      <Masthead
        eyebrow="Blog"
        title="Notes from the community."
        lead="Tutorials, meetup recaps and developer stories from Kenya's Claude community, written by the people building with it."
        media={
          <Image
            src="/images/community/presenting.webp"
            alt="A member presenting at a CCK event"
            fill
            priority
            sizes="(min-width: 1024px) 440px, 100vw"
            className="object-cover"
          />
        }
      />

      {posts.length === 0 ? (
        <section className={`${WRAP} pb-10`} aria-label="No posts yet">
          <Reveal>
            <EmptyState
              title="No posts yet. Karibu tena."
              body="We're writing up our first recaps and guides. Check back soon."
            />
          </Reveal>
        </section>
      ) : (
        <>
          {featured && (
            <section className={`${WRAP} pb-5`} aria-label="Featured post">
              <Reveal>
                <FeaturedCard post={featured} />
              </Reveal>
            </section>
          )}

          {rest.length > 0 && (
            <section className={`${WRAP} py-5`} aria-label="More posts">
              <Reveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </Reveal>
            </section>
          )}
        </>
      )}

      <section className={`${WRAP} pb-16 pt-6`} aria-label="Join CTA">
        <CtaBand />
      </section>
    </>
  );
}
