import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildEventBundle, isBundleStale } from "@/lib/gallery/bundle"

/**
 * Nightly sweep: rebuild album zips that have fallen behind their photos.
 *
 * Uploading photos does not build a bundle inline — that would make an admin
 * wait out an archive of the whole album every time they added one more shot.
 * Instead the zip is allowed to go stale and this catches it, so "download
 * all" is never quietly missing the photos added yesterday.
 *
 * One album per run. If several are stale they resolve over several nights,
 * which is fine for an archive and keeps a single invocation well inside its
 * ceiling. Ordering by oldest bundle first means nothing starves.
 */
export const maxDuration = 300

export async function GET(request: NextRequest) {
  // Vercel Cron signs its calls with CRON_SECRET. Without this the endpoint is
  // an unauthenticated way to make the server do the most expensive work it
  // knows how to do, repeatedly.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET is not configured" },
      { status: 500 },
    )
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const candidates = await prisma.event.findMany({
    where: { photos: { some: { storageKey: { not: null } } } },
    select: { id: true, slug: true, bundleGeneratedAt: true },
    orderBy: { bundleGeneratedAt: { sort: "asc", nulls: "first" } },
  })

  for (const event of candidates) {
    if (!(await isBundleStale(event.id))) continue
    try {
      const result = await buildEventBundle(event.slug)
      return NextResponse.json({
        success: true,
        data: { rebuilt: event.slug, ...result },
      })
    } catch (err) {
      // One bad album must not stop the sweep reaching the others tomorrow.
      return NextResponse.json(
        {
          success: false,
          error: `Rebuild failed for ${event.slug}: ${err instanceof Error ? err.message : String(err)}`,
        },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ success: true, data: { rebuilt: null } })
}
