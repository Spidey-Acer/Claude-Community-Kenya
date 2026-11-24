/**
 * Server-side schema for the organiser's guest-list upload.
 *
 * Strict on purpose: the browser sends only email and status per row, and the
 * server rejects anything else (a name, a phone number, a photo-shaped blob)
 * rather than ignoring it. Caps: 2,000 rows per request, 254 characters per
 * email. The status cell is free text on the wire but is normalised here: the
 * only values that ever reach storage are "approved" and "other".
 */
import { z } from "zod"
import { MAX_EMAIL_LENGTH } from "./hmac-email"
import { APPROVED_STATUS, MAX_STATUS_LENGTH, OTHER_STATUS } from "./parse-guest-csv"

/** Most rows accepted in one upload request. */
export const MAX_GUEST_ROWS = 2000

/** Collapses any status text to the two stored values. Nothing else is persisted. */
export function normalizeApprovalStatus(status: string): typeof APPROVED_STATUS | typeof OTHER_STATUS {
  return status.trim().toLowerCase() === APPROVED_STATUS ? APPROVED_STATUS : OTHER_STATUS
}

const guestRowSchema = z
  .object({
    email: z.string().trim().min(1).max(MAX_EMAIL_LENGTH),
    status: z.string().trim().min(1).max(MAX_STATUS_LENGTH).transform(normalizeApprovalStatus),
  })
  .strict()

export const guestUploadSchema = z
  .object({
    mode: z.enum(["merge", "replace"]),
    guests: z.array(guestRowSchema).min(1).max(MAX_GUEST_ROWS),
  })
  .strict()

export type GuestUpload = z.infer<typeof guestUploadSchema>
