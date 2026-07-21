import type { Metadata } from "next";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { faqs } from "@/data/faq";
import { KaribuFaq } from "@/components/karibu/KaribuFaq";
import { serializeJsonLd } from "@/lib/json-ld"

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
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "FAQ" }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
      />
      <KaribuFaq faqs={faqs} categories={categories} />
    </>
  );
}
