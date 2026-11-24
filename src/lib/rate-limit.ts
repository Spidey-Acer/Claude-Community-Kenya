/**
 * API Rate Limiting Utilities
 * Ported from ACK Kitale Diocese System — generic, zero diocese-specific code.
 * Uses Upstash Redis in production, in-memory fallback for development.
 */

import { NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

// The Vercel Marketplace "Upstash for Redis" integration injects KV_REST_API_*
// names; a hand-configured Upstash database uses UPSTASH_REDIS_REST_*. Accept
// either so provisioning through Vercel needs no manual alias vars.
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
const NODE_ENV = process.env.NODE_ENV || "development"
const IS_BUILD_PHASE = process.env.NEXT_PHASE === "phase-production-build"

let redis: Redis | null = null

if (UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: UPSTASH_REDIS_REST_URL,
    token: UPSTASH_REDIS_REST_TOKEN,
  })
} else if (NODE_ENV === "production" && !IS_BUILD_PHASE) {
  console.warn(
    "WARNING: neither UPSTASH_REDIS_REST_URL/TOKEN nor KV_REST_API_URL/TOKEN are set. " +
      "Rate limiting will use in-memory fallback which does not work in distributed environments."
  )
}

// In-memory store — development ONLY, resets on server restart
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export interface RateLimitConfig {
  maxRequests: number
  windowInSeconds: number
  identifier?: (request: NextRequest) => string
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

function getIdentifier(
  request: NextRequest,
  customIdentifier?: (req: NextRequest) => string
): string {
  if (customIdentifier) return customIdentifier(request)
  // x-vercel-forwarded-for is set by Vercel's edge and cannot be spoofed by clients.
  // Fall back to x-forwarded-for (also platform-set on Vercel) then x-real-ip.
  const vercelIp = request.headers.get("x-vercel-forwarded-for")
  if (vercelIp) return vercelIp.split(",")[0]
  const forwarded = request.headers.get("x-forwarded-for")
  const realIp = request.headers.get("x-real-ip")
  return forwarded?.split(",")[0] || realIp || "unknown"
}

function inMemoryRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowInSeconds * 1000
  // Scope the bucket to the preset: two routes with different limits on the
  // same IP must not share one counter, or the loosest route's traffic
  // exhausts the strictest route's allowance (venue-IP judge sign-in, 2 Sep).
  const bucket = `${identifier}:${config.maxRequests}-${config.windowInSeconds}`
  const existing = requestCounts.get(bucket)

  if (!existing || now > existing.resetTime) {
    const resetTime = now + windowMs
    requestCounts.set(bucket, { count: 1, resetTime })
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: Math.floor(resetTime / 1000),
    }
  }

  if (existing.count >= config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: Math.floor(existing.resetTime / 1000),
    }
  }

  existing.count++
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - existing.count,
    reset: Math.floor(existing.resetTime / 1000),
  }
}

async function redisRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (!redis) throw new Error("Redis not configured")

  try {
    const customRateLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        config.maxRequests,
        `${config.windowInSeconds}s`
      ),
      analytics: true,
      // Per-preset prefix: Upstash keys by prefix + identifier + window, so
      // presets sharing a window length would otherwise share one counter.
      prefix: `cck:rl:${config.maxRequests}-${config.windowInSeconds}`,
    })

    const { success, remaining, limit, reset } =
      await customRateLimit.limit(identifier)

    const now = Math.floor(Date.now() / 1000)
    const resetTime =
      reset && typeof (reset as unknown as { getTime?: () => number }).getTime === "function"
        ? Math.floor(
            (reset as unknown as { getTime: () => number }).getTime() / 1000
          )
        : now + config.windowInSeconds

    return {
      success,
      limit: limit || config.maxRequests,
      remaining: Math.max(0, remaining ?? 0),
      reset: resetTime,
    }
  } catch (error) {
    console.error("Redis rate limit error:", error)
    if (NODE_ENV === "production") {
      throw new Error("Rate limiting failed — Redis unavailable.")
    }
    console.warn("DEV: Falling back to in-memory rate limiting.")
    return inMemoryRateLimit(identifier, config)
  }
}

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult & { headers: Record<string, string> }> {
  const identifier = getIdentifier(request, config.identifier)
  const result = redis
    ? await redisRateLimit(identifier, config)
    : inMemoryRateLimit(identifier, config)

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  }

  if (!result.success) {
    headers["Retry-After"] = String(
      result.reset - Math.floor(Date.now() / 1000)
    )
  }

  return { ...result, headers }
}

