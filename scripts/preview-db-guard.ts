/**
 * Refuse to run against anything but the preview database.
 *
 * The smoke scripts create and delete rows. They read DATABASE_URL like
 * everything else, and DATABASE_URL is whatever the current shell says — in a
 * Vercel shell, or after a stray `vercel env pull`, that is production. Nothing
 * about the scripts themselves would notice.
 *
 * Import this before doing any work, in any script that writes rows.
 */
export function requirePreviewDatabase(): void {
  const url = process.env["DATABASE_URL"]
  if (!url) {
    throw new Error("DATABASE_URL is not set. Did you import 'dotenv/config' first?")
  }

  let database: string
  try {
    database = new URL(url).pathname.replace(/^\//, "")
  } catch {
    throw new Error("DATABASE_URL is not a parseable URL.")
  }

  if (database !== "cck_preview") {
    throw new Error(
      `Refusing to run: this script writes rows and DATABASE_URL points at "${database}", ` +
        `not cck_preview. Point at the preview database first.`,
    )
  }
}
