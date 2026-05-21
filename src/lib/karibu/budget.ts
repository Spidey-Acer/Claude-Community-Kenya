/**
 * @module karibu/budget
 * @purpose Per-day Anthropic spend cap with Upstash Redis counter.
 *
 * Implements the spec's "Cost runaway" defense: $50/day hard cap, $40 warn
 * threshold. When exceeded, /api/karibu returns 503 budget_exceeded and the
 * client falls back to the L3 scripted wizard (handled by useChat's error
 * state in KaribuConversation).
 *
 * Spend is tracked in a single Redis key per UTC day. If Redis is unavailable
 * the cap silently no-ops (fail-open) — we'd rather slightly over-serve than
 * 500 a user, since the rate limit already caps abuse.
 */

import { getRedisClient } from "@/lib/rate-limit";

const DAILY_CAP_USD = 50;
const WARN_THRESHOLD_USD = 40;

// Anthropic Claude Haiku 4.5 pricing (USD per 1M tokens) as of 2026-05.
// Update if Anthropic changes pricing. Source: https://www.anthropic.com/pricing
const PRICE_INPUT_PER_MTOK = 1.0;
const PRICE_OUTPUT_PER_MTOK = 5.0;

function todayKey(): string {
  return `cck:karibu:budget:${new Date().toISOString().slice(0, 10)}`;
}

/**
 * Returns the current UTC day's accumulated Karibu spend in USD.
 * 0 if Redis unavailable or no spend yet today.
 */
export async function getTodaySpend(): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 0;
  try {
    const raw = await redis.get<string | number>(todayKey());
    if (raw === null || raw === undefined) return 0;
    return typeof raw === "number" ? raw : Number(raw);
  } catch {
    return 0;
  }
}

/**
 * Pre-flight check before serving a Karibu request.
 * - allowed: false if today's spend has already reached DAILY_CAP_USD
 * - spend:   current spend (USD)
 * - warn:    true if at or above WARN_THRESHOLD_USD
 */
export async function checkBudget(): Promise<{
  allowed: boolean;
  spend: number;
  warn: boolean;
}> {
  const spend = await getTodaySpend();
  return {
    allowed: spend < DAILY_CAP_USD,
    spend,
    warn: spend >= WARN_THRESHOLD_USD,
  };
}

/**
 * Records actual spend AFTER a request completes. Fails silently if Redis
 * is unavailable — we never want budget tracking to break the user-facing
 * response.
 */
export async function recordSpend(
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  const cost =
    (inputTokens * PRICE_INPUT_PER_MTOK +
      outputTokens * PRICE_OUTPUT_PER_MTOK) /
    1_000_000;
  if (cost <= 0) return;
  try {
    const key = todayKey();
    await redis.incrbyfloat(key, cost);
    await redis.expire(key, 25 * 60 * 60);
  } catch (e) {
    console.error("[karibu/budget] recordSpend failed", e);
  }
}

export const BUDGET_LIMITS = { DAILY_CAP_USD, WARN_THRESHOLD_USD };
