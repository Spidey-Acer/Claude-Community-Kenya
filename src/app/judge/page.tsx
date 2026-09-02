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
    // No padding here on purpose: the signed-in screen has a sticky header
    // that has to sit flush against the top of the viewport, so each state
    // below owns its own gutters.
    <main className="min-h-screen bg-bg-primary">
      <JudgeGate initialJudge={session?.displayName ?? null} />
    </main>
  );
}
