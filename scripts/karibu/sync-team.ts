/**
 * sync-team — upsert the canonical team roster, and nothing else.
 *
 * The full seed (`npx prisma db seed`) also touches users, events, projects and
 * blog posts, which makes it the wrong tool for a production team change. This
 * syncs `prisma/team-roster.ts` alone.
 *
 * Existing members are matched by slug. Name, role and order are refreshed;
 * bio, tagline, links and avatar are left alone so edits made in /admin/team
 * survive a re-run. Nothing is ever deleted or deactivated here — use
 * dedupe-team-members for that.
 *
 * Dry run by default.
 * Apply with:  DATABASE_URL='postgresql://...' npx tsx scripts/karibu/sync-team.ts --apply
 */

import { requireDatabaseUrl } from "./db-target";
import { TEAM_ROSTER } from "../../prisma/team-roster";

const APPLY = process.argv.includes("--apply");

requireDatabaseUrl();

async function main() {
  // Imported inside main() so the guard above reports a missing DATABASE_URL
  // before prisma tries to connect. Dynamic because tsx compiles this to CJS.
  const { prisma } = await import("../../src/lib/prisma");

  try {
    const existing = await prisma.teamMember.findMany({
      where: { slug: { in: TEAM_ROSTER.map((m) => m.slug) } },
      select: { slug: true },
    });
    const known = new Set(existing.map((m) => m.slug));

    for (const member of TEAM_ROSTER) {
      const verb = known.has(member.slug) ? "update" : "CREATE";
      console.log(`  ${verb.padEnd(6)} ${member.name} — ${member.role}`);
    }

    if (!APPLY) {
      const creates = TEAM_ROSTER.filter((m) => !known.has(m.slug)).length;
      console.log(`\nDRY RUN — ${creates} to create, ${TEAM_ROSTER.length - creates} to update. Re-run with --apply.`);
      return;
    }

    for (const member of TEAM_ROSTER) {
      await prisma.teamMember.upsert({
        where: { slug: member.slug },
        update: { name: member.name, role: member.role, order: member.order, active: true },
        create: { ...member, active: true },
      });
    }

    const active = await prisma.teamMember.count({ where: { active: true } });
    console.log(`\nSynced ${TEAM_ROSTER.length} member(s). ${active} now active on /team.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
