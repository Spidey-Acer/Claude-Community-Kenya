import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/karibu/motion/Reveal";
import {
  getResourceCategories,
  getResourcesByCategory,
} from "@/data/resources";
import { getSocialLinks } from "@/lib/social-links";

export const metadata: Metadata = {
  title: "Curated Links | Claude Community Kenya",
  description:
    "A comprehensive directory of Claude AI resources, tools, communities, and learning materials curated for Kenyan developers.",
  alternates: {
    canonical: "https://www.claudekenya.org/resources/links",
  },
  openGraph: {
    title: "Curated Links | Claude Community Kenya",
    description:
      "A comprehensive directory of Claude AI resources, tools, communities, and learning materials curated for Kenyan developers.",
    url: "https://www.claudekenya.org/resources/links",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";
const KICKER = "font-inter text-xs font-semibold uppercase tracking-[0.22em] text-clay";

export default async function LinksPage() {
  const categories = getResourceCategories();
  const socialLinks = await getSocialLinks();
  const totalResources = categories.reduce(
    (acc, cat) => acc + getResourcesByCategory(cat).length,
    0
  );

  return (
    <>
      {/* Header */}
      <section className={`${WRAP} pb-6 pt-16`} aria-label="Curated links header">
        <Reveal>
          <Link
            href="/resources"
            className="mb-5 inline-flex items-center gap-1.5 font-inter text-[13px] font-medium text-ink-muted transition-colors hover:text-clay"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Resources
          </Link>
          <div className={`${KICKER} mb-3`}>Resources</div>
          <h1 className="mb-4 max-w-[820px] font-newsreader text-[38px] font-normal leading-[1.06] tracking-[-0.02em] text-ink sm:text-[48px]">
            Curated <span className="italic text-clay">links</span>
          </h1>
          <p className="max-w-[600px] font-inter text-[16px] leading-[1.6] text-ink-soft">
            A comprehensive directory of Claude AI resources, tools, communities,
            and learning materials curated for Kenyan developers.
          </p>
        </Reveal>
      </section>

      {/* Link directory, grouped by category */}
      <section className={`${WRAP} py-10`} aria-label="Link directory">
        <div className="space-y-10">
          {categories.map((category, catIndex) => {
            const items = getResourcesByCategory(category);
            return (
              <Reveal key={category} index={catIndex % 6}>
                <h2 className="mb-4 font-inter text-[13px] font-semibold uppercase tracking-[0.14em] text-clay">
                  {category}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((resource) => (
                    <a
                      key={resource.id}
                      id={resource.id}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex scroll-mt-24 flex-col gap-1 rounded-2xl border border-sand bg-paper-card p-5 transition-colors hover:border-clay"
                    >
                      <span className="font-inter text-[15px] font-semibold text-ink group-hover:text-clay">
                        {resource.title}
                      </span>
                      <span className="truncate font-inter text-[13px] text-ink-muted">
                        {resource.url}
                      </span>
                    </a>
                  ))}
                </div>
              </Reveal>
            );
          })}
        </div>
        <p className="mt-10 font-inter text-[13px] text-ink-muted">
          {categories.length} categories, {totalResources} resources listed.
        </p>
      </section>

      {/* Contribute CTA */}
      <section className={`${WRAP} pb-20 pt-4`} aria-label="Contribute a resource">
        <Reveal>
          <div className="rounded-2xl border border-sand bg-paper-card p-7">
            <h2 className="mb-3 font-newsreader text-[22px] text-ink">
              Contribute a resource
            </h2>
            <p className="font-inter text-[15px] leading-[1.6] text-ink-soft">
              Know a great Claude resource that should be listed here? Have a
              tool or tutorial to share? We welcome contributions from the
              community. Reach out on our{" "}
              {socialLinks.discord && (
                <>
                  <a
                    href={socialLinks.discord}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-clay hover:underline"
                  >
                    Discord server
                  </a>
                  {socialLinks.whatsapp ? ", " : ""}
                </>
              )}
              {socialLinks.whatsapp && (
                <a
                  href={socialLinks.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-clay hover:underline"
                >
                  WhatsApp group
                </a>
              )}
              {", or open a pull request on "}
              <a
                href="https://github.com/Spidey-Acer/Claude-Community-Kenya"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-clay hover:underline"
              >
                GitHub
              </a>
              .
            </p>
          </div>
        </Reveal>
      </section>
    </>
  );
}
