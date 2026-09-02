/**
 * Row-locked read/write of one match run's `result` JSON.
 *
 * Two callers editing the same run's roster at the same moment (a teammate
 * and an admin, or two teammates) would otherwise both read the same JSON
 * and the second write would silently discard the first person's change.
 * `withRunLock` takes a `SELECT ... FOR UPDATE` on the run row first, so the
 * second transaction blocks until the first commits, then reads the result
 * the first one just wrote.
 */

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"

export interface LockedRun {
  result: unknown
  settings: unknown
}

/**
 * Run `fn` inside a transaction that already holds the run row's lock. `fn`
 * is responsible for reading the fresh row (see `readLockedRun`) and writing
 * back (see `writeRunResult`) — this only owns the lock + transaction boundary.
 */
export async function withRunLock<T>(
  runId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM impact_lab_match_runs WHERE id = ${runId} FOR UPDATE`
    return fn(tx)
  })
}

/** The run's current `result` + `settings`, or null if it no longer exists. */
export async function readLockedRun(
  tx: Prisma.TransactionClient,
  runId: string
): Promise<LockedRun | null> {
  return tx.impactLabMatchRun.findUnique({
    where: { id: runId },
    select: { result: true, settings: true },
  })
}

/**
 * Overwrite a run's `result` column. `JSON.parse(JSON.stringify(...))` strips
 * any non-JSON values (e.g. `undefined`) before Prisma's Json column write —
 * the same normalization the pre-existing roster code used.
 */
export async function writeRunResult(
  tx: Prisma.TransactionClient,
  runId: string,
  result: unknown
): Promise<void> {
  await tx.impactLabMatchRun.update({
    where: { id: runId },
    data: { result: JSON.parse(JSON.stringify(result)) },
  })
}
