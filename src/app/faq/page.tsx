import type { Metadata } from "next";
import Link from "next/link";
import { ScrollReveal, CommandPrefix } from "@/components/terminal";
import { Accordion } from "@/components/ui/Accordion";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { faqs, getFaqsByCategory } from "@/data/faq";
import { SOCIAL_LINKS, CONTACT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "FAQ | Claude Community Kenya",
  description:
    "Answers to common questions about Claude Code, our events in Nairobi and Mombasa, joining the community, and getting started with Claude AI.",
  alternates: {
    canonical: "https://www.claudekenya.org/faq",
  },
  openGraph: {
    title: "FAQ | Claude Community Kenya",
    description:
      "Answers to common questions about Claude Code, our events in Nairobi and Mombasa, joining the community, and getting started with Claude AI.",
    url: "https://www.claudekenya.org/faq",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

const categories = [
  {
    key: "general" as const,
    label: "General",
    command: "cat faq/general.txt",
  },
  {
    key: "events" as const,
    label: "Events",
    command: "cat faq/events.txt",
  },
  {
    key: "technical" as const,
    label: "Technical",
    command: "cat faq/technical.txt",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "FAQ" }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Header */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <h1 className="mb-2 font-mono text-2xl font-bold text-green-primary md:text-3xl">
              <CommandPrefix />
              claude --help
            </h1>
            <p className="mt-4 font-sans text-lg text-text-secondary">
              Frequently Asked Questions
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="pb-20">
        <div className="mx-auto max-w-6xl space-y-12 px-4">
          {categories.map((category, index) => {
            const items = getFaqsByCategory(category.key).map((faq) => ({
              id: faq.id,
              title: faq.question,
              content: faq.answer,
            }));

            return (
              <ScrollReveal key={category.key} delay={index * 100}>
                <div id={`faq-${category.key}`}>
                  <h2 className="mb-4 flex items-center gap-2 font-mono text-base text-text-primary">
                    <CommandPrefix />
                    <span className="text-text-secondary">{category.command}</span>
                    <span className="ml-2 font-mono text-xs text-text-dim">
                      ({items.length})
                    </span>
                  </h2>
                  <Accordion items={items} />
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      {/* Still have questions? */}
      <section className="border-t border-border-default bg-bg-secondary py-16">
        <div className="mx-auto max-w-6xl px-4">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="mb-4 font-mono text-xl text-green-primary">
                <CommandPrefix />
                echo &quot;Still have questions?&quot;
              </h2>
              <p className="mx-auto mb-8 max-w-lg font-sans text-text-secondary">
                Can&apos;t find what you&apos;re looking for? Reach out to us directly.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
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
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
