/**
 * ResourceLinks — the "#links" section of /resources: the curated link
 * directory from src/data/resources.ts, grouped by category. Moved here from
 * the old /resources/links page, which now redirects to /resources#links.
 * Server component (the data is static).
 */

import { Reveal } from "@/components/karibu/motion/Reveal";
import { getResourceCategories, getResourcesByCategory } from "@/data/resources";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

export function ResourceLinks() {
  const categories = getResourceCategories();

  return (
    <section id="links" className={`${WRAP} scroll-mt-24 py-14`} aria-label="Curated links">
      <div className="mb-8 max-w-[640px]">
        <h2 className="mb-2 font-newsreader text-[28px] font-normal leading-[1.1] tracking-[-0.01em] text-ink">
          Curated links
        </h2>
        <p className="font-inter text-[15px] leading-[1.55] text-ink-soft">
          Tools, docs and communities worth bookmarking, picked for Kenyan developers.
        </p>
      </div>
      <div className="space-y-10">
        {categories.map((category, categoryIndex) => (
          <Reveal key={category} index={categoryIndex % 6}>
            <h3 className="mb-4 font-inter text-[13px] font-semibold uppercase tracking-[0.14em] text-clay">
              {category}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {getResourcesByCategory(category).map((resource) => (
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
                  <span className="truncate font-inter text-[13px] text-ink-muted">{resource.url}</span>
                </a>
              ))}
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
