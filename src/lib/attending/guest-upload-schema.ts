/**
 * Server-side schema for the organiser's guest-list upload.
 *
 * Strict on purpose: the browser sends only email and status per row, and the
 * server rejects anything else (a name, a phone number, a photo-shaped blob)
 * rather than ignoring it. Caps: 2,000 rows per request, 254 characters per
 * email.
 */
import { z } from "zod"
import { MAX_EMAIL_LENGTH } from "./hmac-email"
import { MAX_STATUS_LENGTH } from "./parse-guest-csv"

/** Most rows accepted in one upload request. */
export const MAX_GUEST_ROWS = 2000

const guestRowSchema = z
  .object({
    email: z.string().trim().min(1).max(MAX_EMAIL_LENGTH),
    status: z.string().trim().min(1).max(MAX_STATUS_LENGTH),
  })
  .strict()

export const guestUploadSchema = z
  .object({
    mode: z.enum(["merge", "replace"]),
    guests: z.array(guestRowSchema).min(1).max(MAX_GUEST_ROWS),
  })
  .strict()

export type GuestUpload = z.infer<typeof guestUploadSchema>
