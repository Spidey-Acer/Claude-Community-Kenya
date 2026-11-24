/**
 * Retention rule for the attending-card guest list: rows are deleted 2 days
 * after the event date. One definition, used by the purge cron.
 */

/** Days after Event.date that guest rows are kept. */
export const GUEST_RETENTION_DAYS = 2

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Events dated strictly before this instant have outlived their guest rows. */
export function guestRetentionCutoff(now: Date): Date {
  return new Date(now.getTime() - GUEST_RETENTION_DAYS * MS_PER_DAY)
}
