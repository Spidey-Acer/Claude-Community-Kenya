import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { HeroEmailCapture } from "@/components/sections/HeroEmailCapture";
import { getNewsletterIssues } from "@/lib/data";
import { SITE_CONFIG } from "@/lib/constants";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Newsletter | ${SITE_CONFIG.name}`,
  description:
    "Monthly digest from Claude Community Kenya — Claude tips, community projects, event recaps, and what's shipping in the Kenyan AI scene.",
  alternates: {
    canonical: `${SITE_CONFIG.url}/newsletter`,
  },
  openGraph: {
    title: `Newsletter | ${SITE_CONFIG.name}`,
    description:
      "Monthly digest from Claude Community Kenya — Claude tips, community projects, event recaps, and what's shipping in the Kenyan AI scene.",
    url: `${SITE_CONFIG.url}/newsletter`,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

/** Formats a date string as "May 2026" */
function formatIssueMonth(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Pads an issue number to 2 digits: 3 → "03" */
function padIssueNumber(n: number): string {
  return String(n).padStart(2, "0");
}

/** Fraunces display-serif inline style */
const FRAUNCES: React.CSSProperties = {
  fontFamily: "var(--font-display), ui-serif, Georgia, serif",
  letterSpacing: "-0.025em",
};

export default async function NewsletterPage() {
  const issues = await getNewsletterIssues().catch(() => []);

  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 sm:px-6 lg:px-8">
      <BreadcrumbSchema
        items={[{ name: "Home", url: "/" }, { name: "Newsletter" }]}
      />

      <div className="mx-auto max-w-3xl">
        {/* ─── Hero ─── */}
        <section className="mb-14 text-center" aria-label="Newsletter hero">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#2a2a28] bg-[#1e1e1d]/80 px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest text-[#b0aea5]">
            <span aria-hidden="true">✦</span>
            Monthly Digest
            {issues.length > 0 && (
              <span className="rounded-full bg-[#d97757]/15 px-2 py-0.5 text-[10px] font-semibold text-[#d97757]">
                {issues.length} issue{issues.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <h1
            className="mb-4 text-4xl font-semibold text-[#faf9f5] sm:text-5xl"
            style={FRAUNCES}
          >
            The CCK Newsletter
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-[#b0aea5]">
            Claude tips, community projects, event recaps, and what's
            shipping in the Kenyan AI scene — delivered monthly.
          </p>

          {/* Email capture */}
          <HeroEmailCapture
            label="Subscribe · get the next issue in your inbox"
            buttonLabel="Subscribe"
            className="mx-auto max-w-md"
          />
        </section>

        {/* ─── Issue list ─── */}
        <section aria-label="Past issues">
          <h2
            className="mb-6 text-xs font-medium uppercase tracking-widest text-[#7a7870]"
          >
            Past Issues
          </h2>

          {issues.length === 0 ? (
            <div className="card-elevated rounded-2xl p-10 text-center">
              <p className="mb-2 text-[#faf9f5]">First issue ships soon.</p>
              <p className="text-sm text-[#b0aea5]">
                Subscribe above and you&apos;ll be the first to read it.
              </p>
            </div>
          ) : (
            <ul className="space-y-4" role="list">
              {issues.map((issue) => (
                <li key={issue.slug}>
                  <Link
                    href={`/newsletter/${issue.slug}`}
                    className="card-elevated group flex flex-col gap-1.5 rounded-2xl p-6 transition-all duration-200 hover:border-[#3a3a37] sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[#7a7870]">
                        Issue {padIssueNumber(issue.number)} &middot;{" "}
                        {formatIssueMonth(issue.publishedAt)}
                      </p>
                      <h3
                        className="mb-2 text-lg font-semibold text-[#faf9f5] group-hover:text-[#d97757] transition-colors"
                        style={FRAUNCES}
                      >
                        {issue.title}
                      </h3>
                      <p className="line-clamp-2 text-sm leading-relaxed text-[#b0aea5]">
                        {issue.excerpt}
                      </p>
                    </div>
                    <span className="mt-1 shrink-0 text-sm text-[#9a9890] transition-colors group-hover:text-[#d97757]">
                      Read →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
