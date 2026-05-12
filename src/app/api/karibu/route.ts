/**
 * @module /api/karibu
 * @purpose Streaming Karibu onboarding chat endpoint with record_visitor tool.
 *
 * Streams Claude Haiku 4.5 responses. When Claude calls `record_visitor`, the
 * visitor's onboarding session is upserted in Prisma and the cck-audience cookie
 * is set. Gated by KARIBU_ENABLED feature flag. Rate-limited to 5 req/hr/IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { streamText, tool, convertToModelMessages } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { recordVisitorSchema, RECORD_VISITOR_TOOL_DESCRIPTION } from "@/lib/karibu/tool-schema";
import { buildKaribuPrompt } from "@/lib/karibu/system-prompt";
import { ensureVisitorId, setAudienceCookie } from "@/lib/karibu/cookies";
import { isKaribuEnabled } from "@/lib/karibu/feature-flag";
import { checkBudget, recordSpend } from "@/lib/karibu/budget";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const anthropic = createAnthropic();

const KARIBU_RATE_LIMIT = { maxRequests: 5, windowInSeconds: 3600 };

const MAX_MESSAGES = 8;
const MAX_MESSAGE_CHARS = 300;

// Schema validates security constraints only — passthrough preserves the
// full UIMessage shape (parts, id, etc.) that ai-sdk v6 sends from the client.
const MessageSchema = z
  .object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().max(MAX_MESSAGE_CHARS).optional(),
    parts: z.array(z.any()).optional(),
  })
  .passthrough();

const RequestSchema = z.object({
  messages: z.array(MessageSchema).max(MAX_MESSAGES, "Conversation too long."),
});

/** Allowed origins — mirrors the pattern from /api/chat */
const ALLOWED_ORIGINS = new Set([
  "https://www.claudekenya.org",
  "https://claudekenya.org",
  ...(process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://127.0.0.1:3000"]
    : []),
]);

function isOriginAllowed(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // Block requests with no origin/referer header (non-browser calls in prod handled by rate limit)
  if (!origin && !referer) return false;

  if (origin && ALLOWED_ORIGINS.has(origin)) return true;
  if (referer) {
    try {
      return ALLOWED_ORIGINS.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }
  return false;
}

function jsonError(message: string, status: number, headers?: Record<string, string>) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

/**
 * POST /api/karibu — streaming Karibu onboarding chat.
 *
 * Validates origin, rate limits by IP, validates body shape + per-message
 * size cap, then streams Claude Haiku 4.5. The record_visitor tool upserts
 * the onboarding session row and sets the cck-audience cookie when called.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isKaribuEnabled()) {
      return jsonError("karibu_disabled", 503);
    }

    if (!isOriginAllowed(req)) {
      return jsonError("Forbidden — cross-origin requests are not allowed.", 403);
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const rateLimitResult = await rateLimit(req, KARIBU_RATE_LIMIT);
    if (!rateLimitResult.success) {
      console.log(JSON.stringify({ kind: "karibu", event: "rate_limited", ip, ts: Date.now() }));
      return jsonError(
        "Too many requests. Please try again later.",
        429,
        rateLimitResult.headers,
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonError("Invalid JSON body.", 400);
    }

    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid request.";
      return jsonError(firstError, 400);
    }

    // Per-message size cap — checks both UIMessage parts and legacy content
    for (const m of parsed.data.messages) {
      const partsText = Array.isArray(m.parts)
        ? m.parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("")
        : "";
      const text = (typeof m.content === "string" ? m.content : "") + partsText;
      if (text.length > MAX_MESSAGE_CHARS) {
        return jsonError("Message too long.", 400);
      }
    }

    // Daily spend cap (per-day, Upstash). Fail-open if Redis unavailable.
    const budget = await checkBudget();
    if (!budget.allowed) {
      console.log(JSON.stringify({ kind: "karibu", event: "budget_exceeded", spend: budget.spend, ts: Date.now() }));
      return jsonError("budget_exceeded", 503);
    }
    if (budget.warn) {
      console.log(JSON.stringify({ kind: "karibu", event: "budget_warn", spend: budget.spend, ts: Date.now() }));
    }

    const visitorId = await ensureVisitorId();
    const systemPrompt = await buildKaribuPrompt();
    const userAgent = req.headers.get("user-agent") ?? null;

    const result = streamText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: systemPrompt,
      messages: await convertToModelMessages(body.messages),
      maxOutputTokens: 1500,
      tools: {
        record_visitor: tool({
          description: RECORD_VISITOR_TOOL_DESCRIPTION,
          inputSchema: recordVisitorSchema,
          async execute(args) {
            const session = await prisma.onboardingSession.upsert({
              where: { cookieId: visitorId },
              update: {
                audience: args.audience,
                intent: args.intent ?? null,
                experience: args.experience ?? null,
                name: args.name ?? null,
                city: args.city ?? null,
                language: args.language ?? null,
                completedAt: new Date(),
                skipped: false,
              },
              create: {
                cookieId: visitorId,
                audience: args.audience,
                intent: args.intent ?? null,
                experience: args.experience ?? null,
                name: args.name ?? null,
                city: args.city ?? null,
                language: args.language ?? null,
                completedAt: new Date(),
                skipped: false,
              },
            });
            await setAudienceCookie(args.audience);

            // Fire-and-forget audit row; never block the user response.
            prisma.auditLog
              .create({
                data: {
                  userId: "system",
                  action: "KARIBU_COMPLETED",
                  entity: "OnboardingSession",
                  entityId: session.id,
                  changes: {
                    audience: args.audience,
                    intent: args.intent ?? null,
                    experience: args.experience ?? null,
                    visitorId,
                  },
                  ipAddress: ip,
                  userAgent,
                },
              })
              .catch((e) => console.error("[audit] karibu_completed failed", e));

            console.log(JSON.stringify({
              kind: "karibu",
              event: "completed",
              visitorId,
              audience: args.audience,
              intent: args.intent ?? null,
              experience: args.experience ?? null,
              ts: Date.now(),
            }));
            return { ok: true };
          },
        }),
      },
      onFinish: async ({ totalUsage }) => {
        if (totalUsage) {
          await recordSpend(totalUsage.inputTokens ?? 0, totalUsage.outputTokens ?? 0);
        }
      },
    });

    return result.toUIMessageStreamResponse({ headers: rateLimitResult.headers });
  } catch (error) {
    console.error(JSON.stringify({ kind: "karibu", event: "error", message: String(error), ts: Date.now() }));
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
