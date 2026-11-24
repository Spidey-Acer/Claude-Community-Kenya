import { describe, it, expect } from "vitest"
import { PUBLIC_REDIRECTS, resolveRedirect } from "../redirects"

describe("public redirects", () => {
  // Stage 1 entries only: every destination here exists on this branch today.
  it.each([
    ["/community", "/showcase"],
    ["/community/submit", "/showcase/submit"],
    ["/community/gstack-garry-tans-open-source-claude-code-workflow-system-mn58gtcg", "/showcase/gstack-garry-tans-open-source-claude-code-workflow-system-mn58gtcg"],
    ["/community/some-tool/", "/showcase/some-tool"],
    ["/gallery", "/events"],
    ["/gallery/kenyas-first-claude-code-meetup", "/events/kenyas-first-claude-code-meetup"],
    ["/newsletter", "/blog"],
    ["/newsletter/issue-1", "/blog"],
    ["/impact-lab", "/reports"],
    ["/conversations", "/reports"],
    ["/chat", "/"],
    ["/merch", "/"],
    ["/community/", "/showcase"],
  ])("%s -> %s", (from, to) => expect(resolveRedirect(from)).toBe(to))

  it("a query string does not stop a redirect (pathname is matched)", () => {
    const { pathname } = new URL("/community/some-tool/?x=1", "https://example.test")
    expect(resolveRedirect(pathname)).toBe("/showcase/some-tool")
  })

  it("leaves kept routes alone", () => {
    for (const p of ["/events/x", "/blog/y", "/showcase/z", "/conversations/abc", "/impact-lab/cohort-1", "/resources/claude-code",
      "/projects", "/submit-project", "/speak", "/volunteer", "/submit-idea", "/team", "/resources/links"]) {
      expect(resolveRedirect(p)).toBeNull()
    }
  })

  it("every entry is permanent", () => {
    expect(PUBLIC_REDIRECTS.every(r => r.permanent === true)).toBe(true)
  })
})
