import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { withCsrfProtection } from "@/lib/csrf"
import { buildEventBundle } from "@/lib/gallery/bundle"

/**
 * POST /api/admin/photos/bundle/[eventSlug] — (re)build an album's zip.
 *
 * Pre-generated rather than zipped on request: doing it per visitor would hold
 * a function open for the length of the archive every single time somebody
 * taps download, and hand them a stream with no size and no resume. Built
 * once, the zip is a plain object on a CDN — resumable, cacheable, and free to
 * serve.
 *
 * Slow by nature (it reads every photo in the album), so it gets the long
 * ceiling rather than the default.
 */
export const maxDuration = 300

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventSlug: string }> },
) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("photos", "edit")
  if (!check.authorized) return check.response

  const { eventSlug } = await params

  try {
    const result = await buildEventBundle(eventSlug)
    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Bundle failed" },
      { status: 500 },
    )
  }
}
