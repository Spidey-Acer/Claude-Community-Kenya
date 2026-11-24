/**
 * Classifies a rejected `navigator.share()` call. Only an AbortError means the
 * person closed the share sheet; any other failure is a real error and must
 * not be reported as a cancellation.
 */

/** True when the error is the user dismissing the share sheet. */
export function isShareCancelled(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: unknown }).name === "AbortError"
}
