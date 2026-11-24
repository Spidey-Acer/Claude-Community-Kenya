import { describe, it, expect } from "vitest"
import { projectToSubmission, projectSlug } from "../project-copy"

const project = {
  id: "p1", name: "VerifyAfya: check a practitioner", builder: "Dr James",
  description: "Checks that a health practitioner is genuinely registered with the boards.",
  stack: ["Next.js", "Claude"], status: "MVP", demoUrl: "https://verifyafya.co.ke",
  repoUrl: null, featured: true, audiences: [], contactName: null, contactEmail: null,
  potwAt: null, createdAt: new Date("2026-05-01"), updatedAt: new Date("2026-05-01"),
}

describe("projectSlug", () => {
  it("kebab-cases and caps at 60", () => {
    expect(projectSlug("VerifyAfya: check a practitioner")).toBe("verifyafya-check-a-practitioner")
    expect(projectSlug("x".repeat(80)).length).toBe(60)
  })
})

describe("projectToSubmission", () => {
  it("maps every field and marks APPROVED", () => {
    const r = projectToSubmission(project as never, new Set())
    expect(r.skipped).toBe(false)
    if (r.skipped) return
    expect(r.data).toMatchObject({
      type: "PROJECT", status: "APPROVED", featured: true,
      title: project.name, submitterName: "Dr James",
      shortDescription: project.description, fullDescription: project.description,
      url: "https://verifyafya.co.ke", builtWith: { models: [], skills: ["Next.js", "Claude"], mcps: [] },
      slug: "verifyafya-check-a-practitioner",
    })
  })
  it("featured true maps to APPROVED", () => {
    const r = projectToSubmission({ ...project, featured: true, potwAt: null } as never, new Set())
    expect(r.skipped ? null : r.data.status).toBe("APPROVED")
  })
  it("featured false and no potwAt maps to PENDING", () => {
    const r = projectToSubmission({ ...project, featured: false, potwAt: null } as never, new Set())
    expect(r.skipped ? null : r.data.status).toBe("PENDING")
    expect(r.skipped ? null : r.data.featured).toBe(false)
  })
  it("featured false with potwAt set maps to APPROVED", () => {
    const r = projectToSubmission({ ...project, featured: false, potwAt: new Date("2026-06-01") } as never, new Set())
    expect(r.skipped ? null : r.data.status).toBe("APPROVED")
  })
  it("skips a slug that already exists", () => {
    const r = projectToSubmission(project as never, new Set(["verifyafya-check-a-practitioner"]))
    expect(r).toEqual({ skipped: true, reason: "slug-exists" })
  })
})

describe("empty slug", () => {
  it.each(["", "!!!", "  ---  "])("skips name %j with reason empty-slug", (name) => {
    const r = projectToSubmission({ ...project, name } as never, new Set())
    expect(r).toEqual({ skipped: true, reason: "empty-slug" })
  })
})

describe("copy idempotence", () => {
  it("a second pass over the same projects copies nothing", () => {
    const first = projectToSubmission(project as never, new Set())
    const slugs = new Set(first.skipped ? [] : [first.data.slug as string])
    expect(projectToSubmission(project as never, slugs).skipped).toBe(true)
  })
})
