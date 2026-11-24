/**
 * PostCard: the date prints in the readable long form (never raw ISO) and the
 * post's tags are listed.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PostCard } from "../kit/PostCard";
import type { BlogPostView } from "@/lib/data";

const POST = {
  slug: "hello",
  title: "Hello",
  date: "2026-03-15T09:00:00.000Z",
  excerpt: "An excerpt.",
  tags: ["claude-code", "workshop"],
  readingTime: 4,
} as BlogPostView;

describe("PostCard", () => {
  const html = renderToStaticMarkup(createElement(PostCard, { post: POST }));

  it("prints a readable date, not ISO", () => {
    expect(html).toContain("15 March 2026");
    expect(html).not.toContain("2026-03-15");
  });

  it("lists every tag", () => {
    expect(html).toContain("claude-code");
    expect(html).toContain("workshop");
  });

  it("omits the tag list when there are none", () => {
    const bare = renderToStaticMarkup(createElement(PostCard, { post: { ...POST, tags: [] } }));
    expect(bare).not.toContain('aria-label="Tags"');
  });
});
