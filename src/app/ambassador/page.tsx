import type { Metadata } from "next";
import { ScrollReveal, CommandPrefix } from "@/components/terminal";
import { TerminalWindow } from "@/components/terminal";
import { Card } from "@/components/ui/Card";
import { SOCIAL_LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Ambassador Program | Claude Community Kenya",
  description:
    "Learn about the Claude Community Ambassadors program — Anthropic's initiative to empower community leaders building developer communities around Claude AI.",
  openGraph: {
    title: "Ambassador Program | Claude Community Kenya",
    description:
      "Learn about the Claude Community Ambassadors program — Anthropic's initiative to empower community leaders building developer communities around Claude AI.",
    url: "https://www.claudekenya.org/ambassador",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

const benefits = [
  "Event sponsorship and support",
  "API credits for community projects",
  "Direct access to Anthropic team via Ambassador Slack",
  "Monthly calls with other global ambassadors",
  "Early access to new features and products",
  "Official recognition and branding",
];

const responsibilities = [
  "Organize meetups, workshops, and hackathons",
  "Lead and grow local developer communities",
  "Advocate for Claude and Anthropic's mission",
  "Provide feedback on products and developer experience",
  "Create educational content and resources",
];

export default function AmbassadorPage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      {/* Header */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <h1 className="mb-2 font-mono text-2xl font-bold text-green-primary md:text-3xl">
              <CommandPrefix />
              cat ambassador-program.md
            </h1>
            <p className="mt-4 font-mono text-lg text-green-dim">
              Claude Community Ambassadors — Founding Cohort
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* What is the Ambassador Program */}
      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <TerminalWindow
              title="ambassador-program.md"
              variant="command"
            >
              <h2 className="mb-4 font-mono text-lg text-green-primary">
                ## What is the Ambassador Program?
              </h2>
              <p className="font-sans leading-relaxed text-text-secondary">
                The Claude Community Ambassadors program is Anthropic&apos;s official
                initiative to empower community leaders worldwide who are building
                vibrant developer communities around Claude AI.
              </p>
            </TerminalWindow>
          </ScrollReveal>
        </div>
      </section>

      {/* What We Receive + What We Do - side by side on desktop */}
      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-2">
            <ScrollReveal delay={0}>
              <Card title="what-we-receive.txt" padding="lg" className="h-full">
                <h2 className="mb-6 font-mono text-lg text-green-primary">
                  ## What We Receive
                </h2>
                <ul className="space-y-3">
                  {benefits.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 text-green-primary" aria-hidden="true">
                        +
                      </span>
                      <span className="font-sans text-text-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <Card title="what-we-do.txt" padding="lg" className="h-full">
                <h2 className="mb-6 font-mono text-lg text-green-primary">
                  ## What We Do
                </h2>
                <ul className="space-y-3">
                  {responsibilities.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 text-amber" aria-hidden="true">
                        &gt;
                      </span>
                      <span className="font-sans text-text-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Our Pride */}
      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <TerminalWindow
              title="pride.md"
              variant="default"
              glowing
            >
              <h2 className="mb-4 font-mono text-lg text-amber">
                ## Our Pride
              </h2>
              <p className="text-lg font-sans leading-relaxed text-text-primary">
                We&apos;re proud to be the first Claude Community Ambassadors in East
                Africa. This represents not just recognition, but a commitment to
                building the AI developer ecosystem in Kenya and beyond.
              </p>
            </TerminalWindow>
          </ScrollReveal>
        </div>
      </section>

      {/* Get Involved */}
      <section className="border-t border-border-default bg-bg-secondary py-16">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="mb-6 font-mono text-xl text-green-primary">
                <CommandPrefix />
                echo &quot;Get Involved&quot;
              </h2>
              <div className="mx-auto max-w-lg space-y-4 text-left">
                <p className="flex items-start gap-3">
                  <span className="shrink-0 font-mono text-green-dim" aria-hidden="true">$</span>
                  <span className="font-sans text-text-secondary">
                    Learn more about the global program:{" "}
                    <a
                      href="mailto:community@anthropic.com"
                      className="text-cyan underline underline-offset-2 transition-colors hover:text-green-primary"
                    >
                      community@anthropic.com
                    </a>
                  </span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="shrink-0 font-mono text-green-dim" aria-hidden="true">$</span>
                  <span className="font-sans text-text-secondary">
                    Join our local community:{" "}
                    <a
                      href={SOCIAL_LINKS.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan underline underline-offset-2 transition-colors hover:text-green-primary"
                    >
                      Discord
                    </a>
                  </span>
                </p>
                <p className="flex items-start gap-3">
                  <span className="shrink-0 font-mono text-green-dim" aria-hidden="true">$</span>
                  <span className="font-sans text-text-secondary">
                    Applications for the Ambassador program are managed by Anthropic.
                  </span>
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
