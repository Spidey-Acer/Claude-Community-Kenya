import { Prisma } from "../../src/generated/prisma";
import { prisma } from "../../src/lib/prisma";

async function main() {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.onboardingSession.updateMany({
    where: { completedAt: { lt: cutoff }, conversation: { not: Prisma.DbNull } },
    data: { conversation: Prisma.DbNull },
  });
  console.log(JSON.stringify({ kind: "karibu", event: "purge", purged: result.count, ts: Date.now() }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