export function withRateLimit(
  handler: (request: NextRequest, context?: unknown) => Promise<NextResponse>,
  config: RateLimitConfig
) {
  return async (request: NextRequest, context?: unknown) => {
    const result = await rateLimit(request, config)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please try again later.",
          retryAfter: result.reset - Math.floor(Date.now() / 1000),
        },
        { status: 429, headers: result.headers }
      )
    }

    const response = await handler(request, context)
    Object.entries(result.headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }
}

export const RateLimits = {
  CONTACT: { maxRequests: 5, windowInSeconds: 3600 },
  // Per-IP, and venue WiFi / Kenyan carrier CGNAT put a whole room behind one
  // IP: 5/15min locked a workshop out of sign-in (incident 2026-09-02). 60/15min
  // still caps a brute-force at 4/min per IP; bcrypt does the rest.
  LOGIN: { maxRequests: 60, windowInSeconds: 900 },
  // Per-IP, room-sized for the same CGNAT reason as LOGIN: 3/hr per IP let
  // three people in a 140-person room reset a password (incident 2026-09-02).
  // Abuse is bounded per target email by PASSWORD_RESET_EMAIL instead.
  PASSWORD_RESET: { maxRequests: 60, windowInSeconds: 3600 },
  PASSWORD_RESET_EMAIL: { maxRequests: 3, windowInSeconds: 3600 },
  API_GENERAL: { maxRequests: 100, windowInSeconds: 3600 },
  ADMIN: { maxRequests: 30, windowInSeconds: 60 },
  STRICT: { maxRequests: 3, windowInSeconds: 3600 },
  AUTH: { maxRequests: 5, windowInSeconds: 60 },
  // Signup + email verification: room-sized per-IP cap for the same CGNAT
  // reason as LOGIN. Email verification is the abuse gate on the user table.
  SIGNUP: { maxRequests: 100, windowInSeconds: 3600 },
  FORM: { maxRequests: 10, windowInSeconds: 60 },
  // Signed-in member actions during a live event (team search, roster, profile,
  // submission): per-IP, and the room shares one IP, so size it for the room.
  // ~4/min per person at 140 people; the session is the real identity gate.
  MEMBER_ACTION: { maxRequests: 600, windowInSeconds: 60 },
  READ: { maxRequests: 100, windowInSeconds: 60 },
  // CCK-specific
  SPEAKER_APPLY: { maxRequests: 3, windowInSeconds: 86400 },  // 3/day
  DEMO_REQUEST: { maxRequests: 3, windowInSeconds: 86400 },   // 3/day
  IDEA_SUBMIT: { maxRequests: 3, windowInSeconds: 86400 },    // 3/day
  JOIN: { maxRequests: 5, windowInSeconds: 86400 },           // 5/day
  VOLUNTEER_APPLY: { maxRequests: 3, windowInSeconds: 86400 }, // 3/day
  PROJECT_SUBMIT: { maxRequests: 3, windowInSeconds: 86400 },    // 3/day
  COMMUNITY_SUBMIT: { maxRequests: 3, windowInSeconds: 86400 },  // 3/day
  COMMUNITY_COMMENT: { maxRequests: 5, windowInSeconds: 3600 },  // 5/hr
  COMMUNITY_UPVOTE: { maxRequests: 20, windowInSeconds: 3600 },  // 20/hr
  // Conversations Live — public event participation (no account required).
  // 100/day, not 5: the venue WiFi and Kenyan carrier CGNAT put whole rooms
  // behind one IP; moderation-before-display is the abuse gate, this only
  // stops floods (sec-review finding 1, 2026-08-28).
  QUESTION_SUBMIT: { maxRequests: 100, windowInSeconds: 86400 },
  CONTRIBUTION_SUBMIT: { maxRequests: 100, windowInSeconds: 86400 },
} as const

export function getRedisClient(): Redis | null {
  return redis
}
