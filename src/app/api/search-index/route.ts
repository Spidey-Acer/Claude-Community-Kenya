import { NextResponse } from "next/server";
import { getEvents, getBlogPosts } from "@/lib/data";

/**
 * Public read-only endpoint that powers the keyboard CommandPalette.
 * Returns slim, palette-shaped records — not full objects.
 *
 * Cached at the edge for 5 minutes; the palette only fetches on first open.
 */
export const revalidate = 300;

export async function GET() {
  const [events, blogPosts] = await Promise.all([
    getEvents().catch(() => []),
    getBlogPosts().catch(() => []),
  ]);

  return NextResponse.json({
    events: events.map((e) => ({
      slug: e.slug,
      title: e.title,
      city: e.city,
      date: e.date,
    })),
    blogPosts: blogPosts.map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
    })),
  });
}
