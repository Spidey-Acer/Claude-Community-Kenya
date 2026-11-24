/**
 * Blog tools: list, get, create, update, publish.
 * Zod shapes mirror src/app/api/admin/blog/route.ts and blog/[id]/route.ts.
 * The PATCH route sets publishedAt itself on the first move to PUBLISHED, so
 * blog_publish only sends the status. There is no delete tool by design.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest, fail, failFromApi, guard, ok, unwrap } from "../client.js";

const BLOG_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
const AUDIENCES = ["dev", "non_tech_pro", "student", "founder", "creator"] as const;
const INTENTS = ["learn_basics", "find_event", "find_collaborators", "build", "hire_or_partner", "other"] as const;

const blogFields = {
  title: z.string().min(3).max(200).describe("Post title (3-200 chars)"),
  excerpt: z.string().min(10).max(500).describe("Excerpt (10-500 chars)"),
  content: z.string().min(50).describe("Post body, markdown (min 50 chars)"),
  author: z.string().max(100).describe("Author display name (max 100 chars)"),
  tags: z.array(z.string().max(50)).max(10).describe("Up to 10 tags, each max 50 chars"),
  status: z.enum(BLOG_STATUSES).default("DRAFT").describe("DRAFT (default), PUBLISHED or ARCHIVED"),
  featured: z.boolean().optional().describe("Feature on the site (default false)"),
  readingTime: z.number().int().min(1).optional().describe("Reading time in minutes"),
  audiences: z.array(z.enum(AUDIENCES)).optional().describe("Target audiences"),
  intents: z.array(z.enum(INTENTS)).optional().describe("Matching intents"),
};

/** Update fields: every create field optional. The default on status is dropped so an omitted status is not sent. */
const blogUpdateFields = {
  ...z.object({ ...blogFields, status: z.enum(BLOG_STATUSES).describe("DRAFT, PUBLISHED or ARCHIVED") }).partial().shape,
};

interface BlogRow {
  id?: string;
  slug?: string;
  title?: string;
  status?: string;
  author?: string;
  featured?: boolean;
  tags?: string[];
  publishedAt?: string | null;
  createdAt?: string;
}

/** Compact row for list output (content omitted). */
function slimPost(row: BlogRow): BlogRow {
  const { id, slug, title, status, author, featured, tags, publishedAt, createdAt } = row;
  return { id, slug, title, status, author, featured, tags, publishedAt, createdAt };
}

/** Register the blog tools on the server. */
export function registerBlogTools(server: McpServer): void {
  server.registerTool(
    "blog_list",
    {
      title: "List blog posts",
      description: "List blog posts (all statuses), newest first, as compact rows without the body.",
      inputSchema: {
        page: z.number().int().min(1).default(1).describe("Page number (default 1)"),
        limit: z.number().int().min(1).max(100).default(20).describe("Rows per page (default 20)"),
        status: z.enum(BLOG_STATUSES).optional().describe("Keep only this status (client-side, current page)"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    guard("blog_list", async ({ page, limit, status }) => {
      const res = await apiRequest("GET", "/api/admin/blog", { query: { page, limit } });
      if (!res.ok) return failFromApi("Listing posts", res);
      const body = res.data as { data?: BlogRow[]; pagination?: { total: number; pages: number } };
      const rows = (body.data ?? []).filter((p) => !status || p.status === status);
      const p = body.pagination;
      const summary = `${rows.length} post(s) on page ${page}${p ? ` of ${p.pages} (${p.total} total)` : ""}.`;
      return ok(summary, { posts: rows.map(slimPost), pagination: p });
    }),
  );

  server.registerTool(
    "blog_get",
    {
      title: "Get blog post",
      description: "Fetch one blog post with its full content by id.",
      inputSchema: { id: z.string().min(1).describe("Post id (cuid), from blog_list") },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    guard("blog_get", async ({ id }) => {
      const res = await apiRequest("GET", `/api/admin/blog/${encodeURIComponent(id)}`);
      if (!res.ok) return failFromApi("Fetching post", res);
      const post = unwrap(res) as BlogRow;
      return ok(`Post "${post.title}" (${post.status}) by ${post.author}.`, post);
    }),
  );

  server.registerTool(
    "blog_create",
    {
      title: "Create blog post",
      description: "Create a blog post. Defaults to DRAFT. The slug is generated from the title.",
      inputSchema: blogFields,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    guard("blog_create", async (input) => {
      const res = await apiRequest("POST", "/api/admin/blog", { json: input });
      if (!res.ok) return failFromApi("Creating post", res);
      const post = unwrap(res) as BlogRow;
      return ok(`Created ${post.status} post "${post.title}" with id ${post.id}, slug ${post.slug}.`, slimPost(post));
    }),
  );

  server.registerTool(
    "blog_update",
    {
      title: "Update blog post",
      description: "Update a blog post by id. Send only the fields to change.",
      inputSchema: { id: z.string().min(1).describe("Post id (cuid)"), ...blogUpdateFields },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    guard("blog_update", async ({ id, ...patch }) => {
      if (Object.keys(patch).length === 0) return fail("No fields to update were provided.");
      const res = await apiRequest("PATCH", `/api/admin/blog/${encodeURIComponent(id)}`, { json: patch });
      if (!res.ok) return failFromApi("Updating post", res);
      const post = unwrap(res) as BlogRow;
      return ok(`Updated post "${post.title}" (fields: ${Object.keys(patch).join(", ")}).`, slimPost(post));
    }),
  );

  server.registerTool(
    "blog_publish",
    {
      title: "Publish blog post",
      description: "Set a post's status to PUBLISHED. The server stamps publishedAt on the first publish.",
      inputSchema: { id: z.string().min(1).describe("Post id (cuid)") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    guard("blog_publish", async ({ id }) => {
      const res = await apiRequest("PATCH", `/api/admin/blog/${encodeURIComponent(id)}`, {
        json: { status: "PUBLISHED" },
      });
      if (!res.ok) return failFromApi("Publishing post", res);
      const post = unwrap(res) as BlogRow;
      return ok(`Published "${post.title}" (publishedAt ${post.publishedAt ?? "unset"}).`, slimPost(post));
    }),
  );
}
