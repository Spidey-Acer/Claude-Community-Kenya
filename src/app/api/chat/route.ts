import { NextRequest } from "next/server";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { rateLimit } from "@/lib/rate-limit";
import { buildSystemPrompt, type ChatPersona } from "@/lib/chat/system-prompt";

export const maxDuration = 30;

const anthropic = createAnthropic();

const CHAT_RATE_LIMIT = { maxRequests: 30, windowInSeconds: 3600 };

export async function POST(req: NextRequest) {
  const rateLimitResult = await rateLimit(req, CHAT_RATE_LIMIT);
  if (!rateLimitResult.success) {
    return new Response(
      JSON.stringify({
        error: "You've sent too many messages. Please try again in a bit.",
        retryAfter: rateLimitResult.reset - Math.floor(Date.now() / 1000),
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json", ...rateLimitResult.headers },
      }
    );
  }

  const body = await req.json();
  const messages: UIMessage[] = body.messages ?? [];
  const persona: ChatPersona = body.persona === "pro" ? "pro" : "dev";

  if (messages.length > 20) {
    return new Response(
      JSON.stringify({
        error:
          "Conversation is getting long! Please reset the chat to continue.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const systemPrompt = buildSystemPrompt(persona);

  const result = streamText({
    model: anthropic("claude-haiku-4-5"),
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
