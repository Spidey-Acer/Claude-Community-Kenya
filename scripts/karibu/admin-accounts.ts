/**
 * admin-accounts — list, create and reset privileged accounts.
 *
 * Replaces scripts/reset-admin-password.ts, which hardcoded a single email and
 * defaulted to the literal password "changeme123!" committed in the repo.
 *
 * Passwords are generated here, on the operator's machine, and printed once.
 * Nothing is ever taken from an argument, so a password cannot leak via shell
 * history, CI logs, or a chat transcript.
 *
 * Usage (DATABASE_URL must be set — see db-target):
 *   npx tsx scripts/karibu/admin-accounts.ts --list
 *   npx tsx scripts/karibu/admin-accounts.ts --reset peter@example.com
 *   npx tsx scripts/karibu/admin-accounts.ts --create sam@example.com --name "Sam Kyalo" --role ADMIN
 *
 * Roles: ADMIN (full content access incl. blog authoring), MODERATOR (review
 * queues, read-only on blog), MEMBER. SUPER_ADMIN cannot be granted here on
 * purpose — mint it deliberately, not from a convenience script.
 */

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { requireDatabaseUrl } from "./db-target";

const GRANTABLE_ROLES = ["ADMIN", "MODERATOR", "MEMBER"] as const;
type GrantableRole = (typeof GRANTABLE_ROLES)[number];

const BCRYPT_COST = 12; // matches src/auth.ts

requireDatabaseUrl();

/** Read `--flag value` from argv, or undefined when absent. */
function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

/**
 * Generate a high-entropy, readable password.
 *
 * base64url over 18 random bytes — ~144 bits, no ambiguous punctuation to
 * garble when typed from a screen or read aloud over a call.
 */
function generatePassword(): string {
  return randomBytes(18).toString("base64url");
}

async function main() {
  // Imported inside main() so the guard reports a missing DATABASE_URL before
  // prisma connects. Dynamic because tsx compiles this to CJS.
  const { prisma } = await import("../../src/lib/prisma");

  try {
    const resetEmail = arg("--reset");
    const createEmail = arg("--create");

    if (process.argv.includes("--list") || (!resetEmail && !createEmail)) {
      const users = await prisma.user.findMany({
        where: { role: { in: ["SUPER_ADMIN", "ADMIN", "MODERATOR"] as never } },
        select: { email: true, role: true, active: true, lastLogin: true, firstName: true, lastName: true },
        orderBy: { createdAt: "asc" },
      });
      console.log("=== Privileged accounts ===");
      for (const u of users) {
        const last = u.lastLogin ? u.lastLogin.toISOString().slice(0, 10) : "never";
        console.log(
          `  ${u.role.padEnd(11)} ${u.email.padEnd(34)} ${`${u.firstName} ${u.lastName}`.padEnd(22)}` +
            ` last login ${last}${u.active ? "" : "  [INACTIVE]"}`,
        );
      }
      if (users.length === 0) console.log("  none");
      console.log(
        "\n  --reset <email>                              generate a new password\n" +
          "  --create <email> --name 'X Y' --role ADMIN    add an account",
      );
      return;
    }

    if (resetEmail) {
      const existing = await prisma.user.findUnique({ where: { email: resetEmail } });
      if (!existing) {
        console.error(`No account with email ${resetEmail}. Run --list to see accounts.`);
        process.exit(1);
      }
      const password = generatePassword();
      await prisma.user.update({
        where: { email: resetEmail },
        data: {
          passwordHash: await bcrypt.hash(password, BCRYPT_COST),
          // Any outstanding reset token is a second way in — retire it.
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });
      console.log(`\nPassword reset for ${resetEmail} (${existing.role})\n`);
      console.log(`    ${password}\n`);
      console.log("Shown once — it is not stored anywhere in plaintext. Save it now.");
      console.log("Existing sessions stay valid for up to 5 minutes (see auth.ts REVALIDATE_MS).");
      return;
    }

    if (createEmail) {
      const name = arg("--name");
      const role = (arg("--role") ?? "ADMIN") as GrantableRole;

      if (!name || !name.includes(" ")) {
        console.error("--name is required, as a quoted first and last name: --name 'Sam Kyalo'");
        process.exit(1);
      }
      if (!GRANTABLE_ROLES.includes(role)) {
        console.error(`--role must be one of: ${GRANTABLE_ROLES.join(", ")}`);
        process.exit(1);
      }
      if (await prisma.user.findUnique({ where: { email: createEmail } })) {
        console.error(`${createEmail} already exists. Use --reset to change its password.`);
        process.exit(1);
      }

      const [firstName, ...rest] = name.trim().split(/\s+/);
      const password = generatePassword();
      await prisma.user.create({
        data: {
          email: createEmail,
          firstName,
          lastName: rest.join(" "),
          role: role as never,
          passwordHash: await bcrypt.hash(password, BCRYPT_COST),
          active: true,
          // Created by an operator who already controls the database, so the
          // address does not need proving a second time.
          emailVerified: true,
        },
      });
      console.log(`\nCreated ${role} account for ${name} <${createEmail}>\n`);
      console.log(`    ${password}\n`);
      console.log("Shown once. Send it over a private channel and have them change it at /admin.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
