import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { DigitalDocumentSchema } from "@/components/schema/DigitalDocumentSchema";
import { getGuideBySlug, getPublishedGuideSlugs } from "@/lib/data";
import { GUIDE_AUDIENCE_LABELS, guideMetaLine, type GuideAudience } from "@/lib/guides";
import { withDownload } from "@/lib/supabase";
import { BTN_PRIMARY, Masthead } from "@/components/karibu/kit";
import { SITE_CONFIG } from "@/lib/constants";

export const revalidate = 600;

const WRAP = "mx-auto max-w-[900px] px-6 md:px-10";

export async function generateStaticParams() {
  const slugs = await getPublishedGuideSlugs().catch(() => []);
  return slugs.map((slug) => ({ slug }));
}

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);

  if (!guide) {
    return { title: `Guide Not Found | ${SITE_CONFIG.name}` };
  }

  const url = `${SITE_CONFIG.url}/resources/guides/${guide.slug}`;
  const ogImage = guide.coverUrl ?? `${SITE_CONFIG.url}/opengraph-image`;

  return {
    title: `${guide.title} | ${SITE_CONFIG.name}`,
    description: guide.summary,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: guide.title,
      description: guide.summary,
      url,
      siteName: SITE_CONFIG.name,
      type: "article",
      images: [{ url: ogImage }],
    },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  const audienceLabel = GUIDE_AUDIENCE_LABELS[guide.audience as GuideAudience] ?? guide.audience;
  const downloadHref = withDownload(guide.fileUrl, `${guide.slug}.pdf`);

  return (
    <div className="bg-paper py-14">
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Resources", url: "/resources" },
          { name: guide.title },
        ]}
      />
      <DigitalDocumentSchema
        guide={{
          slug: guide.slug,
          title: guide.title,
          summary: guide.summary,
          fileUrl: guide.fileUrl,
          publishedAt: guide.publishedAt,
        }}
      />

      <div className={WRAP}>
        <nav aria-label="Breadcrumb" className="mb-6 font-inter text-xs font-semibold tracking-[0.18em] text-ink-muted">
          <Link href="/" className="hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50 rounded">
            Home
          </Link>
          <span className="mx-2 text-sand-2">/</span>
          <Link href="/resources" className="hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50 rounded">
            Resources
          </Link>
          <span className="mx-2 text-sand-2">/</span>
          <span className="text-ink">{guide.title}</span>
        </nav>

        <Masthead eyebrow="Guide" title={guide.title} flush>
          <p className="mb-1 mt-4 font-inter text-[14px] text-ink-muted">{audienceLabel}</p>
          <p className="mb-6 font-inter text-[13px] text-ink-muted">
            {guideMetaLine(guide.fileSize, guide.pageCount)}
          </p>
        </Masthead>

        <p className="mb-7 max-w-[640px] font-inter text-[16px] leading-[1.6] text-ink-soft">
          {guide.summary}
        </p>

        <a
          href={downloadHref}
          download
          className={`mb-10 ${BTN_PRIMARY}`}
        >
          Download PDF
        </a>

        <div className="overflow-hidden rounded-2xl border border-sand">
          <iframe
            src={guide.fileUrl}
            title={`${guide.title}: PDF reader`}
            className="h-[80vh] w-full"
          />
        </div>
        <p className="mt-3 font-inter text-[13px] text-ink-muted">
          If the reader does not load,{" "}
          <a href={downloadHref} download className="text-clay hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50 rounded">
            download the PDF
          </a>
          .
        </p>
      </div>
    </div>
  );
}
