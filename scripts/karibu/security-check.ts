/**
 * security-check — read-only intrusion triage for the production database.
 *
 * Written 2026-07-20 after an audit found that the admin login endpoint has no
 * rate limiting at all (`RateLimits.LOGIN` is defined in lib/rate-limit.ts but
 * referenced nowhere, and proxy.ts excludes `api/auth` from its matcher). That
 * leaves credential stuffing unthrottled, so "has anyone actually got in?" is a
 * question worth answering from data rather than assumption.
 *
 * What it surfaces:
 *   - every privileged account, when it was created, and when it last logged in
 *   - accounts created recently (an attacker's first move after access)
 *   - audit-log activity grouped by actor and by source IP
 *   - privilege changes and outstanding password-reset tokens
 *
 * Absence of findings here is NOT proof of no compromise: successful logins are
 * only visible via `lastLogin`, and FAILED attempts are not recorded anywhere
 * (there is no auth logging to check). Web-server logs are the other half.
 *
 * Read-only — issues no writes.
 * Run:  DATABASE_URL='postgresql://...' npx tsx scripts/karibu/security-check.ts
 */

import { requireDatabaseUrl } from "./db-target";

requireDatabaseUrl();

const PRIVILEGED = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];
const RECENT_DAYS = 60;

async function main() {
  // Imported inside main() so the guard reports a missing DATABASE_URL before
  // prisma connects. Dynamic because tsx compiles this to CJS.
  const { prisma } = await import("../../src/lib/prisma");

  try {
    const since = new Date(Date.now() - RECENT_DAYS * 86_400_000);

    const [users, recentUsers, auditByActor, auditByIp, privChanges, resetTokens] =
      await Promise.all([
        prisma.user.findMany({
          where: { role: { in: PRIVILEGED as never } },
          select: {
            email: true, role: true, active: true,
            lastLogin: true, createdAt: true, emailVerified: true,
          },
          orderBy: { createdAt: "asc" },
        }),
        prisma.user.findMany({
          where: { createdAt: { gte: since } },
          select: { email: true, role: true, createdAt: true, active: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.auditLog.groupBy({
          by: ["userEmail"],
          _count: true,
          _max: { createdAt: true },
        }),
        prisma.auditLog.groupBy({
          by: ["ipAddress"],
          _count: true,
          _max: { createdAt: true },
        }),
        prisma.auditLog.findMany({
          where: { entity: "User" },
          select: {
            action: true, userEmail: true, entityId: true,
            changes: true, ipAddress: true, createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 25,
        }),
        prisma.user.count({ where: { passwordResetExpires: { gte: new Date() } } }),
      ]);

    console.log("=== Privileged accounts ===");
    for (const u of users) {
      const last = u.lastLogin ? u.lastLogin.toISOString().slice(0, 16).replace("T", " ") : "NEVER";
      const flags = [u.active ? null : "INACTIVE", u.emailVerified ? null : "UNVERIFIED"]
        .filter(Boolean).join(", ");
      console.log(
        `  ${u.role.padEnd(11)} ${u.email.padEnd(34)} created ${u.createdAt.toISOString().slice(0, 10)}` +
          `  last login ${last}${flags ? `  [${flags}]` : ""}`,
      );
    }
    console.log(`  ${users.length} privileged account(s) total\n`);

    console.log(`=== Accounts created in the last ${RECENT_DAYS} days ===`);
    if (recentUsers.length === 0) console.log("  none");
    for (const u of recentUsers.slice(0, 20)) {
      console.log(
        `  ${u.createdAt.toISOString().slice(0, 10)}  ${u.role.padEnd(11)} ${u.email}` +
          `${u.active ? "" : " [INACTIVE]"}`,
      );
    }
    if (recentUsers.length > 20) console.log(`  ...and ${recentUsers.length - 20} more`);
    console.log(`  ${recentUsers.length} total\n`);

    console.log("=== Audit-log activity by actor ===");
    if (auditByActor.length === 0) console.log("  no audit entries at all");
    for (const a of auditByActor) {
      const when = a._max.createdAt?.toISOString().slice(0, 10) ?? "?";
      console.log(`  ${String(a.userEmail ?? "(none)").padEnd(34)} ${String(a._count).padStart(5)} action(s), last ${when}`);
    }

    console.log("\n=== Audit-log activity by source IP ===");
    if (auditByIp.length === 0) console.log("  no audit entries at all");
    for (const a of auditByIp) {
      const when = a._max.createdAt?.toISOString().slice(0, 10) ?? "?";
      console.log(`  ${String(a.ipAddress ?? "(none)").padEnd(40)} ${String(a._count).padStart(5)} action(s), last ${when}`);
    }

    console.log("\n=== Recent changes to user accounts (role/status) ===");
    if (privChanges.length === 0) console.log("  none");
    for (const c of privChanges) {
      console.log(
        `  ${c.createdAt.toISOString().slice(0, 10)}  ${c.action.padEnd(8)} by ${c.userEmail ?? "?"}` +
          ` from ${c.ipAddress ?? "?"} — ${JSON.stringify(c.changes)}`,
      );
    }

    console.log(`\n=== Outstanding password-reset tokens: ${resetTokens} ===`);
    if (resetTokens > 0) {
      console.log("  A live reset token is a takeover path if the mailbox is compromised.");
    }

    console.log(
      "\nReminder: failed logins are not recorded anywhere in this app, so a clean\n" +
        "report here does not rule out an in-progress brute force. Check the host/CDN\n" +
        "access logs for repeated POSTs to /api/auth/callback/credentials.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
