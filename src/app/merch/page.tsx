import type { Metadata } from "next";
import Link from "next/link";
import { ScrollReveal, TerminalWindow } from "@/components/terminal";
import { MerchWaitlistForm } from "./MerchWaitlistForm";

export const metadata: Metadata = {
  title: "Merch | Claude Community Kenya",
  description:
    "CCK merch is on the way. T-shirts, stickers, and laptop accessories — built for builders. Join the waitlist and we'll let you know when the first drop ships.",
  alternates: { canonical: "https://www.claudekenya.org/merch" },
  openGraph: {
    title: "Merch | Claude Community Kenya",
    description: "T-shirts, stickers, and accessories for the CCK community. Join the waitlist.",
    url: "https://www.claudekenya.org/merch",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

export default function MerchPage() {
  return (
    <main className="min-h-screen bg-bg-primary pt-24 pb-20">
      <section className="mx-auto max-w-3xl px-4">
        <ScrollReveal>
          <p className="font-mono text-xs uppercase tracking-wider text-amber mb-3">
            // coming soon
          </p>
          <h1 className="mb-4 font-mono text-3xl font-bold text-text-primary sm:text-4xl">
            CCK Merch
          </h1>
          <p className="mb-10 max-w-2xl text-base text-text-secondary leading-relaxed">
            Built for builders. T-shirts, stickers, hoodies, and laptop accessories
            with the CCK aesthetic. The first drop ships alongside the next hackathon
            — drop your email and we&apos;ll let you know the moment it lands.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <TerminalWindow title="merch-waitlist.sh" variant="command">
            <MerchWaitlistForm />
          </TerminalWindow>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <div className="mt-10 text-center">
            <Link
              href="/events"
              className="font-mono text-sm text-text-dim hover:text-green-primary transition-colors"
            >
              &larr; In the meantime, check out upcoming events
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}
