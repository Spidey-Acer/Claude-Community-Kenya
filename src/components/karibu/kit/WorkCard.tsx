/**
 * WorkCard: one member submission (project, prompt, MCP server) as a link card
 * to its showcase page: cover on a matte, type label, title, short description
 * and author. The whole card is one link, so nothing interactive nests inside.
 */

import Image from "next/image";
import Link from "next/link";
import type { ShowcasePostView } from "@/lib/showcase/queries";
import { TYPE_LABELS } from "@/lib/showcase/constants";
import { CARD, META } from "./tokens";

export function WorkCard({ submission }: { submission: ShowcasePostView }) {
  return (
    <Link href={`/showcase/${submission.slug}`} className={CARD}>
      <div className="frame-base frame-plate w-full shrink-0">
        {submission.coverImageUrl && (
          <Image
            src={submission.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
            className="object-contain"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="mb-1.5 font-inter text-xs font-medium uppercase tracking-[0.08em] text-ink-muted">
          {TYPE_LABELS[submission.type]}
        </p>
        <h3 className="mb-1.5 font-newsreader text-[20px] leading-tight text-ink">{submission.title}</h3>
        <p className="mb-3 line-clamp-3 flex-1 font-inter text-[14.5px] leading-[1.55] text-ink-soft">
          {submission.shortDescription}
        </p>
        {submission.authorName && <p className={META}>by {submission.authorName}</p>}
      </div>
    </Link>
  );
}
