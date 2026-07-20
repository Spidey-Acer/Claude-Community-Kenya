/**
 * audit-inboxes — read-only snapshot of every submission inbox and the team roster.
 *
 * Answers "is anything sitting unreviewed, and is the public team list right?"
 * without opening the admin panel. Written during the 2026-07-20 production
 * audit, when /team was rendering a duplicate row and it was unclear whether
 * volunteer applications were reaching the database at all.
 *
 * Read-only — issues no writes.
 * Run:  DATABASE_URL='postgresql://...' npx tsx scripts/karibu/audit-inboxes.ts
 */

import { requireDatabaseUrl } from "./db-target";

requireDatabaseUrl();

async function main() {
  // Imported inside main() so the guard above reports a missing DATABASE_URL
  // before prisma tries to connect. Dynamic because tsx compiles this to CJS.
  const { prisma } = await import("../../src/lib/prisma");

  try {
    const [team, volunteers, joins, speakers, ideas, contacts] = await Promise.all([
      prisma.teamMember.findMany({
        select: { name: true, role: true, active: true, featured: true, slug: true },
        orderBy: [{ active: "desc" }, { featured: "desc" }, { order: "asc" }],
      }),
      prisma.volunteerApplication.groupBy({ by: ["status"], _count: true }),
      prisma.joinApplication.groupBy({ by: ["status"], _count: true }),
      prisma.speakerApplication.groupBy({ by: ["status"], _count: true }),
      prisma.ideaSubmission.groupBy({ by: ["status"], _count: true }),
      prisma.contactMessage.count(),
    ]);

    // How long the oldest unreviewed item has been waiting is the number that
    // matters — a pending count alone doesn't distinguish "came in today" from
    // "has been ignored for months".
    const [oldestJoin, newestJoin] = await Promise.all([
      prisma.joinApplication.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      prisma.joinApplication.findFirst({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const summarise = (rows: { status: string; _count: number }[]) =>
      rows.length === 0
        ? "none"
        : rows.map((r) => `${r.status.toLowerCase()}=${r._count}`).join(", ");

    const days = (d: Date) => Math.floor((Date.now() - d.getTime()) / 86_400_000);

    console.log("=== Team roster ===");
    for (const m of team) {
      const flags = [
        m.active ? "active" : "INACTIVE",
        m.featured ? "featured" : null,
        m.slug ? null : "NO SLUG",
      ].filter(Boolean);
      console.log(`  ${m.name} — ${m.role} [${flags.join(", ")}]`);
    }
    console.log(`  ${team.filter((m) => m.active).length} active of ${team.length} total\n`);

    console.log("=== Inboxes ===");
    console.log(`  volunteer : ${summarise(volunteers)}`);
    console.log(`  join      : ${summarise(joins)}`);
    console.log(`  speaker   : ${summarise(speakers)}`);
    console.log(`  idea      : ${summarise(ideas)}`);
    console.log(`  contact   : ${contacts} message(s)`);

    if (oldestJoin && newestJoin) {
      console.log(
        `\n  Oldest pending join application: ${days(oldestJoin.createdAt)} days ` +
          `(${oldestJoin.createdAt.toISOString().slice(0, 10)})`,
      );
      console.log(
        `  Most recent:                     ${days(newestJoin.createdAt)} days ` +
          `(${newestJoin.createdAt.toISOString().slice(0, 10)})`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
