import type { Metadata } from "next";
import { TerminalWindow, CommandPrefix } from "@/components/terminal";
import { CONTACT, SOCIAL_LINKS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Code of Conduct | Claude Community Kenya",
  description:
    "Our community code of conduct — ensuring a welcoming, inclusive, and harassment-free experience for everyone.",
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
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="font-mono text-2xl md:text-3xl text-text-primary">
            <CommandPrefix />
            cat CODE_OF_CONDUCT.md
          </h1>
        </div>
      </section>

      {/* Full Document */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4">
          <TerminalWindow
            title="CODE_OF_CONDUCT.md"
            variant="command"
          >
            <div className="space-y-10">
              {/* Our Pledge */}
              <div>
                <h2 className="font-mono text-lg text-green-primary mb-3">
                  ## Our Pledge
                </h2>
                <p className="font-sans text-text-secondary leading-relaxed">
                  We pledge to make participation in Claude Community Kenya a
                  harassment-free experience for everyone, regardless of age, body
                  size, disability, ethnicity, gender identity, level of experience,
                  nationality, personal appearance, race, religion, or sexual
                  identity and orientation.
                </p>
              </div>

              {/* Expected Behavior */}
              <div>
                <h2 className="font-mono text-lg text-green-primary mb-4">
                  ## Expected Behavior
                </h2>
                <ul className="space-y-2">
                  {expectedBehaviors.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="text-green-primary mt-0.5 shrink-0" aria-hidden="true">
                        +
                      </span>
                      <span className="font-sans text-text-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Unacceptable Behavior */}
              <div>
                <h2 className="font-mono text-lg text-red mb-4">
                  ## Unacceptable Behavior
                </h2>
                <ul className="space-y-2">
                  {unacceptableBehaviors.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="text-red mt-0.5 shrink-0" aria-hidden="true">
                        -
                      </span>
                      <span className="font-sans text-text-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Reporting */}
              <div>
                <h2 className="font-mono text-lg text-amber mb-4">
                  ## Reporting
                </h2>
                <p className="font-sans text-text-secondary mb-4 leading-relaxed">
                  If you experience or witness unacceptable behavior, please report
                  it through any of the following channels:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="text-green-dim shrink-0 font-mono" aria-hidden="true">$</span>
                    <span className="font-sans text-text-secondary">
                      Discord: DM any community organizer
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-dim shrink-0 font-mono" aria-hidden="true">$</span>
                    <span className="font-sans text-text-secondary">
                      Email:{" "}
                      <a
                        href={`mailto:${CONTACT.email}`}
                        className="text-cyan hover:text-green-primary transition-colors underline underline-offset-2"
                      >
                        {CONTACT.email}
                      </a>
                    </span>
                  </li>
                </ul>
                <p className="font-sans text-text-dim mt-4 text-sm">
                  All reports will be reviewed and investigated promptly and fairly.
                </p>
              </div>

              {/* Enforcement */}
              <div>
                <h2 className="font-mono text-lg text-green-primary mb-4">
                  ## Enforcement
                </h2>
                <ul className="space-y-2">
                  {enforcementSteps.map((step) => (
                    <li key={step.level} className="flex items-start gap-3">
                      <span className="text-amber mt-0.5 shrink-0 font-mono" aria-hidden="true">
                        &gt;
                      </span>
                      <span className="font-sans text-text-secondary">
                        <span className="text-text-primary font-medium">
                          {step.level}:
                        </span>{" "}
                        {step.action}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="font-sans text-text-dim mt-4 text-sm">
                  Organizers reserve the right to remove anyone violating this code
                  of conduct.
                </p>
              </div>

              {/* Scope */}
              <div>
                <h2 className="font-mono text-lg text-green-primary mb-3">
                  ## Scope
                </h2>
                <p className="font-sans text-text-secondary leading-relaxed">
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
                    className="text-cyan hover:text-green-primary transition-colors underline underline-offset-2"
                  >
                    Contributor Covenant
                  </a>
                  , version 2.1
                </p>
              </div>
            </div>
          </TerminalWindow>
        </div>
      </section>
    </main>
  );
}
