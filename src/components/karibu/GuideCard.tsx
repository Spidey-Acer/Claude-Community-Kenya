import Image from "next/image";
import Link from "next/link";
import type { GuideView } from "@/lib/data";
import { GUIDE_AUDIENCE_LABELS, guideMetaLine, type GuideAudience } from "@/lib/guides";
import { withDownload } from "@/lib/supabase";

/**
 * One guide in the /resources "Guides and notes" grid — cover (or a title
 * card when none is set), audience, clamped summary, file meta, and the
 * Read / Download pair. Server component: no state, no client JS needed.
 */
export function GuideCard({ guide }: { guide: GuideView }) {
  const downloadHref = withDownload(guide.fileUrl, `${guide.slug}.pdf`);
  const audienceLabel = GUIDE_AUDIENCE_LABELS[guide.audience as GuideAudience] ?? guide.audience;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-sand bg-paper-card">
      {guide.coverUrl ? (
        <div className="relative h-40 w-full">
          <Image
            src={guide.coverUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-paper-alt p-6">
          <p className="text-center font-newsreader text-[19px] leading-tight text-ink">{guide.title}</p>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <h3 className="mb-1.5 font-newsreader text-[22px] leading-tight text-ink">{guide.title}</h3>
        <p className="mb-3 font-inter text-[13px] text-ink-muted">{audienceLabel}</p>
        <p className="mb-4 line-clamp-3 flex-1 font-inter text-[14px] leading-[1.55] text-ink-soft">
          {guide.summary}
        </p>
        <p className="mb-4 font-inter text-[12.5px] text-ink-muted">
          {guideMetaLine(guide.fileSize, guide.pageCount)}
        </p>
        <div className="flex items-center gap-5">
          <Link
            href={`/resources/guides/${guide.slug}`}
            className="rounded font-inter text-[14.5px] font-semibold text-clay hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50"
          >
            Read
          </Link>
          <a
            href={downloadHref}
            download
            className="inline-flex rounded-full bg-ink px-5 py-2 font-inter text-[13.5px] font-semibold text-paper transition-colors hover:bg-clay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
