/**
 * One-time backfill: load a folder of event photos into R2 and the database.
 *
 * Written for the Impact Lab shoot — a few hundred files sitting in a folder,
 * which is too many to push through a browser form in one sitting and too few
 * to justify building anything cleverer.
 *
 * For each image it creates the MeetupPhoto row, generates the thumb and full
 * derivatives, uploads all three renditions, and sets storageKey — the same
 * path the admin upload takes, so backfilled photos are indistinguishable from
 * ones uploaded through the UI.
 *
 * Alt text is left empty on purpose. A generated alt like "Photo 47 from AI
 * Mashinani" is worse than nothing: it tells a screen-reader user a filename
 * and calls it a description. Add alt in the admin UI for the shots where who
 * or what is in frame actually matters.
 *
 * Dry run by default — lists what it would upload and writes nothing:
 *
 *   DATABASE_URL="postgres://..." npm run backfill:gallery -- --event ai-mashinani --dir ./photos
 *   DATABASE_URL="postgres://..." npm run backfill:gallery -- --event ai-mashinani --dir ./photos --apply
 *
 * Needs the R2 env vars too (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
 * R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL); the adapter throws
 * naming whichever is missing.
 *
 * Re-runnable: it skips files whose name already appears as a caption-free
 * row for this event, so an interrupted run resumes instead of duplicating.
 *
 * Alternative for a pure object load with no database rows (not what you want
 * for the gallery, but useful for one-off assets):
 *   wrangler r2 object put <bucket>/events/<slug>/original/<id>.jpg --file ./photo.jpg
 */

import { readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join } from "node:path"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { buildStorageKey } from "../src/lib/gallery/r2"
import { extensionOf, generateAndUploadDerivatives } from "../src/lib/gallery/derivatives"

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".avif"])

function flag(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? null : process.argv[i + 1] ?? null
}

const apply = process.argv.includes("--apply")
const eventSlug = flag("event")
const dir = flag("dir")

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  avif: "image/avif",
}

async function main() {
  if (!eventSlug || !dir) {
    console.error(
      "Usage: npm run backfill:gallery -- --event <event-slug> --dir <folder> [--apply]",
    )
    process.exitCode = 1
    return
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error(
      'DATABASE_URL is not set. Run with the target database URL, e.g.\n' +
        '  DATABASE_URL="postgres://..." npm run backfill:gallery -- --event ai-mashinani --dir ./photos',
    )
    process.exitCode = 1
    return
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 5 }) })

  try {
    const event = await prisma.event.findUnique({
      where: { slug: eventSlug },
      select: { id: true, slug: true, title: true },
    })
    if (!event) {
      console.error(`No event with slug "${eventSlug}".`)
      process.exitCode = 1
      return
    }

    const files = readdirSync(dir)
      .filter((f) => IMAGE_EXTS.has(extname(f).toLowerCase()))
      .sort()

    if (files.length === 0) {
      console.error(`No images found in ${dir}.`)
      process.exitCode = 1
      return
    }

    // Resume support: a previous run's rows carry the source filename in
    // caption, so we can tell what already landed.
    const existing = await prisma.meetupPhoto.findMany({
      where: { eventId: event.id, storageKey: { not: null } },
      select: { caption: true },
    })
    const done = new Set(existing.map((p) => p.caption).filter(Boolean) as string[])

    const pending = files.filter((f) => !done.has(f))

    console.log(`Event : ${event.title} (${event.slug})`)
    console.log(`Folder: ${dir}`)
    console.log(`Found : ${files.length} image(s), ${pending.length} not yet uploaded\n`)

    let totalBytes = 0
    for (const file of pending) {
      const full = join(dir, file)
      const size = statSync(full).size
      totalBytes += size
      console.log(`  ${apply ? "uploading" : "would upload"}  ${file}  (${Math.round(size / 1024)} KB)`)

      if (!apply) continue

      const ext = extensionOf(file)
      const photo = await prisma.meetupPhoto.create({
        data: {
          url: "",
          thumbnailUrl: null,
          // Source filename, so a re-run knows this one is already in.
          caption: file,
          alt: null,
          eventId: event.id,
          featured: false,
        },
      })
      const storageKey = buildStorageKey(event.slug, photo.id)
      const result = await generateAndUploadDerivatives(
        readFileSync(full),
        storageKey,
        ext,
        MIME[ext] ?? "image/jpeg",
      )
      await prisma.meetupPhoto.update({ where: { id: photo.id }, data: { storageKey } })
      console.log(
        `     → thumb ${Math.round(result.thumbBytes / 1024)} KB, full ${Math.round(result.fullBytes / 1024)} KB`,
      )
    }

    console.log(
      `\n${apply ? "Uploaded" : "Would upload"} ${pending.length} photo(s), ${Math.round(totalBytes / 1024 / 1024)} MB of originals.`,
    )
    if (!apply) {
      console.log("Dry run — nothing written. Re-run with --apply.")
    } else {
      console.log(
        `\nNow build the download-all zip:\n  POST /api/admin/photos/bundle/${event.slug}\n(or wait for the nightly cron to notice it is stale).`,
      )
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
