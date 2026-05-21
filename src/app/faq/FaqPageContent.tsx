"use client";

import React from "react";
import { ScrollReveal } from "@/components/terminal";
import { PersonaHeading } from "@/components/persona/PersonaHeading";
import { FaqClient } from "./FaqClient";
import { FloatingDiscordCTA } from "./FloatingDiscordCTA";
import { useSkin } from "@/contexts/SkinContext";
import { SOCIAL_LINKS, CONTACT } from "@/lib/constants";
import type { FAQ } from "@/data/faq";

interface FaqCategory {
  key: string;
  label: string;
  command: string;
}

interface FaqPageContentProps {
  faqs: FAQ[];
  categories: FaqCategory[];
}

export function FaqPageContent({ faqs, categories }: FaqPageContentProps) {
  const { skin } = useSkin();
  const isPro = skin === "pro";

  return (
    <main className="min-h-screen bg-bg-primary">
      {/* Header */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <PersonaHeading
              page="faq"
              section="hero"
              as="h1"
              className={
                isPro
                  ? "mb-2 text-2xl font-bold text-[#faf9f5] md:text-3xl"
                  : "mb-2 font-mono text-2xl font-bold text-green-primary md:text-3xl"
              }
            />
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-4">
          <FaqClient faqs={faqs} categories={categories} />
        </div>
      </section>

      <FloatingDiscordCTA />

      {/* Still have questions? */}
      <section className="border-t border-border-default bg-bg-secondary py-16">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <div className="text-center">
              <PersonaHeading
                page="faq"
                section="still"
                as="h2"
                className={
                  isPro
                    ? "mb-4 text-xl text-[#faf9f5]"
                    : "mb-4 font-mono text-xl text-green-primary"
                }
              />
              <p className="mx-auto mb-8 max-w-lg font-sans text-text-secondary">
                Can&apos;t find what you&apos;re looking for? Reach out to us directly.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {isPro ? (
                  <>
                    <a
                      href={SOCIAL_LINKS.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary-shadow inline-flex items-center gap-2 rounded-full bg-[#d97757] px-6 py-3 text-[14px] font-semibold text-[#faf9f5] hover:bg-[#c06848]"
                    >
                      Ask on Discord <span aria-hidden="true">→</span>
                    </a>
                    <a
                      href={`mailto:${CONTACT.email}`}
                      className="link-refined inline-flex items-center gap-2 rounded-full border border-[#2a2a28] px-6 py-3 text-[14px] font-semibold text-[#e8e6dc] transition-colors hover:border-[#3a3a37] hover:text-[#faf9f5]"
                    >
                      Email us <span aria-hidden="true">→</span>
                    </a>
                  </>
                ) : (
                  <>
                    <a
                      href={SOCIAL_LINKS.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 border border-green-primary px-5 py-2.5 font-mono text-sm font-medium text-green-primary transition-all duration-200 hover:bg-green-primary hover:text-bg-primary"
                    >
                      <span aria-hidden="true">&gt;</span>
                      ASK_ON_DISCORD
                    </a>
                    <a
                      href={`mailto:${CONTACT.email}`}
                      className="inline-flex items-center gap-2 border border-border-default px-5 py-2.5 font-mono text-sm font-medium text-text-secondary transition-all duration-200 hover:border-border-hover hover:text-text-primary"
                    >
                      <span aria-hidden="true">&gt;</span>
                      EMAIL_US
                    </a>
                  </>
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
