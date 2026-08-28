// Moderation-transition rules for the combined EventQuestion / EventContribution
// queue. Kept separate from the API route so the rule is unit-testable without
// a database.
// See docs/superpowers/specs/2026-08-28-conversations-live-design.md.

import type { SubmissionModerationStatus } from "@/generated/prisma/client"

/** Targets a 2-tap moderation action may set. PENDING is deliberately absent —
 * there is no "un-approve back to pending" action; a mis-tap is corrected by
 * tapping a different one of these three, not by reverting. */
export const MODERATION_TARGETS = ["APPROVED", "FEATURED", "REJECTED"] as const
export type ModerationTarget = (typeof MODERATION_TARGETS)[number]

/**
 * Whether a moderation queue row can move to `target` from its current
 * status. Every current status (including APPROVED/FEATURED/REJECTED) may
 * move to any of the three targets — moderation at a live event needs
 * one-tap recoverability, not a one-way state machine.
 *
 * @param target - The status a PATCH is requesting.
 * @returns true if the transition is allowed.
 */
export function isValidModerationTransition(
  target: string
): target is ModerationTarget {
  return (MODERATION_TARGETS as readonly string[]).includes(target)
}

/** Type guard used before persisting a status read back from a query result
 * that predates this feature's stricter target set. */
export function isModerationStatus(value: string): value is SubmissionModerationStatus {
  return value === "PENDING" || (MODERATION_TARGETS as readonly string[]).includes(value)
}
