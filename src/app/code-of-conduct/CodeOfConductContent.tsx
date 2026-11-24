/**
 * CodeOfConductContent: the code of conduct on the page kit (warm light).
 * Wording is unchanged; only the presentation moved off the old dark styling.
 */

import { Reveal } from "@/components/karibu/motion/Reveal";
import { Masthead, WRAP } from "@/components/karibu/kit";
import { CONTACT } from "@/lib/constants";

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

const H2_CLASS = "mb-3 mt-8 font-newsreader text-[24px] font-medium text-ink";
const BODY_CLASS = "font-inter text-[15.5px] leading-[1.7] text-ink-soft";
const LIST_CLASS = `list-inside list-disc space-y-2 marker:text-clay ${BODY_CLASS}`;
const LINK_CLASS = "text-clay underline underline-offset-2 hover:text-ink";

export function CodeOfConductContent() {
  return (
    <>
      <Masthead eyebrow="Community" title="Code of Conduct" />

      <section className={`${WRAP} pb-20`}>
        <Reveal>
          <article className="mx-auto max-w-3xl rounded-2xl border border-sand bg-paper-card p-8 md:p-12">
            <div className="mb-8">
              <h2 className={`${H2_CLASS} mt-0`}>Our Pledge</h2>
              <p className={BODY_CLASS}>
                We pledge to make participation in Claude Community Kenya a
                harassment-free experience for everyone, regardless of age, body
                size, disability, ethnicity, gender identity, level of experience,
                nationality, personal appearance, race, religion, or sexual
                identity and orientation.
              </p>
            </div>

            <div className="mb-8">
              <h2 className={H2_CLASS}>Expected Behavior</h2>
              <ul className={LIST_CLASS}>
                {expectedBehaviors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="mb-8">
              <h2 className={H2_CLASS}>Unacceptable Behavior</h2>
              <ul className={LIST_CLASS}>
                {unacceptableBehaviors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="mb-8 rounded-xl border border-sand bg-paper-alt p-6">
              <h2 className="mb-3 font-newsreader text-[24px] font-medium text-ink">Reporting</h2>
              <p className={`mb-4 ${BODY_CLASS}`}>
                If you experience or witness unacceptable behavior, please report
                it through any of the following channels:
              </p>
              <ul className={LIST_CLASS}>
                <li>Discord: DM any community organizer</li>
                <li>
                  Email:{" "}
                  <a href={`mailto:${CONTACT.email}`} className={LINK_CLASS}>
                    {CONTACT.email}
                  </a>
                </li>
              </ul>
              <p className="mt-4 font-inter text-sm text-ink-muted">
                All reports will be reviewed and investigated promptly and fairly.
              </p>
            </div>

            <div className="mb-8">
              <h2 className={H2_CLASS}>Enforcement</h2>
              <ol className="space-y-3">
                {enforcementSteps.map((step, index) => (
                  <li key={step.level} className="flex items-center gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-alt font-inter text-sm font-semibold text-clay">
                      {index + 1}
                    </span>
                    <span className={BODY_CLASS}>
                      <span className="font-medium text-ink">{step.level}:</span> {step.action}
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 font-inter text-sm text-ink-muted">
                Organizers reserve the right to remove anyone violating this code
                of conduct.
              </p>
            </div>

            <div className="mb-8">
              <h2 className={H2_CLASS}>Scope</h2>
              <p className={BODY_CLASS}>
                This code of conduct applies to all community spaces including
                Discord, in-person events, social media, and GitHub repositories.
              </p>
            </div>

            <div className="border-t border-sand pt-6">
              <p className="font-inter text-xs text-ink-muted">
                Adapted from the{" "}
                <a
                  href="https://www.contributor-covenant.org/version/2/1/code_of_conduct/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK_CLASS}
                >
                  Contributor Covenant
                </a>
                , version 2.1
              </p>
            </div>
          </article>
        </Reveal>
      </section>
    </>
  );
}
