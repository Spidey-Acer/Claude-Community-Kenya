import type { Metadata } from "next";
import { CommandPrefix } from "@/components/terminal";
import { Accordion } from "@/components/ui/Accordion";
import { getFaqsByCategory } from "@/data/faq";

export const metadata: Metadata = {
  title: "FAQ | Claude Community Kenya",
  description:
    "Frequently asked questions about Claude Community Kenya, our events, and getting started with Claude AI.",
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

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      {/* Header */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="font-mono text-2xl md:text-3xl text-text-primary mb-2">
            <CommandPrefix />
            claude --help
          </h1>
          <p className="font-sans text-lg text-text-secondary mt-4">
            Frequently Asked Questions
          </p>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          {categories.map((category) => {
            const items = getFaqsByCategory(category.key).map((faq) => ({
              id: faq.id,
              title: faq.question,
              content: faq.answer,
            }));

            return (
              <div key={category.key}>
                <h2 className="font-mono text-base text-text-primary mb-4 flex items-center gap-2">
                  <CommandPrefix />
                  <span className="text-text-secondary">{category.command}</span>
                </h2>
                <Accordion items={items} />
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
