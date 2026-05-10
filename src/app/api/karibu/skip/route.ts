import { NextResponse, type NextRequest } from "next/server";
import { ensureVisitorId, setAudienceCookie } from "@/lib/karibu/cookies";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/karibu/skip — record that the visitor declined onboarding.
 *
 * Sets cck-audience=skipped cookie. The next page render will not mount
 * the Karibu modal and will show the generic (non-personalized) homepage.
 *
 * Includes a honeypot ("honey" field) — bots that fill hidden fields
 * receive a fake-success response with no DB write.
 */
export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, { maxRequests: 10, windowInSeconds: 600 });
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: limit.headers });
  }

  let body: { honey?: string } = {};
  try {
    body = (await req.json()) as { honey?: string };
  } catch {
    /* empty body is fine */
  }
  if (body.honey) {
    return NextResponse.json({ ok: true });
  }

  const visitorId = await ensureVisitorId();
  await prisma.onboardingSession.upsert({
    where: { cookieId: visitorId },
    update: { skipped: true, audience: null, completedAt: new Date() },
    create: { cookieId: visitorId, skipped: true, completedAt: new Date() },
  });
  await setAudienceCookie("skipped");
  return NextResponse.json({ ok: true });
}
