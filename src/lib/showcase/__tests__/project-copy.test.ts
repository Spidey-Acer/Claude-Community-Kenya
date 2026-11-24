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
  it("skips a slug that already exists", () => {
    const r = projectToSubmission(project as never, new Set(["verifyafya-check-a-practitioner"]))
    expect(r).toEqual({ skipped: true, reason: "slug-exists" })
  })
})

describe("copy idempotence", () => {
  it("a second pass over the same projects copies nothing", () => {
    const first = projectToSubmission(project as never, new Set())
    const slugs = new Set(first.skipped ? [] : [first.data.slug as string])
    expect(projectToSubmission(project as never, slugs).skipped).toBe(true)
  })
})
