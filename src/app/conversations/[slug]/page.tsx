import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { getConversationsPageBySlug } from "@/lib/conversations/queries";
import { SITE_CONFIG } from "@/lib/constants";
import { ConversationsHero } from "@/components/karibu/conversations/ConversationsHero";
import { StatWall } from "@/components/karibu/conversations/StatWall";
import { ContributionColumns } from "@/components/karibu/conversations/ContributionColumns";
import { ContributionForm } from "@/components/karibu/conversations/ContributionForm";
import { SeedDrawer } from "@/components/karibu/conversations/SeedDrawer";
import { ResultBanner } from "@/components/karibu/conversations/ResultBanner";

// Rendered on every request, not ISR. The root layout reads cookies (a dynamic
// API) on every page; routes prerendered at build discover that and become
// dynamic automatically, but this route had no slugs at build time, so Next
// classified it static and every on-demand render then died with
// DYNAMIC_SERVER_USAGE (prod 500, 28 Aug). Forcing dynamic matches how every
// other public page actually runs, and the live-result flip needs freshness
// anyway.
export const dynamic = "force-dynamic";

const WRAP = "mx-auto max-w-[1180px] px-6 md:px-10";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getConversationsPageBySlug(slug);

  if (!page) {
    return { title: "Conversation Not Found | Claude Community Kenya" };
  }

  const url = `${SITE_CONFIG.url}/conversations/${slug}`;
  return {
    title: `${page.event.title} | Claude Community Kenya`,
    description: page.heroSubline,
    alternates: { canonical: url },
    openGraph: {
      title: page.heroHeadline,
      description: page.heroSubline,
      url,
      siteName: SITE_CONFIG.name,
      type: "article",
    },
  };
}

export default async function ConversationsEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getConversationsPageBySlug(slug);

  if (!page) {
    notFound();
  }

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Conversations", url: "/conversations" },
          { name: page.event.title },
        ]}
      />

      {page.result && <ResultBanner result={page.result} ctaUrl={page.impactLabLumaUrl} />}

      <ConversationsHero
        heroHeadline={page.heroHeadline}
        heroSubline={page.heroSubline}
        date={page.event.date}
        time={page.event.time}
        venue={page.event.venue}
        city={page.event.city}
        lumaUrl={page.event.lumaUrl}
      />

      <StatWall stats={page.framingStats} />

      <ContributionColumns
        tableQuestions={page.tableQuestions}
        contributionsByQuestionKey={page.contributionsByQuestionKey}
      />

      {page.contributionsOpen && page.tableQuestions.length > 0 && (
        <section className={`${WRAP} pb-14`} aria-label="Contribute a problem statement">
          <div className="mb-6 font-inter text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
            Add your voice
          </div>
          <div className="mx-auto max-w-[640px]">
            <ContributionForm eventSlug={page.event.slug} tableQuestions={page.tableQuestions} />
          </div>
        </section>
      )}

      <SeedDrawer seedProblems={page.seedProblems} />
    </>
  );
}
