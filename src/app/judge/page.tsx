import type { Metadata } from "next";
import { readJudgeSession } from "@/lib/impact-lab/judge-access";
import { JudgeGate } from "./JudgeGate";

/**
 * Judge entry point.
 *
 * Deliberately outside /admin and unlinked from navigation: judges have no
 * accounts tonight, so this is a code-gated door rather than a staff surface.
 * noindex because it is a one-night operational page, not site content.
 */
export const metadata: Metadata = {
  title: "Judging | Impact Lab",
  description: "Score the Impact Lab demos.",
  robots: { index: false, follow: false },
};

export default async function JudgePage() {
  const session = await readJudgeSession();

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-10 sm:px-6">
      <JudgeGate initialJudge={session?.displayName ?? null} />
    </main>
  );
}
