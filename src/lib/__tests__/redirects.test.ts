import { describe, it, expect } from "vitest"
import { PUBLIC_REDIRECTS, resolveRedirect } from "../redirects"

describe("public redirects", () => {
  // Stage 1 entries only: every destination here exists on this branch today.
  it.each([
    ["/community", "/showcase"],
    ["/community/submit", "/showcase/submit"],
    ["/community/gstack-garry-tans-open-source-claude-code-workflow-system-mn58gtcg", "/showcase/gstack-garry-tans-open-source-claude-code-workflow-system-mn58gtcg"],
    ["/community/some-tool/", "/showcase/some-tool"],
    ["/submit-project", "/showcase/submit"],
    ["/submit-project/", "/showcase/submit"],
    ["/gallery", "/events"],
    ["/gallery/kenyas-first-claude-code-meetup", "/events/kenyas-first-claude-code-meetup"],
    ["/newsletter", "/blog"],
    ["/newsletter/issue-1", "/blog"],
    ["/impact-lab", "/reports"],
    ["/conversations", "/reports"],
    ["/speak", "/get-involved?role=speak"],
    ["/speak/", "/get-involved?role=speak"],
    ["/volunteer", "/get-involved?role=volunteer"],
    ["/volunteer/", "/get-involved?role=volunteer"],
    ["/submit-idea", "/get-involved?role=idea"],
    ["/submit-idea/", "/get-involved?role=idea"],
    ["/team", "/about#team"],
    ["/team/", "/about#team"],
    ["/team/peter-kibet", "/about#team"],
    ["/team/peter-kibet/", "/about#team"],
    ["/resources/links", "/resources#links"],
    ["/resources/links/", "/resources#links"],
    ["/chat", "/"],
    ["/merch", "/"],
    ["/community/", "/showcase"],
  ])("%s -> %s", (from, to) => expect(resolveRedirect(from)).toBe(to))

  it("a query string does not stop a redirect (pathname is matched)", () => {
    const { pathname } = new URL("/community/some-tool/?x=1", "https://example.test")
    expect(resolveRedirect(pathname)).toBe("/showcase/some-tool")
  })

  it("a query string does not stop /submit-project redirecting", () => {
    const { pathname } = new URL("/submit-project/?ref=nav", "https://example.test")
    expect(resolveRedirect(pathname)).toBe("/showcase/submit")
  })

  it("a query string does not stop /speak redirecting", () => {
    const { pathname } = new URL("/speak/?utm=x", "https://example.test")
    expect(resolveRedirect(pathname)).toBe("/get-involved?role=speak")
  })

  it("a query string does not stop /team redirecting", () => {
    const { pathname } = new URL("/team/?ref=nav", "https://example.test")
    expect(resolveRedirect(pathname)).toBe("/about#team")
  })

  it("leaves kept routes alone", () => {
    for (const p of ["/events/x", "/blog/y", "/showcase/z", "/conversations/abc", "/impact-lab/cohort-1", "/resources/claude-code",
      "/projects"]) {
      expect(resolveRedirect(p)).toBeNull()
    }
  })

  it("every entry is permanent", () => {
    expect(PUBLIC_REDIRECTS.every(r => r.permanent === true)).toBe(true)
  })
})
