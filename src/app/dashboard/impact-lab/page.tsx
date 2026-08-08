import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { REQUIRE_EMAIL_VERIFICATION } from "@/lib/email-verification";
import { CURRENT_COHORT, isCohortActive } from "@/lib/impact-lab/constants";
import { VerifyEmailBanner } from "../VerifyEmailBanner";
import { ImpactLabClient } from "./ImpactLabClient";

export const metadata: Metadata = {
  title: "Impact Lab | Claude Community Kenya",
  description: "Your Impact Lab hackathon matching profile and team.",
  robots: { index: false, follow: false },
};

export default async function ImpactLabPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/dashboard/impact-lab");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { emailVerified: true },
  });
  if (!user) redirect("/login");

  const cohortActive = isCohortActive(CURRENT_COHORT);

  return (
    <main className="min-h-screen bg-bg-primary pt-24 pb-24">
      <div className="mx-auto max-w-3xl px-4">
        <header className="mb-8 border-b border-border-default/60 pb-6">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-1.5 font-mono text-xs text-text-dim hover:text-green-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            cd ../dashboard
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-green-primary mb-2">
            $ cat ./impact-lab
          </p>
          <h1 className="font-mono text-3xl font-bold text-text-primary sm:text-4xl">
            Impact Lab Hackathon
          </h1>
          <p className="mt-2 font-mono text-sm text-text-dim">
            {cohortActive
              ? "Complete your matching profile, then check back here for your team."
              : "The event has wrapped — this is your record of it."}
          </p>
        </header>

        {/* Gate on the same flag the API uses. When verification is off we send
            no verification mail, so blocking here on emailVerified alone locks
            out every account created before the flag flipped, with no way to
            comply — the participant is told to check an inbox nothing was sent
            to. */}
        {/* The verification gate only exists to protect a live matching
            profile. With the cohort closed there is nothing left to gate, and
            asking someone to verify an email to view a finished event's record
            is a dead end. */}
        {cohortActive && REQUIRE_EMAIL_VERIFICATION && !user.emailVerified ? (
          <>
            <VerifyEmailBanner />
            <p className="font-mono text-sm text-text-secondary">
              Verify your email to open your hackathon matching profile. This
              confirms the email you registered with on Luma is really yours.
            </p>
          </>
        ) : (
          <ImpactLabClient
            sessionEmail={session.user.email}
            cohortActive={cohortActive}
          />
        )}
      </div>
    </main>
  );
}
