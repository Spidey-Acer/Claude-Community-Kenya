import type { Metadata } from "next";
import { ScrollReveal, CommandPrefix } from "@/components/terminal";
import { TerminalWindow } from "@/components/terminal";
import { CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Code of Conduct | Claude Community Kenya",
  description:
    "Our community code of conduct — ensuring a welcoming, inclusive, and harassment-free experience for everyone.",
  openGraph: {
    title: "Code of Conduct | Claude Community Kenya",
    description:
      "Our community code of conduct — ensuring a welcoming, inclusive, and harassment-free experience for everyone.",
    url: "https://www.claudekenya.org/code-of-conduct",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

const expectedBehaviors = [
  "Be respectful and inclusive",
  "Use welcoming and friendly language",
  "Be collaborative and constructive",
  "Gracefully accept constructive criticism",
  "Focus on what's best for the community",
  "Show empathy towards other community members",
];

const unacceptableBehaviors = [
  "Harassment, intimidation, or discrimination",
  "Trolling, insulting comments, personal or political attacks",
  "Public or private harassment",
  "Publishing others' private information without permission",
  "Unwelcome sexual attention or advances",
  "Other conduct inappropriate in a professional setting",
];

const enforcementSteps = [
  { level: "1st offense", action: "Warning" },
  { level: "Repeated", action: "Temporary ban" },
  { level: "Severe", action: "Permanent ban" },
];

export default function CodeOfConductPage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      {/* Header */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <h1 className="font-mono text-2xl font-bold text-green-primary md:text-3xl">
              <CommandPrefix />
              cat CODE_OF_CONDUCT.md
            </h1>
          </ScrollReveal>
        </div>
      </section>

      {/* Full Document */}
      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <TerminalWindow
              title="CODE_OF_CONDUCT.md"
              variant="command"
            >
              <div className="space-y-10">
                {/* Our Pledge */}
                <div>
                  <h2 className="mb-3 font-mono text-lg text-green-primary">
                    ## Our Pledge
                  </h2>
                  <p className="font-sans leading-relaxed text-text-secondary">
                    We pledge to make participation in Claude Community Kenya a
                    harassment-free experience for everyone, regardless of age, body
                    size, disability, ethnicity, gender identity, level of experience,
                    nationality, personal appearance, race, religion, or sexual
                    identity and orientation.
                  </p>
                </div>

                {/* Expected Behavior */}
                <div>
                  <h2 className="mb-4 font-mono text-lg text-green-primary">
                    ## Expected Behavior
                  </h2>
                  <ul className="space-y-2">
                    {expectedBehaviors.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0 text-green-primary" aria-hidden="true">
                          +
                        </span>
                        <span className="font-sans text-text-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Unacceptable Behavior */}
                <div>
                  <h2 className="mb-4 font-mono text-lg text-red">
                    ## Unacceptable Behavior
                  </h2>
                  <ul className="space-y-2">
                    {unacceptableBehaviors.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0 text-red" aria-hidden="true">
                          -
                        </span>
                        <span className="font-sans text-text-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Reporting */}
                <div className="border border-amber/20 bg-amber/5 p-6">
                  <h2 className="mb-4 font-mono text-lg text-amber">
                    ## Reporting
                  </h2>
                  <p className="mb-4 font-sans leading-relaxed text-text-secondary">
                    If you experience or witness unacceptable behavior, please report
                    it through any of the following channels:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <span className="shrink-0 font-mono text-green-dim" aria-hidden="true">$</span>
                      <span className="font-sans text-text-secondary">
                        Discord: DM any community organizer
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="shrink-0 font-mono text-green-dim" aria-hidden="true">$</span>
                      <span className="font-sans text-text-secondary">
                        Email:{" "}
                        <a
                          href={`mailto:${CONTACT.email}`}
                          className="text-cyan underline underline-offset-2 transition-colors hover:text-green-primary"
                        >
                          {CONTACT.email}
                        </a>
                      </span>
                    </li>
                  </ul>
                  <p className="mt-4 font-sans text-sm text-text-dim">
                    All reports will be reviewed and investigated promptly and fairly.
                  </p>
                </div>

                {/* Enforcement */}
                <div>
                  <h2 className="mb-4 font-mono text-lg text-green-primary">
                    ## Enforcement
                  </h2>
                  <div className="space-y-3">
                    {enforcementSteps.map((step, index) => (
                      <div key={step.level} className="flex items-center gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-amber/30 font-mono text-sm text-amber">
                          {index + 1}
                        </span>
                        <span className="font-sans text-text-secondary">
                          <span className="font-medium text-text-primary">
                            {step.level}:
                          </span>{" "}
                          {step.action}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 font-sans text-sm text-text-dim">
                    Organizers reserve the right to remove anyone violating this code
                    of conduct.
                  </p>
                </div>

                {/* Scope */}
                <div>
                  <h2 className="mb-3 font-mono text-lg text-green-primary">
                    ## Scope
                  </h2>
                  <p className="font-sans leading-relaxed text-text-secondary">
                    This code of conduct applies to all community spaces including
                    Discord, in-person events, social media, and GitHub repositories.
                  </p>
                </div>

                {/* Attribution */}
                <div className="border-t border-border-default pt-6">
                  <p className="font-mono text-xs text-text-dim">
                    # Adapted from the{" "}
                    <a
                      href="https://www.contributor-covenant.org/version/2/1/code_of_conduct/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan underline underline-offset-2 transition-colors hover:text-green-primary"
                    >
                      Contributor Covenant
                    </a>
                    , version 2.1
                  </p>
                </div>
              </div>
            </TerminalWindow>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
