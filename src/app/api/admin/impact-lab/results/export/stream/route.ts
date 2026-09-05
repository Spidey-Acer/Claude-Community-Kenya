import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { buildExportArtefact, ExportError } from "@/lib/impact-lab/export-pipeline"

/**
 * GET /api/admin/impact-lab/results/export/stream?cohort=…&format=xlsx|pdf[&…]
 *
 * The same export as `export/route.ts` — identical query parameters, run the
 * exact same `buildExportArtefact` pipeline — but reporting build progress as
 * it happens instead of going silent until the file lands.
 *
 * The progress and the file share one connection and one build pass, on
 * purpose. Two endpoints (a plain download plus a separate "how's it going"
 * poll) would need the two requests to agree on a build that neither of them
 * shares — on Vercel there is no server-side memory both requests could read
 * without adding Redis, and a naive version would run the pipeline twice,
 * paying twice for the LLM calls `generateTeamAnalyses` makes (the slowest,
 * only paid, part of a full export). Streaming the file inside the same
 * response as its own progress makes "the build finished" and "the file
 * exists" the same fact by construction: the terminal frame cannot be sent
 * before the artefact does, because it *carries* the artefact.
 *
 * Body is newline-delimited JSON, one object per line:
 *   {"type":"stage","stage":"analysing","label":"…","percent":34}
 *   {"type":"done","filename":"…","contentType":"…","size":123,"data":"<base64>"}
 *   {"type":"error","message":"…","status":404}
 * `done`/`error` are always the last line and close the stream. The client
 * must read this with `fetch` + a stream reader, not `EventSource` —
 * `EventSource` reconnects automatically when a server closes a stream, which
 * would silently start a second full (paid) build the moment this one
 * finishes normally.
 */
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (line: unknown): void => {
        controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"))
      }
      try {
        const artefact = await buildExportArtefact(request, (event) => {
          send({ type: "stage", ...event })
        })
        send({
          type: "done",
          filename: artefact.filename,
          contentType: artefact.contentType,
          size: artefact.buffer.length,
          data: artefact.buffer.toString("base64"),
        })
      } catch (error) {
        if (error instanceof ExportError) {
          send({ type: "error", message: error.message, status: error.status })
        } else {
          console.error("[results/export/stream]", error)
          send({ type: "error", message: "Could not build that export.", status: 500 })
        }
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      // Disables any intermediary buffering proxy (e.g. nginx) so stage
      // events reach the browser as they are enqueued, not batched.
      "X-Accel-Buffering": "no",
    },
  })
}
