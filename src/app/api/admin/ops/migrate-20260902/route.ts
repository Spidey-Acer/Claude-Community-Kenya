import { NextRequest, NextResponse } from "next/server"
import { checkApiPermission } from "@/lib/rbac"
import { prisma } from "@/lib/prisma"
import { logAudit, getRequestMetadata } from "@/lib/audit-log"

/**
 * One-off, admin-only: apply the two 2 Sep 2026 migrations from inside the
 * deployed app, because every SSH route to the database host was blocked on
 * event morning and Vercel cannot run `prisma migrate deploy`. The SQL is the
 * verbatim content of the two migration folders plus the `_prisma_migrations`
 * bookkeeping rows, so a later `migrate deploy` sees them as applied.
 *
 * Idempotent: refuses if both rows already exist. GET with `?confirm=apply`
 * so it can be fired from a logged-in admin browser; remove after use.
 */
export const dynamic = "force-dynamic"

const MIGRATIONS = [
  {
    id: "817eb83e-3afd-49ce-a7e2-14db5d0c3cc6",
    name: "20260902120000_impact_lab_event_tracks",
    checksum: "db9f3b6bc6d6a1217790035d73b75b2a008293d8896b20f9fc5b459e93817500",
    statements: [`ALTER TABLE "impact_lab_events" ADD COLUMN "tracks" JSONB`],
  },
  {
    id: "8d81f281-8206-431a-a919-4da8df7cf17b",
    name: "20260902120100_conversations_report_link",
    checksum: "1daa4ea3137a5fc6069ff082d3d8c4c3a59d2d141f3a9271cde911a98f337dd3",
    statements: [
      `ALTER TABLE "conversations_pages" ADD COLUMN "reportSummary" TEXT`,
      `ALTER TABLE "conversations_pages" ADD COLUMN "reportUrl" VARCHAR(500)`,
      `ALTER TABLE "impact_lab_events" ADD COLUMN "conversationsEventId" TEXT`,
      `CREATE INDEX "impact_lab_events_conversationsEventId_idx" ON "impact_lab_events"("conversationsEventId")`,
      `ALTER TABLE "impact_lab_events" ADD CONSTRAINT "impact_lab_events_conversationsEventId_fkey" FOREIGN KEY ("conversationsEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    ],
  },
] as const

export async function GET(request: NextRequest) {
  const check = await checkApiPermission("impact-lab", "create")
  if (!check.authorized) return check.response

  const applied = await prisma.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM _prisma_migrations WHERE migration_name LIKE '20260902%'
  `
  const appliedNames = new Set(applied.map((r) => r.migration_name))
  const pending = MIGRATIONS.filter((m) => !appliedNames.has(m.name))

  if (request.nextUrl.searchParams.get("confirm") !== "apply") {
    return NextResponse.json({ success: true, data: { applied: [...appliedNames], pending: pending.map((m) => m.name) } })
  }
  if (pending.length === 0) {
    return NextResponse.json({ success: true, data: { applied: [...appliedNames], pending: [], message: "Nothing to do" } })
  }

  await prisma.$transaction(
    async (tx) => {
      for (const m of pending) {
        for (const sql of m.statements) await tx.$executeRawUnsafe(sql)
        await tx.$executeRaw`
          INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
          VALUES (${m.id}, ${m.checksum}, now(), ${m.name}, NULL, NULL, now(), 1)
        `
      }
    },
    { timeout: 30_000 }
  )

  await logAudit({
    userId: check.user.id,
    userName: check.user.name,
    userEmail: check.user.email,
    action: "UPDATE",
    entity: "PrismaMigration",
    entityId: "20260902",
    changes: { applied: pending.map((m) => m.name) },
    ...getRequestMetadata(request),
  })

  return NextResponse.json({ success: true, data: { appliedNow: pending.map((m) => m.name) } })
}
