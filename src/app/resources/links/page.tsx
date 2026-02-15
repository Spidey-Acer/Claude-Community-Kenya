import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CommandPrefix } from "@/components/terminal";
import {
  getResourceCategories,
  getResourcesByCategory,
} from "@/data/resources";

export const metadata: Metadata = {
  title: "Curated Links | Claude Community Kenya",
  description:
    "A comprehensive directory of Claude AI resources, tools, communities, and learning materials curated for Kenyan developers.",
};

export default function LinksPage() {
  const categories = getResourceCategories();

  return (
    <main className="mx-auto max-w-6xl px-4 py-20">
      {/* Back link */}
      <Link
        href="/resources"
        className="inline-flex items-center gap-2 font-mono text-sm text-text-dim transition-colors hover:text-green-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Resources
      </Link>

      {/* Header */}
      <section className="py-16">
        <h1 className="font-mono text-3xl font-bold text-green-primary sm:text-4xl">
          <CommandPrefix symbol="$" />
          tree ./resources --links
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-text-secondary">
          A comprehensive directory of resources, tools, and communities — curated
          by Claude Community Kenya.
        </p>
      </section>

      {/* File tree listing */}
      <section className="py-20">
        <div className="border border-border-default bg-bg-card">
          {/* Title bar */}
          <div className="flex items-center gap-2 border-b border-border-default px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-primary" />
            </div>
            <span className="ml-2 font-mono text-xs text-text-dim">
              resource-directory
            </span>
          </div>

          {/* Tree content */}
          <div className="p-6 font-mono text-sm">
            <p className="mb-6 text-text-dim">
              $ tree ./resources --all --urls
            </p>

            {categories.map((category, catIndex) => {
              const items = getResourcesByCategory(category);
              const isLastCategory = catIndex === categories.length - 1;

              return (
                <div key={category} className="mb-8 last:mb-0">
                  {/* Category heading */}
                  <p className="mb-2 font-bold text-amber">{category}</p>

                  {/* Resource items */}
                  {items.map((resource, index) => {
                    const isLast = index === items.length - 1;
                    const connector = isLast ? "\u2514\u2500\u2500" : "\u251C\u2500\u2500";

                    return (
                      <div
                        key={resource.id}
                        className="flex flex-col gap-0.5 py-1 sm:flex-row sm:items-center sm:gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-text-dim select-none">
                            {connector}
                          </span>
                          <span className="text-text-primary">
                            {resource.title}
                          </span>
                        </div>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-8 text-cyan hover:underline sm:ml-0"
                        >
                          {resource.url}
                        </a>
                      </div>
                    );
                  })}

                  {/* Category separator */}
                  {!isLastCategory && (
                    <div className="mt-4 border-b border-border-default" />
                  )}
                </div>
              );
            })}

            {/* Summary line */}
            <div className="mt-8 border-t border-border-default pt-4">
              <p className="text-text-dim">
                {categories.length} categories,{" "}
                {categories.reduce(
                  (acc, cat) => acc + getResourcesByCategory(cat).length,
                  0
                )}{" "}
                resources listed
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contribute CTA */}
      <section className="py-20">
        <div className="border border-border-default bg-bg-card p-6">
          <h2 className="font-mono text-lg font-bold text-text-primary">
            <CommandPrefix symbol="$" />
            contribute --resource
          </h2>
          <p className="mt-3 text-sm text-text-secondary">
            Know a great Claude resource that should be listed here? Have a tool
            or tutorial to share? We welcome contributions from the community.
            Reach out on our{" "}
            <a
              href="https://discord.gg/MdEhxH88"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan hover:underline"
            >
              Discord server
            </a>{" "}
            or open a pull request on{" "}
            <a
              href="https://github.com/claude-community-kenya"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan hover:underline"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
