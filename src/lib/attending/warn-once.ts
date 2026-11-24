/**
 * Logs the "event budget exhausted" warning at most once per event per hour.
 *
 * Without this, every refused request during an attack writes a log line. The
 * guard is a Redis set-if-absent key that expires after an hour (shared across
 * instances). With no Redis, or if it errors, a module-level map keeps the same
 * promise per instance. The warning carries the slug only, never an email,
 * HMAC or IP.
 */
import { getRedisClient } from "@/lib/rate-limit"

/** One warning per event per window. */
export const WARN_WINDOW_SECONDS = 3600

const lastWarnedAt = new Map<string, number>()

/** True when this instance has not warned for the slug within the window. */
function claimInMemory(slug: string): boolean {
  const now = Date.now()
  const last = lastWarnedAt.get(slug)
  if (last !== undefined && now - last < WARN_WINDOW_SECONDS * 1000) return false
  lastWarnedAt.set(slug, now)
  return true
}

/** True when this caller won the Redis key, false when it already existed; null when Redis cannot answer. */
async function claimInRedis(slug: string): Promise<boolean | null> {
  const redis = getRedisClient()
  if (!redis) return null
  try {
    const result = await redis.set(`cck:attending:warned:${slug}`, "1", { nx: true, ex: WARN_WINDOW_SECONDS })
    return result === "OK"
  } catch (error) {
    console.error("attending warn-once Redis error:", error instanceof Error ? error.name : "unknown")
    return null
  }
}

/** Emits the structured warning for the slug unless one went out within the last hour. */
export async function warnBudgetExhaustedOnce(slug: string): Promise<void> {
  const claimed = (await claimInRedis(slug)) ?? claimInMemory(slug)
  if (claimed) console.warn(JSON.stringify({ event: "attending-budget-exhausted", slug }))
}
