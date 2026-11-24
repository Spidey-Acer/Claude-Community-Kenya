import { describe, it, expect, vi, beforeEach } from "vitest"

const { findMany, findUnique, count, queryRaw } = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  count: vi.fn(),
  queryRaw: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    communitySubmission: { findMany, findUnique, count },
    $queryRaw: queryRaw,
  },
}))

import { getShowcasePosts, getShowcasePostBySlug } from "../queries"
import { TYPE_PARAM, TYPE_LABELS, SUBMISSION_TYPES } from "../constants"

const ALL_TYPES = ["MCP", "PROMPT", "WORKFLOW", "TOOL", "SHOWCASE", "PROJECT"]

function approvedRow(type: string) {
  const now = new Date("2026-11-01")
  return {
    id: "1", slug: "x", type, status: "APPROVED", title: "T", shortDescription: "s", fullDescription: "f",
    url: null, repoUrl: null, installInstructions: null, tags: [], submitterName: null, coverImageUrl: null,
    media: [], needs: [], builtWith: null, event: null, upvoteCount: 0, reactionCounts: {},
    createdAt: now, lastActivityAt: now, _count: { comments: 0 },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  findMany.mockResolvedValue([])
  count.mockResolvedValue(0)
  queryRaw.mockResolvedValue([])
})

describe("showcase queries across every type", () => {
  it("feed without a type queries all six types", async () => {
    await getShowcasePosts({ sort: "recent", page: 1, limit: 12 })
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "APPROVED", type: { in: ALL_TYPES } }),
    }))
  })

  it("feed with a type queries only that type", async () => {
    await getShowcasePosts({ sort: "recent", type: "PROJECT" })
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: "APPROVED", type: { in: ["PROJECT"] } }),
    }))
  })

  it("hot feed counts approved rows of every type", async () => {
    await getShowcasePosts({ sort: "hot" })
    expect(count).toHaveBeenCalledWith({
      where: expect.objectContaining({ status: "APPROVED", type: { in: ALL_TYPES } }),
    })
  })

  it("detail returns an approved MCP row", async () => {
    findUnique.mockResolvedValue(approvedRow("MCP"))
    expect(await getShowcasePostBySlug("x")).not.toBeNull()
  })

  it("detail returns an approved PROJECT row", async () => {
    findUnique.mockResolvedValue(approvedRow("PROJECT"))
    expect(await getShowcasePostBySlug("x")).toMatchObject({ type: "PROJECT" })
  })

  it("detail hides a pending row of any type", async () => {
    findUnique.mockResolvedValue({ ...approvedRow("PROJECT"), status: "PENDING" })
    expect(await getShowcasePostBySlug("x")).toBeNull()
  })

  it("TYPE_PARAM maps demo to SHOWCASE and project to PROJECT", () => {
    expect(TYPE_PARAM.demo).toBe("SHOWCASE")
    expect(TYPE_PARAM.project).toBe("PROJECT")
  })

  it("every type has a label", () => {
    for (const type of SUBMISSION_TYPES) expect(TYPE_LABELS[type]).toBeTruthy()
  })
})
