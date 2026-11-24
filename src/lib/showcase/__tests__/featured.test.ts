import { describe, it, expect, vi, beforeEach } from "vitest"

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }))

vi.mock("@/lib/prisma", () => ({
  prisma: { communitySubmission: { findMany } },
}))

import { listFeaturedSubmissions } from "../queries"

function featuredRow(slug: string) {
  const now = new Date("2026-11-01")
  return {
    id: slug, slug, type: "PROJECT", status: "APPROVED", featured: true, title: "T",
    shortDescription: "s", fullDescription: "f", url: null, repoUrl: null,
    installInstructions: null, tags: [], submitterName: null, coverImageUrl: null,
    media: [], needs: [], builtWith: null, event: null, upvoteCount: 0, reactionCounts: {},
    createdAt: now, lastActivityAt: now, _count: { comments: 0 },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  findMany.mockResolvedValue([])
})

describe("listFeaturedSubmissions", () => {
  it("featured query filters featured approved rows, newest first", async () => {
    await listFeaturedSubmissions(3)
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "APPROVED", featured: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    )
  })

  it("maps rows to post views and returns an empty list when none are featured", async () => {
    findMany.mockResolvedValueOnce([featuredRow("a"), featuredRow("b")])
    const posts = await listFeaturedSubmissions(3)
    expect(posts.map((post) => post.slug)).toEqual(["a", "b"])

    findMany.mockResolvedValueOnce([])
    expect(await listFeaturedSubmissions(3)).toEqual([])
  })
})
