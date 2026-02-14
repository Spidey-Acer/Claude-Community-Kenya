import type { Metadata } from "next";
import { TerminalWindow, CommandPrefix } from "@/components/terminal";
import { Card } from "@/components/ui/Card";
import { SOCIAL_LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Ambassador Program | Claude Community Kenya",
  description:
    "Learn about the Claude Community Ambassadors program — Anthropic's initiative to empower community leaders building developer communities around Claude AI.",
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
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="font-mono text-2xl md:text-3xl text-text-primary mb-2">
            <CommandPrefix />
            cat ambassador-program.md
          </h1>
          <p className="font-mono text-lg text-green-dim mt-4">
            Claude Community Ambassadors — Founding Cohort
          </p>
        </div>
      </section>

      {/* What is the Ambassador Program */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <TerminalWindow
            title="ambassador-program.md"
            variant="command"
          >
            <h2 className="font-mono text-lg text-green-primary mb-4">
              ## What is the Ambassador Program?
            </h2>
            <p className="font-sans text-text-secondary leading-relaxed">
              The Claude Community Ambassadors program is Anthropic&apos;s official
              initiative to empower community leaders worldwide who are building
              vibrant developer communities around Claude AI.
            </p>
          </TerminalWindow>
        </div>
      </section>

      {/* What We Receive */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <Card title="what-we-receive.txt" padding="lg">
            <h2 className="font-mono text-lg text-green-primary mb-6">
              ## What We Receive
            </h2>
            <ul className="space-y-3">
              {benefits.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-green-primary mt-0.5 shrink-0" aria-hidden="true">
                    &gt;
                  </span>
                  <span className="font-sans text-text-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* What We Do */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <Card title="what-we-do.txt" padding="lg">
            <h2 className="font-mono text-lg text-green-primary mb-6">
              ## What We Do
            </h2>
            <ul className="space-y-3">
              {responsibilities.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="text-green-primary mt-0.5 shrink-0" aria-hidden="true">
                    &gt;
                  </span>
                  <span className="font-sans text-text-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      {/* Our Pride */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <TerminalWindow
            title="pride.md"
            variant="default"
            glowing
          >
            <h2 className="font-mono text-lg text-amber mb-4">
              ## Our Pride
            </h2>
            <p className="font-sans text-text-primary leading-relaxed text-lg">
              We&apos;re proud to be the first Claude Community Ambassadors in East
              Africa. This represents not just recognition, but a commitment to
              building the AI developer ecosystem in Kenya and beyond.
            </p>
          </TerminalWindow>
        </div>
      </section>

      {/* Get Involved */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <Card title="get-involved.txt" padding="lg">
            <h2 className="font-mono text-lg text-green-primary mb-6">
              ## Get Involved
            </h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <span className="text-green-dim shrink-0 font-mono" aria-hidden="true">$</span>
                <span className="font-sans text-text-secondary">
                  Learn more about the global program:{" "}
                  <a
                    href="mailto:community@anthropic.com"
                    className="text-cyan hover:text-green-primary transition-colors underline underline-offset-2"
                  >
                    community@anthropic.com
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-dim shrink-0 font-mono" aria-hidden="true">$</span>
                <span className="font-sans text-text-secondary">
                  Join our local community:{" "}
                  <a
                    href={SOCIAL_LINKS.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan hover:text-green-primary transition-colors underline underline-offset-2"
                  >
                    Discord
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-dim shrink-0 font-mono" aria-hidden="true">$</span>
                <span className="font-sans text-text-secondary">
                  Applications for the Ambassador program are managed by Anthropic.
                </span>
              </li>
            </ul>
          </Card>
        </div>
      </section>
    </main>
  );
}
