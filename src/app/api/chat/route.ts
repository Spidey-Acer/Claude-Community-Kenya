import { NextRequest } from "next/server";
import { streamText, convertToModelMessages } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { buildSystemPrompt, type ChatPersona } from "@/lib/chat/system-prompt";

export const maxDuration = 30;

const anthropic = createAnthropic();

const CHAT_RATE_LIMIT = { maxRequests: 30, windowInSeconds: 3600 };
const MAX_MESSAGE_CHARS = 4000;

/**
 * Validates security constraints only. ai-sdk v6 UIMessages carry text in
 * `parts`, not `content`; both shapes are accepted via passthrough so the
 * SDK can convert from the original body downstream.
 */
const ChatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().max(MAX_MESSAGE_CHARS).optional(),
    parts: z.array(z.any()).optional(),
  })
  .passthrough();

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).max(20, "Conversation too long — please reset."),
  persona: z.enum(["dev", "pro"]).default("dev"),
});

/** Allowed origins for the chat endpoint (CSRF protection) */
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

  // Allow same-origin requests with no Origin header (e.g. server-side)
  if (!origin && !referer) return false;

  if (origin && ALLOWED_ORIGINS.has(origin)) return true;
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      return ALLOWED_ORIGINS.has(refOrigin);
    } catch {
      return false;
    }
  }
  return false;
}

function jsonError(message: string, status: number, headers?: Record<string, string>) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { "Content-Type": "application/json", ...headers } }
  );
}

export async function POST(req: NextRequest) {
  // CSRF: reject cross-origin requests
  if (!isOriginAllowed(req)) {
    return jsonError("Forbidden — cross-origin requests are not allowed.", 403);
  }

  const rateLimitResult = await rateLimit(req, CHAT_RATE_LIMIT);
  if (!rateLimitResult.success) {
    return jsonError(
      "You've sent too many messages. Please try again in a bit.",
      429,
      rateLimitResult.headers,
    );
  }

  // Validate request body
  const body = await req.json().catch(() => null);
  if (!body) {
    return jsonError("Invalid JSON body.", 400);
  }

  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid request.";
    return jsonError(firstError, 400);
  }

  // Per-message size cap on UIMessage parts text + legacy content
  for (const m of parsed.data.messages) {
    const partsText = Array.isArray(m.parts)
      ? m.parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("")
      : "";
    const text = (typeof m.content === "string" ? m.content : "") + partsText;
    if (text.length > MAX_MESSAGE_CHARS) {
      return jsonError("Message too long.", 400);
    }
  }

  const { persona } = parsed.data;

  // Pass original body.messages to the SDK (preserves full UIMessage shape);
  // Zod already validated array length, roles, and content size above.
  const systemPrompt = await buildSystemPrompt(persona as ChatPersona);

  const result = streamText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: systemPrompt,
    messages: await convertToModelMessages(body.messages),
  });

  return result.toUIMessageStreamResponse();
}
