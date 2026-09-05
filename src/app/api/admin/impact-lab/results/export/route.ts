import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { buildExportArtefact, ExportError } from "@/lib/impact-lab/export-pipeline"

/**
 * GET /api/admin/impact-lab/results/export?cohort=…&format=xlsx|pdf[&analyses=off][&contacts=off][&checkedIn=N]
 *
 * The complete results record — Excel workbook or PDF — generated on request
 * and streamed straight to the browser. Deliberately never persisted to disk
 * or a bucket: the workbook carries every participant's name and email, and
 * participant data has leaked from an artefact-on-disk before. (The PDF, the
 * artefact built for sharing, omits contact details entirely, regardless of
 * `contacts`.)
 *
 * The actual build — validation, DB loads, analysis generation, the Excel or
 * PDF render — lives in `@/lib/impact-lab/export-pipeline`, shared with
 * `export/stream/route.ts` (the same pipeline, reporting its own progress
 * over NDJSON) so the two routes can never drift into producing different
 * bytes for the same inputs. This route is now just the byte-response
 * wrapper: same request params, same validation errors, same output as
 * before the split.
 *
 * Per-team project analyses are generated at export time from the teams' own
 * submissions (see export-analysis for the honesty rules) — pass
 * `analyses=off` for a fast pull without them. Generation failures degrade
 * to an export without the affected sections, never to an error artefact.
 *
 * `contacts=off` (xlsx only) omits every participant and judge email column,
 * for a workbook that can be shared outside the organising team — sponsors,
 * a co-organiser at another institution. Defaults to `on` so the existing
 * organiser-facing behaviour is unchanged; ignored for `format=pdf`, which
 * never carried contact details to begin with.
 *
 * `checkedIn=<positive integer>` records an organiser's own count (e.g. read
 * off Luma at the door) alongside the system's own, when the two disagree —
 * see `ExportSummary.participantsCheckedInRecorded`. Must be a whole number
 * no greater than the number of registered participants; anything else is a
 * 400, not a silently ignored or clamped value, because this figure ends up
 * printed on the cover of a document built to be read by Anthropic.
 *
 * Gated on `edit` (not `view`): the file is built to leave the building —
 * sponsors, community — so producing it is treated as an organiser action,
 * one notch above reading the leaderboard.
 */
export const maxDuration = 300
export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "edit")
  if (!check.authorized) return check.response

  try {
    const artefact = await buildExportArtefact(request)
    return new NextResponse(new Uint8Array(artefact.buffer), {
      headers: {
        "Content-Type": artefact.contentType,
        "Content-Disposition": `attachment; filename="${artefact.filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    if (error instanceof ExportError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status })
    }
    throw error
  }
}
