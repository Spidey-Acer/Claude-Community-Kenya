/**
 * db-target — resolve and announce the database a script is about to touch.
 *
 * Scripts run under `tsx`, which does not load `.env` files the way Next.js
 * does, and `src/lib/prisma.ts` asserts `process.env.DATABASE_URL!` — so a
 * missing var surfaces as an unreadable pg SASL "client password must be a
 * string" trace. Call this first to fail with something actionable instead.
 *
 * It also echoes the target host, because the repo's `.env` files still point
 * at the decommissioned Supabase pooler while production runs on the VPS.
 */

/**
 * Exit with guidance unless DATABASE_URL is set and parseable, then print the
 * target host so the operator can see which database is about to be read.
 *
 * @returns the validated connection string
 */
export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.error(
      [
        "DATABASE_URL is not set.",
        "",
        "tsx does not read .env.local automatically. Set it for this command only:",
        "",
        "  bash:        DATABASE_URL='postgresql://...' npx tsx <script>",
        '  PowerShell:  $env:DATABASE_URL="postgresql://..."; npx tsx <script>',
        "",
        "Production is the VPS pooler, not Supabase. The connection string lives in",
        "C:\\Projects\\_backups\\cck\\vps-connection.txt and needs uselibpqcompat=true.",
      ].join("\n"),
    );
    process.exit(1);
  }

  try {
    const target = new URL(url);
    console.log(`Target: ${target.hostname}:${target.port || 5432}${target.pathname}\n`);
  } catch {
    console.error("DATABASE_URL is not a valid connection URL.");
    process.exit(1);
  }

  return url;
}
