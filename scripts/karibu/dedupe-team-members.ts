/**
 * dedupe-team-members — collapse duplicate TeamMember rows.
 *
 * Rows created before the `slug` column existed carry `slug = NULL`. The seed
 * upserts on `slug`, so it can never match those rows: it mints a second row
 * for the same person and /team renders them twice (this shipped to production
 * — Peter Kibet appeared twice on claudekenya.org/team).
 *
 * For each name with more than one row, this keeps the richest row (slugged,
 * then most recently updated) and deactivates the rest. Deactivation rather
 * than deletion so the row stays recoverable and any future FK survives.
 *
 * Dry run by default — prints the plan and changes nothing.
 * Apply with:  npx tsx scripts/karibu/dedupe-team-members.ts --apply
 *
 * DATABASE_URL must be set in the environment — tsx does not load .env files
 * the way Next.js does. Set it explicitly so there is no ambiguity about which
 * database gets written to; the target host is echoed before any query runs.
 */

import { requireDatabaseUrl } from "./db-target";

const APPLY = process.argv.includes("--apply");

requireDatabaseUrl();

/** Higher score wins: a slugged row beats an unslugged one, then newer wins. */
function score(row: { slug: string | null; featured: boolean; updatedAt: Date }) {
  return (row.slug ? 1_000_000 : 0) + (row.featured ? 500_000 : 0) + row.updatedAt.getTime() / 1e6;
}

async function main() {
  // Imported inside main() so a missing DATABASE_URL surfaces as the guard
  // message above rather than a SASL "password must be a string" stack trace.
  // Dynamic rather than top-level await: tsx compiles this to CJS.
  const { prisma } = await import("../../src/lib/prisma");

  try {
    const rows = await prisma.teamMember.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true, featured: true, updatedAt: true },
    });

    const byName = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.name.trim().toLowerCase();
      byName.set(key, [...(byName.get(key) ?? []), row]);
    }

    const retire: { id: string; name: string }[] = [];
    for (const [, group] of byName) {
      if (group.length < 2) continue;
      const [keep, ...rest] = [...group].sort((a, b) => score(b) - score(a));
      console.log(`${keep.name}: ${group.length} active rows — keeping ${keep.id} (slug=${keep.slug ?? "NULL"})`);
      for (const row of rest) {
        console.log(`  retire ${row.id} (slug=${row.slug ?? "NULL"})`);
        retire.push({ id: row.id, name: row.name });
      }
    }

    if (retire.length === 0) {
      console.log("No duplicate active team members. Nothing to do.");
      return;
    }

    if (!APPLY) {
      console.log(`\nDRY RUN — ${retire.length} row(s) would be deactivated. Re-run with --apply.`);
      return;
    }

    const result = await prisma.teamMember.updateMany({
      where: { id: { in: retire.map((r) => r.id) } },
      data: { active: false },
    });
    console.log(`\nDeactivated ${result.count} duplicate row(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
