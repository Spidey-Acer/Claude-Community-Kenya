import Image from "next/image";
import Link from "next/link";
import type { GuideView } from "@/lib/data";
import { GUIDE_AUDIENCE_LABELS, guideMetaLine, type GuideAudience } from "@/lib/guides";
import { withDownload } from "@/lib/supabase";
import { BookOpen } from "lucide-react";
import { BTN_OUTLINE, LINK } from "@/components/karibu/kit";

/**
 * One guide in the /resources "Guides and notes" grid — cover (or a title
 * card when none is set), audience, clamped summary, file meta, and the
 * Read / Download pair. Server component: no state, no client JS needed.
 */
export function GuideCard({ guide }: { guide: GuideView }) {
  const downloadHref = withDownload(guide.fileUrl, `${guide.slug}.pdf`);
  const audienceLabel = GUIDE_AUDIENCE_LABELS[guide.audience as GuideAudience] ?? guide.audience;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-sand bg-paper-card">
      <div className="frame-base frame-plate border-b border-sand">
        {guide.coverUrl ? (
          <Image
            src={guide.coverUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
            className="object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-clay" aria-hidden="true">
            <BookOpen className="h-12 w-12" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="mb-1.5 font-newsreader text-[22px] leading-tight text-ink">
          <Link
            href={`/resources/guides/${guide.slug}`}
            className="rounded hover:text-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50"
          >
            {guide.title}
          </Link>
        </h3>
        <p className="mb-3 font-inter text-[13px] text-ink-muted">{audienceLabel}</p>
        <p className="mb-4 line-clamp-3 flex-1 font-inter text-[14px] leading-[1.55] text-ink-soft">
          {guide.summary}
        </p>
        <p className="mb-4 font-inter text-[12.5px] text-ink-muted">
          {guideMetaLine(guide.fileSize, guide.pageCount)}
        </p>
        <div className="flex items-center gap-5">
          <Link href={`/resources/guides/${guide.slug}`} aria-label={`Read ${guide.title}`} className={LINK}>
            Read
          </Link>
          <a href={downloadHref} download aria-label={`Download ${guide.title}`} className={BTN_OUTLINE}>
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
