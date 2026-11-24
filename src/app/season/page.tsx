import { redirect } from "next/navigation"
import { seasonIndexTarget } from "@/lib/seasons/queries"

/**
 * `/season` has no content of its own: it sends the visitor to the live
 * season, or to the most recent one when none is running (never a 500).
 * Dynamic so "today" is read per request, not frozen at build time.
 */
export const dynamic = "force-dynamic"

export default function SeasonIndexPage(): never {
  redirect(seasonIndexTarget())
}
