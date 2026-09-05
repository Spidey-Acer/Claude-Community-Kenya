/**
 * API-level tests for `/api/admin/impact-lab/results/export/stream`.
 *
 * `buildExportArtefact` itself is exercised in `export-pipeline`'s own tests
 * (via `export-pdf-progress.test.ts` and `export-analysis-progress.test.ts`,
 * which cover the render and analysis halves of its progress reporting) —
 * this file only checks what the route layer adds: framing each progress
 * event as one line of NDJSON, and — the property the spec asks for by name
 * — that the terminal `done` event is always last and always carries the
 * finished artefact, never sent before `buildExportArtefact` has actually
 * resolved.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/rbac", () => ({
  checkApiPermission: vi.fn(async () => ({
    authorized: true,
    user: { id: "user-1", name: "Admin", email: "admin@example.com", role: "ADMIN" },
  })),
}))

const buildExportArtefactMock = vi.fn()

// `vi.mock` factories are hoisted above every other top-level statement in
// the file, so `MockExportError` must be declared through `vi.hoisted` —
// a plain `class` declared below this call would still be `undefined` at
// the point the (hoisted) factory runs.
const { MockExportError } = vi.hoisted(() => {
  class MockExportError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return { MockExportError }
})

vi.mock("@/lib/impact-lab/export-pipeline", () => ({
  buildExportArtefact: (...args: unknown[]) => buildExportArtefactMock(...args),
  ExportError: MockExportError,
}))

import { GET } from "../route"

function request(): NextRequest {
  return new NextRequest(
    "http://localhost/api/admin/impact-lab/results/export/stream?cohort=impact-lab-03&format=pdf"
  )
}

/** Splits the NDJSON body into parsed lines, dropping any trailing blank. */
async function readLines(res: Response): Promise<unknown[]> {
  const text = await res.text()
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line))
}

describe("GET /results/export/stream", () => {
  beforeEach(() => {
    buildExportArtefactMock.mockClear()
  })

  it("streams each progress event as its own line, ending with done carrying the artefact", async () => {
    buildExportArtefactMock.mockImplementation(async (_req: NextRequest, onProgress) => {
      onProgress({ stage: "loading", label: "Loading event data", percent: 8 })
      onProgress({ stage: "analysing", label: "Generating team analyses (1/1)", percent: 70 })
      return {
        buffer: Buffer.from("pdf-bytes"),
        filename: "impact-lab-results-impact-lab-03-2026-09-05.pdf",
        contentType: "application/pdf",
      }
    })

    const res = await GET(request())
    expect(res.headers.get("Content-Type")).toContain("application/x-ndjson")

    const lines = await readLines(res)
    expect(lines).toEqual([
      { type: "stage", stage: "loading", label: "Loading event data", percent: 8 },
      { type: "stage", stage: "analysing", label: "Generating team analyses (1/1)", percent: 70 },
      {
        type: "done",
        filename: "impact-lab-results-impact-lab-03-2026-09-05.pdf",
        contentType: "application/pdf",
        size: Buffer.from("pdf-bytes").length,
        data: Buffer.from("pdf-bytes").toString("base64"),
      },
    ])
    // The property the spec names explicitly: `done` is the last line, and
    // only one ever appears — it cannot arrive before the artefact exists,
    // because it IS the artefact.
    expect(lines.filter((l) => (l as { type: string }).type === "done")).toHaveLength(1)
    expect(lines[lines.length - 1]).toMatchObject({ type: "done" })
  })

  it("sends a validation failure as an error frame, not an HTTP error status", async () => {
    buildExportArtefactMock.mockImplementation(async () => {
      throw new MockExportError("No final run for this cohort yet.", 404)
    })

    const res = await GET(request())
    // The stream itself is still a normal 200 — the failure lives inside the
    // NDJSON body, since headers are already committed by the time a
    // mid-build failure happens.
    const lines = await readLines(res)
    expect(lines).toEqual([{ type: "error", message: "No final run for this cohort yet.", status: 404 }])
  })

  it("degrades an unexpected (non-ExportError) failure to a generic 500 error frame", async () => {
    buildExportArtefactMock.mockImplementation(async () => {
      throw new Error("boom")
    })

    const res = await GET(request())
    const lines = await readLines(res)
    expect(lines).toEqual([{ type: "error", message: "Could not build that export.", status: 500 }])
  })

  it("never calls the pipeline when the caller is not authorized", async () => {
    const { checkApiPermission } = await import("@/lib/rbac")
    vi.mocked(checkApiPermission).mockResolvedValueOnce({
      authorized: false,
      response: new Response(JSON.stringify({ success: false, error: "Forbidden" }), { status: 403 }),
    } as never)

    const res = await GET(request())
    expect(res.status).toBe(403)
    expect(buildExportArtefactMock).not.toHaveBeenCalled()
  })
})
