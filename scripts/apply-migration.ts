/**
 * apply-migration.ts
 * Applies a single migration SQL file via the pooler DATABASE_URL and records
 * it in the _prisma_migrations table so `prisma migrate deploy` on Vercel
 * sees it as already applied.
 *
 * Usage: npx tsx scripts/apply-migration.ts <migration_name> <sql_file>
 */

import { readFileSync } from "fs";
import { Client } from "pg";
import * as crypto from "crypto";

const [, , migrationName, sqlFile] = process.argv;
if (!migrationName || !sqlFile) {
  console.error("Usage: npx tsx scripts/apply-migration.ts <migration_name> <sql_file>");
  process.exit(1);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");

  const sql = readFileSync(sqlFile, "utf-8");
  const checksum = crypto.createHash("sha256").update(sql).digest("hex");

  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Check if already applied
    const existing = await client.query(
      `SELECT id FROM "_prisma_migrations" WHERE migration_name = $1`,
      [migrationName]
    );
    if (existing.rowCount && existing.rowCount > 0) {
      console.log(`Migration "${migrationName}" already recorded — skipping.`);
      return;
    }

    console.log(`Applying migration: ${migrationName}`);
    await client.query(sql);
    console.log("SQL applied.");

    // Record in _prisma_migrations
    await client.query(
      `INSERT INTO "_prisma_migrations"
         (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
       VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
      [crypto.randomUUID(), checksum, migrationName]
    );
    console.log(`Recorded migration "${migrationName}" in _prisma_migrations.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
