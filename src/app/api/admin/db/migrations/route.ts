/**
 * Admin-only: report Prisma migration status and apply pending migration
 * files that ship in this build. See `src/lib/db/migrations.ts` for why the
 * app applies its own migrations. SUPER_ADMIN only (`settings:edit`), CSRF
 * protected, audited. The request never carries SQL; it names migrations
 * that already exist under `prisma/migrations`.
 */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { withCsrfProtection } from "@/lib/csrf"
import { checkApiPermission } from "@/lib/rbac"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"
import {
  loadLocalMigrations,
  migrationStatus,
  splitStatements,
  type AppliedMigration,
} from "@/lib/db/migrations"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface MigrationRow {
  migration_name: string
  checksum: string
  finished_at: Date | null
  rolled_back_at: Date | null
}

/** Host and port only: enough to confirm which database answered, never the credentials. */
function databaseHost(): string {
  try {
    const url = new URL(process.env["DATABASE_URL"] ?? "")
    return `${url.hostname}:${url.port || "5432"}`
  } catch {
    return "unknown"
  }
}

async function readApplied(): Promise<AppliedMigration[] | null> {
  try {
    const rows = await prisma.$queryRaw<MigrationRow[]>`
      SELECT migration_name, checksum, finished_at, rolled_back_at
      FROM "_prisma_migrations"
      ORDER BY started_at ASC`
    return rows.map((r) => ({
      name: r.migration_name,
      checksum: r.checksum,
      finishedAt: r.finished_at,
      rolledBackAt: r.rolled_back_at,
    }))
  } catch (error) {
    // 42P01: relation does not exist. Prisma has never run here; report it,
    // do not create the table behind Prisma's back.
    if (error instanceof Error && /42P01|does not exist/.test(error.message)) return null
    throw error
  }
}

export async function GET() {
  const check = await checkApiPermission("settings", "edit")
  if (!check.authorized) return check.response

  const [applied, local] = await Promise.all([readApplied(), loadLocalMigrations(process.cwd())])
  if (applied === null) {
    return NextResponse.json({
      success: true,
      data: { tableMissing: true, databaseHost: databaseHost(), local: local.map((m) => m.name) },
    })
  }
  return NextResponse.json({
    success: true,
    data: {
      tableMissing: false,
      databaseHost: databaseHost(),
      ...migrationStatus(applied, local),
    },
  })
}

const applySchema = z.object({
  names: z.array(z.string().regex(/^[0-9]{14}_[a-z0-9_]+$/)).min(1).max(10),
  confirm: z.literal("apply"),
})

export async function POST(request: NextRequest) {
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

  const check = await checkApiPermission("settings", "edit")
  if (!check.authorized) return check.response

  const parsed = applySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "names[] and confirm:'apply' required" }, { status: 400 })
  }

  const [applied, local] = await Promise.all([readApplied(), loadLocalMigrations(process.cwd())])
  if (applied === null) {
    return NextResponse.json(
      { success: false, error: "_prisma_migrations table is missing; this database was never migrated by Prisma" },
      { status: 409 },
    )
  }
  const status = migrationStatus(applied, local)
  const notPending = parsed.data.names.filter((n) => !status.pending.includes(n))
  if (notPending.length > 0) {
    return NextResponse.json(
      { success: false, error: `Not pending: ${notPending.join(", ")}` },
      { status: 409 },
    )
  }

  const meta = getRequestMetadata(request)
  const done: string[] = []
  for (const name of parsed.data.names) {
    const migration = local.find((m) => m.name === name)
    if (!migration) continue
    const statements = splitStatements(migration.sql)
    const id = randomUUID()
    await prisma.$executeRaw`
      INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, applied_steps_count)
      VALUES (${id}, ${migration.checksum}, ${name}, now(), 0)`
    for (let i = 0; i < statements.length; i++) {
      try {
        // One statement per call: the pooler runs in transaction mode, so
        // each DDL statement is its own transaction, exactly what Prisma's
        // own runner does for a PostgreSQL migration without a wrapper.
        await prisma.$executeRawUnsafe(statements[i])
        await prisma.$executeRaw`
          UPDATE "_prisma_migrations" SET applied_steps_count = ${i + 1} WHERE id = ${id}`
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        await prisma.$executeRaw`
          UPDATE "_prisma_migrations" SET logs = ${`statement ${i + 1}/${statements.length}: ${message}`} WHERE id = ${id}`
        await logAudit({
          userId: check.user.id,
          userName: check.user.name,
          userEmail: check.user.email,
          action: "UPDATE",
          entity: "database-migration",
          entityId: name,
          changes: { applied: done, failedAt: i + 1, error: message },
          ...meta,
        })
        return NextResponse.json(
          { success: false, error: `Migration ${name} failed at statement ${i + 1}: ${message}`, applied: done },
          { status: 500 },
        )
      }
    }
    await prisma.$executeRaw`
      UPDATE "_prisma_migrations" SET finished_at = now() WHERE id = ${id}`
    done.push(name)
  }

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "database-migration",
    entityId: done.join(","),
    changes: { applied: done },
    ...meta,
  })
  return NextResponse.json({ success: true, data: { applied: done } })
}
