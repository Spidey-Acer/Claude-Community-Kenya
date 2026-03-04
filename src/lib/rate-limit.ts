/**
 * API Rate Limiting Utilities
 * Ported from ACK Kitale Diocese System — generic, zero diocese-specific code.
 * Uses Upstash Redis in production, in-memory fallback for development.
 */

import { NextRequest, NextResponse } from "next/server"
import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
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
    "WARNING: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are not set. " +
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
  const existing = requestCounts.get(identifier)

  if (!existing || now > existing.resetTime) {
    const resetTime = now + windowMs
    requestCounts.set(identifier, { count: 1, resetTime })
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
      prefix: "cck:rl",
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
  LOGIN: { maxRequests: 5, windowInSeconds: 900 },
  PASSWORD_RESET: { maxRequests: 3, windowInSeconds: 3600 },
  API_GENERAL: { maxRequests: 100, windowInSeconds: 3600 },
  ADMIN: { maxRequests: 30, windowInSeconds: 60 },
  STRICT: { maxRequests: 3, windowInSeconds: 3600 },
  AUTH: { maxRequests: 5, windowInSeconds: 60 },
  FORM: { maxRequests: 10, windowInSeconds: 60 },
  READ: { maxRequests: 100, windowInSeconds: 60 },
  // CCK-specific
  SPEAKER_APPLY: { maxRequests: 3, windowInSeconds: 86400 }, // 3/day
  IDEA_SUBMIT: { maxRequests: 3, windowInSeconds: 86400 },   // 3/day
  JOIN: { maxRequests: 5, windowInSeconds: 86400 },           // 5/day
} as const

export function getRedisClient(): Redis | null {
  return redis
}
