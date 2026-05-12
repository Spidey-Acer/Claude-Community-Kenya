import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ensureVisitorId, setAudienceCookie } from "@/lib/karibu/cookies";
import { AUDIENCES, EXPERIENCES } from "@/lib/karibu/types";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
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
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  function logAudit(action: string, sessionId: string | null, changes: Prisma.InputJsonValue) {
    prisma.auditLog
      .create({
        data: { userId: "system", action, entity: "OnboardingSession", entityId: sessionId, changes, ipAddress: ip, userAgent },
      })
      .catch((e) => console.error(`[audit] ${action} failed`, e));
  }

  // L3 scripted fallback path — wizard completed when live API was unavailable
  const parsedScripted = scriptedSchema.safeParse(body);
  if (parsedScripted.success) {
    const { audience, experience } = parsedScripted.data.scripted;
    const session = await prisma.onboardingSession.upsert({
      where: { cookieId: visitorId },
      update: { audience, experience, skipped: false, completedAt: new Date() },
      create: { cookieId: visitorId, audience, experience, skipped: false, completedAt: new Date() },
    });
    await setAudienceCookie(audience);
    logAudit("KARIBU_COMPLETED", session.id, { mode: "scripted", audience, experience, visitorId });
    return NextResponse.json({ ok: true, mode: "scripted" });
  }

  // Standard skip path — visitor declined onboarding.
  // If a completed session already exists (audience set, not previously skipped),
  // treat the skip as a "just dismiss the modal" — don't wipe data. This handles
  // the case where Karibu re-mounts on a downstream page (e.g. /join) due to a
  // missed audience-cookie write and the user dismisses it expecting their
  // earlier choices to stick.
  const existing = await prisma.onboardingSession.findUnique({
    where: { cookieId: visitorId },
    select: { id: true, audience: true, completedAt: true, skipped: true },
  });

  if (existing?.audience && existing.completedAt && !existing.skipped) {
    await setAudienceCookie(existing.audience);
    logAudit("KARIBU_SKIP_NOOP", existing.id, { mode: "preserved", visitorId });
    return NextResponse.json({ ok: true, mode: "preserved" });
  }

  const session = await prisma.onboardingSession.upsert({
    where: { cookieId: visitorId },
    update: { skipped: true, audience: null, completedAt: new Date() },
    create: { cookieId: visitorId, skipped: true, completedAt: new Date() },
  });
  await setAudienceCookie("skipped");
  logAudit("KARIBU_SKIPPED", session.id, { mode: "skipped", visitorId });
  return NextResponse.json({ ok: true });
}
