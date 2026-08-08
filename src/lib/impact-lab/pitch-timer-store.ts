/**
 * Shared pitch-timer state — one running countdown per cohort, visible to
 * every judge on the room's screens.
 *
 * Judges are on their own phones with clocks that do not agree with each
 * other, so the timer is a single row of `startedAt` + `seconds` in the
 * database rather than anything client-local: every device derives the same
 * countdown from the same `startedAt`, corrected for its own clock skew
 * against the server's clock (`serverNow` in the read result).
 *
 * Same non-existent-table posture as rubric-store.ts: this can ship before
 * `impact_lab_pitch_timers` exists in a given database. Reads degrade to "no
 * timer running" rather than error the scoring screen; the route layer's
 * writes say what migration is missing instead of throwing a bare 500 at
 * whichever judge tapped Start.
 */

import { prisma } from "@/lib/prisma"

export const MIN_SECONDS = 30
export const MAX_SECONDS = 3600
export const DEFAULT_SECONDS = 300

export interface PitchTimerState {
  startedAt: string
  seconds: number
  startedBy: string
  /** The server's clock at the moment of this read, for client skew correction. */
  serverNow: string
}

export function isValidSeconds(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_SECONDS &&
    value <= MAX_SECONDS
  )
}

/**
 * The running timer for a cohort, or null when none is running — including
 * when the table does not exist yet. Never throws: this sits on the judging
 * screen's ~2s poll, and an unreadable row must not error a live scorecard.
 */
export async function loadPitchTimer(cohort: string): Promise<PitchTimerState | null> {
  try {
    const row = await prisma.impactLabPitchTimer.findUnique({
      where: { cohort },
      select: { startedAt: true, seconds: true, startedBy: true },
    })
    if (!row) return null
    return {
      startedAt: row.startedAt.toISOString(),
      seconds: row.seconds,
      startedBy: row.startedBy,
      serverNow: new Date().toISOString(),
    }
  } catch (error) {
    console.error(`[pitch-timer-store] could not read the timer for ${cohort}`, error)
    return null
  }
}
