import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Vercel cron handler: purges OnboardingSession.conversation fields older
 * than 30 days. Authorized via CRON_SECRET in production.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (process.env.NODE_ENV === "production" && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.onboardingSession.updateMany({
    where: { completedAt: { lt: cutoff }, conversation: { not: Prisma.DbNull } },
    data: { conversation: Prisma.DbNull },
  });
  console.log(JSON.stringify({ kind: "karibu", event: "purge", purged: result.count, ts: Date.now() }));
  return NextResponse.json({ ok: true, purged: result.count });
}
