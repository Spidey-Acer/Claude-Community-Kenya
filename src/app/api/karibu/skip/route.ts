import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ensureVisitorId, setAudienceCookie } from "@/lib/karibu/cookies";
import { AUDIENCES, EXPERIENCES } from "@/lib/karibu/types";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

const scriptedSchema = z.object({
  scripted: z.object({
    audience: z.enum(AUDIENCES),
    experience: z.enum(EXPERIENCES),
  }),
});

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

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* empty body is fine */
  }
  if (body.honey) {
    return NextResponse.json({ ok: true });
  }

  const visitorId = await ensureVisitorId();

  // L3 scripted fallback path — wizard completed when live API was unavailable
  const parsedScripted = scriptedSchema.safeParse(body);
  if (parsedScripted.success) {
    const { audience, experience } = parsedScripted.data.scripted;
    await prisma.onboardingSession.upsert({
      where: { cookieId: visitorId },
      update: { audience, experience, skipped: false, completedAt: new Date() },
      create: { cookieId: visitorId, audience, experience, skipped: false, completedAt: new Date() },
    });
    await setAudienceCookie(audience);
    return NextResponse.json({ ok: true, mode: "scripted" });
  }

  // Standard skip path — visitor declined onboarding
  await prisma.onboardingSession.upsert({
    where: { cookieId: visitorId },
    update: { skipped: true, audience: null, completedAt: new Date() },
    create: { cookieId: visitorId, skipped: true, completedAt: new Date() },
  });
  await setAudienceCookie("skipped");
  return NextResponse.json({ ok: true });
}
