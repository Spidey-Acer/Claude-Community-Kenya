import { NextResponse, type NextRequest } from "next/server";
import { getVisitorId, clearAudienceCookie } from "@/lib/karibu/cookies";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/karibu/reset — fully resets a visitor's onboarding.
 *
 * Deletes all OnboardingSession rows for the visitor cookie and clears
 * the cck-audience cookie. The next page render will mount the Karibu
 * modal again. Used by the footer "Personalize" link.
 */
export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, { maxRequests: 5, windowInSeconds: 3600 });
  if (!limit.success) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: limit.headers });
  }

  const visitorId = await getVisitorId();
  if (visitorId) {
    await prisma.onboardingSession.deleteMany({ where: { cookieId: visitorId } });
  }
  await clearAudienceCookie();
  return NextResponse.json({ ok: true });
}
