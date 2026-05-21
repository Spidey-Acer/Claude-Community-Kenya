import type { Metadata } from "next";
import { auth } from "@/auth";
import { getAudienceCookie } from "@/lib/karibu/cookies";
import { AUDIENCE_LABELS, isAudience } from "@/lib/karibu/types";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { ResetKaribuButton } from "./ResetKaribuButton";

export const metadata: Metadata = {
  title: "Your data | Claude Community Kenya",
  description: "Manage the data Karibu saved for your visit.",
  robots: { index: false, follow: false },
};

/** Converts a raw cookie value to a human-readable string. */
function humanizeAudience(raw: string | null): string {
  if (!raw) return "No personalization saved.";
  if (raw === "skipped") return "Skipped — no audience selected.";
  if (isAudience(raw)) return AUDIENCE_LABELS[raw];
  return "Unknown audience value.";
}

export default async function AccountDataPage() {
  const [session, audienceCookie] = await Promise.all([
    auth(),
    getAudienceCookie(),
  ]);

  const email = session?.user?.email ?? null;
  const audienceLabel = humanizeAudience(audienceCookie);
  const hasPersonalization = audienceCookie !== null;

  return (
    <main className="min-h-screen bg-bg-primary pt-24 pb-24">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Your data" },
        ]}
      />

      <div className="mx-auto max-w-2xl px-4">
        {/* Page header */}
        <header className="mb-10 border-b border-border-default/60 pb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-green-primary mb-2">
            $ cat ~/data
          </p>
          <h1 className="font-mono text-3xl font-bold text-text-primary">
            Your data
          </h1>
          <p className="mt-2 font-sans text-sm text-text-dim">
            Data saved during your visit to claudekenya.org.
          </p>
        </header>

        {/* Signed-in email */}
        {email && (
          <section className="mb-6" aria-label="Signed-in account">
            <div className="rounded-lg border border-border-default bg-bg-secondary p-6">
              <p className="font-mono text-xs uppercase tracking-widest text-text-dim mb-1">
                Signed in as
              </p>
              <p className="font-sans text-text-primary">{email}</p>
            </div>
          </section>
        )}

        {/* Karibu audience block */}
        <section aria-label="Karibu personalization">
          <div className="rounded-lg border border-border-default bg-bg-secondary p-6">
            <p className="font-mono text-xs uppercase tracking-widest text-text-dim mb-1">
              Karibu audience
            </p>
            <p className="font-sans text-text-primary mb-6">{audienceLabel}</p>

            {hasPersonalization && (
              <>
                <p className="font-mono text-xs text-text-dim mb-4">
                  Resetting clears the <code>cck-audience</code> cookie and
                  removes the linked session from the database. The Karibu
                  wizard will run again on your next visit.
                </p>
                <ResetKaribuButton />
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
