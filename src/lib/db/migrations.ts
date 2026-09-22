/**
 * Prisma migration status and statement splitting, pure and testable.
 *
 * The Vercel build runs `prisma generate && next build` only; nothing applies
 * migrations, and the direct Postgres port is reachable solely over an SSH
 * tunnel. This module lets the app apply its own shipped migration files from
 * the admin panel: it reads `prisma/migrations/<name>/migration.sql`, compares
 * them with the `_prisma_migrations` table the way Prisma does (name and
 * SHA-256 checksum), and splits a file into statements that the route runs
 * one at a time through the pooler. Files only, never SQL from a request.
 */
import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

export interface LocalMigration {
  name: string
  checksum: string
  sql: string
}

export interface AppliedMigration {
  name: string
  checksum: string
  finishedAt: Date | null
  rolledBackAt: Date | null
}

export interface MigrationStatus {
  /** Applied and finished, checksum matches the shipped file. */
  applied: string[]
  /** Shipped in the build, no row in the table. */
  pending: string[]
  /** Applied, but the shipped file no longer matches the recorded checksum. */
  modified: string[]
  /** A row exists with no finished_at and no rolled_back_at: a previous apply broke midway. */
  failed: string[]
}

/** SHA-256 hex of the file bytes, the value Prisma stores in `_prisma_migrations.checksum`. */
export function checksumOf(sql: string): string {
  return createHash("sha256").update(sql).digest("hex")
}

/** Sorted migration directory names under `<root>/prisma/migrations` that hold a `migration.sql`. */
export async function loadLocalMigrations(root: string): Promise<LocalMigration[]> {
  const dir = path.join(root, "prisma", "migrations")
  const entries = await readdir(dir, { withFileTypes: true })
  const names = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort()
  const out: LocalMigration[] = []
  for (const name of names) {
    let sql: string
    try {
      sql = await readFile(path.join(dir, name, "migration.sql"), "utf8")
    } catch {
      continue
    }
    out.push({ name, checksum: checksumOf(sql), sql })
  }
  return out
}

/**
 * Split a migration file into statements. Comment lines are dropped, then
 * the text is split on a statement-ending semicolon. Our files are plain
 * DDL; a dollar-quoted body (`$$`) could contain semicolons, so it is refused
 * rather than mis-split.
 */
export function splitStatements(sql: string): string[] {
  if (sql.includes("$$")) {
    throw new Error("unsupported: dollar-quoted body in migration")
  }
  const body = sql
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
  return body
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export function migrationStatus(
  applied: AppliedMigration[],
  local: Pick<LocalMigration, "name" | "checksum">[],
): MigrationStatus {
  const byName = new Map(applied.map((a) => [a.name, a]))
  const status: MigrationStatus = { applied: [], pending: [], modified: [], failed: [] }
  for (const m of local) {
    const row = byName.get(m.name)
    if (!row || row.rolledBackAt) {
      status.pending.push(m.name)
    } else if (!row.finishedAt) {
      status.failed.push(m.name)
    } else if (row.checksum !== m.checksum) {
      status.modified.push(m.name)
    } else {
      status.applied.push(m.name)
    }
  }
  return status
}
