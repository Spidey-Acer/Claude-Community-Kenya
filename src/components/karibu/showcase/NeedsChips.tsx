import Link from "next/link"
import { NEED_LABELS, type NeedKey } from "@/lib/showcase/constants"
import { cn } from "@/lib/utils"

interface NeedsChipsProps {
  needs: NeedKey[]
  activeNeed?: string
}

/**
 * A post's "looking for" tags, each a real link into `/showcase?need=<key>`
 * so clicking one filters the feed to posts asking for the same thing.
 *
 * Not used inside `ShowcaseCard` — the card is itself one large `<Link>`, and
 * nesting an `<a>` inside an `<a>` is invalid HTML. This is for standalone
 * placement, e.g. the detail page's "Looking for" section.
 */
export function NeedsChips({ needs, activeNeed }: NeedsChipsProps) {
  if (needs.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5" role="list" aria-label="Looking for">
      {needs.map((need) => {
        const isActive = activeNeed === need
        return (
          <Link
            key={need}
            href={`/showcase?need=${need}`}
            role="listitem"
            className={cn(
              "rounded-full border px-2.5 py-1 font-inter text-[11.5px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay focus-visible:ring-offset-2",
              isActive
                ? "border-clay bg-clay/10 text-clay"
                : "border-sand text-ink-muted hover:border-clay hover:text-clay",
            )}
          >
            {NEED_LABELS[need]}
          </Link>
        )
      })}
    </div>
  )
}
