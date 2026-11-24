// Page-level guarantees for /events/[slug]/attending that cannot run in a
// browser here (Playwright is not installed): the CSP header, analytics being
// off on the route, a source scan proving the photo composer makes no network
// calls, and a copy scan for words the page must never use.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import nextConfig from "../../../../next.config"
import { ATTENDING_HEADER_SOURCE, buildAttendingCsp, isAttendingPath } from "../attending-path"

const ROOT = join(__dirname, "..", "..", "..", "..")
const read = (relativePath: string) => readFileSync(join(ROOT, relativePath), "utf8")
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")

/** Everything that touches the photo or the typed name. */
const COMPOSER_FILES = [
  "src/lib/attending/card-layout.ts",
  "src/lib/attending/compose-card.ts",
  "src/components/karibu/attending/AttendingFlow.tsx",
  "src/components/karibu/attending/ShareButtons.tsx",
]
const COPY_FILES = [
  ...COMPOSER_FILES,
  "src/components/karibu/attending/LookupForm.tsx",
  "src/app/events/[slug]/attending/page.tsx",
]

describe("attending route headers", () => {
  it("the route's response carries a Content-Security-Policy with connect-src 'self'", async () => {
    const rules = await nextConfig.headers!()
    const rule = rules.find((entry) => entry.source === ATTENDING_HEADER_SOURCE)
    const csp = rule?.headers.find((header) => header.key === "Content-Security-Policy")?.value
    expect(csp).toBeDefined()
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).not.toMatch(/https?:\/\//)
  })

  it("allows unsafe-eval in development only", () => {
    expect(buildAttendingCsp(true)).toContain("'unsafe-eval'")
    expect(buildAttendingCsp(false)).not.toContain("'unsafe-eval'")
  })

  it("the header source matches only the attending page path", () => {
    expect(isAttendingPath("/events/build-day/attending")).toBe(true)
    expect(isAttendingPath("/events/build-day/attending/")).toBe(true)
    expect(isAttendingPath("/events/build-day")).toBe(false)
    expect(isAttendingPath("/events/build-day/attending/x")).toBe(false)
    expect(isAttendingPath(null)).toBe(false)
  })

  it("GoogleAnalytics renders nothing on that route", () => {
    const source = read("src/components/GoogleAnalytics.tsx")
    expect(source).toContain("isAnalyticsDisabled(pathname)")
    expect(source.indexOf("isAnalyticsDisabled(pathname)")).toBeLessThan(source.indexOf("<Script"))
  })
})

describe("photo stays in the browser", () => {
  it.each(COMPOSER_FILES)("%s makes no network calls", (file) => {
    const code = stripComments(read(file))
    expect(code).not.toMatch(/\b(fetch|FormData|XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/)
  })

  it("the only request in the flow is the email lookup, and it sends the email alone", () => {
    const code = stripComments(read("src/components/karibu/attending/LookupForm.tsx"))
    expect(code.match(/\bfetch\(/g)).toHaveLength(1)
    expect(code).toContain("JSON.stringify({ email })")
    expect(code).not.toMatch(/\b(photo|name|file)\b/i)
  })
})

describe("copy rules", () => {
  it.each(COPY_FILES)("%s never says verified, official or counts attendees", (file) => {
    const code = stripComments(read(file))
    expect(code).not.toMatch(/verified|official|attendees\b/i)
  })

  it("the page shows the privacy notice", () => {
    expect(read("src/app/events/[slug]/attending/page.tsx")).toContain(
      "We check your email against this event's Luma guest list and keep nothing you type; your photo stays on your device and is never uploaded.",
    )
  })
})
