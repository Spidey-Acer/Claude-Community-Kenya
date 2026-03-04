import type { Metadata } from "next";
import { ScrollReveal } from "@/components/terminal";
import { TerminalApplication } from "@/components/terminal/TerminalApplication";
import { TerminalWindow } from "@/components/terminal/TerminalWindow";
import { CountUp } from "@/components/ui/CountUp";
import { Card } from "@/components/ui/Card";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { SITE_CONFIG, SOCIAL_LINKS, CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: `Join | ${SITE_CONFIG.name}`,
  description:
    "Join East Africa's first Claude developer community. Attend meetups in Nairobi and Mombasa, learn Claude Code, and build with AI.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/join`,
  },
  openGraph: {
    title: `Join | ${SITE_CONFIG.name}`,
    description:
      "Join East Africa's first Claude developer community. Attend meetups in Nairobi and Mombasa, learn Claude Code, and build with AI.",
    url: `${SITE_CONFIG.url}/join`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Join" }]} />
      <div className="mx-auto max-w-6xl">
        {/* ── Section 1: Community Pulse Header ── */}
        <ScrollReveal>
          <section className="mb-12">
            <TerminalWindow title="community-pulse" variant="command">
              <div className="text-center">
                <h1 className="mb-6 font-mono text-xs uppercase tracking-widest text-green-primary">
                  Community Pulse
                </h1>
                <div className="mb-4 flex flex-wrap items-center justify-center gap-4 font-mono text-lg text-text-primary sm:gap-6 sm:text-xl">
                  <span>
                    <CountUp target={30} suffix="+" className="font-bold text-green-primary" />{" "}
                    developers
                  </span>
                  <span className="text-text-dim" aria-hidden="true">
                    •
                  </span>
                  <span>
                    <CountUp target={2} className="font-bold text-amber" />{" "}
                    meetups held
                  </span>
                  <span className="text-text-dim" aria-hidden="true">
                    •
                  </span>
                  <span>
                    <CountUp target={2} className="font-bold text-cyan" />{" "}
                    cities
                  </span>
                  <span className="text-text-dim" aria-hidden="true">
                    •
                  </span>
                  <span>
                    <CountUp target={33} className="font-bold text-text-primary" />{" "}
                    resources
                  </span>
                </div>
                <p className="font-mono text-sm text-text-secondary">
                  EAST AFRICA&apos;S FIRST CLAUDE DEVELOPER COMMUNITY
                </p>
              </div>
            </TerminalWindow>
          </section>
        </ScrollReveal>

        {/* ── Section 2: Interactive Terminal Application ── */}
        <ScrollReveal>
          <section className="mb-16">
            <TerminalApplication />
          </section>
        </ScrollReveal>

        {/* ── Section 3: Quick Links ── */}
        <ScrollReveal>
          <section className="mb-12">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href={SOCIAL_LINKS.discord}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-green-primary px-5 py-2.5 font-mono text-sm text-green-primary transition-all duration-200 hover:bg-green-primary hover:text-bg-primary"
              >
                Discord
              </a>
              <a
                href={SOCIAL_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border-default px-5 py-2.5 font-mono text-sm text-text-secondary transition-all duration-200 hover:border-border-hover hover:text-text-primary"
              >
                LinkedIn
              </a>
              <a
                href={SOCIAL_LINKS.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border-default px-5 py-2.5 font-mono text-sm text-text-secondary transition-all duration-200 hover:border-border-hover hover:text-text-primary"
              >
                Twitter / X
              </a>
              <a
                href="/events"
                className="border border-border-default px-5 py-2.5 font-mono text-sm text-text-secondary transition-all duration-200 hover:border-border-hover hover:text-text-primary"
              >
                Events
              </a>
            </div>
          </section>
        </ScrollReveal>

        {/* ── Section 4: Contribute ── */}
        <ScrollReveal>
          <section className="mb-16">
            <h2 className="mb-8 text-center font-mono text-2xl font-bold text-cyan">
              Contribute
            </h2>

            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card title="speak.sh" padding="md">
                <h3 className="mb-2 font-mono text-lg font-bold text-text-primary">
                  Speak at a Meetup
                </h3>
                <p className="font-sans text-text-secondary">
                  Have a Claude project to share? Give a lightning talk or full
                  presentation at one of our events.
                </p>
              </Card>

              <Card title="organize.sh" padding="md">
                <h3 className="mb-2 font-mono text-lg font-bold text-text-primary">
                  Help Organize
                </h3>
                <p className="font-sans text-text-secondary">
                  We need co-organizers, especially in Mombasa. Help us bring
                  the community to your city.
                </p>
              </Card>

              <Card title="submit.sh" padding="md">
                <h3 className="mb-2 font-mono text-lg font-bold text-text-primary">
                  Submit a Project
                </h3>
                <p className="font-sans text-text-secondary">
                  Built something with Claude? Get it featured on our projects
                  page and inspire other developers.
                </p>
              </Card>

              <Card title="partner.sh" padding="md">
                <h3 className="mb-2 font-mono text-lg font-bold text-text-primary">
                  Partner with Us
                </h3>
                <p className="font-sans text-text-secondary">
                  University, company, or venue? Let&apos;s collaborate and grow
                  the AI developer community together.
                </p>
              </Card>
            </div>

            {/* Contact info */}
            <div className="border border-border-default bg-bg-secondary p-6">
              <p className="font-mono text-sm text-text-dim">
                <span className="text-green-primary" aria-hidden="true">
                  ${" "}
                </span>
                Get in touch:{" "}
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="text-green-primary underline underline-offset-4 transition-colors hover:text-green-dim"
                >
                  {CONTACT.email}
                </a>{" "}
                or find us on{" "}
                <a
                  href={SOCIAL_LINKS.discord}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-primary underline underline-offset-4 transition-colors hover:text-green-dim"
                >
                  Discord
                </a>
              </p>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </main>
  );
}
