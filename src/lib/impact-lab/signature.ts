/**
 * A stable content signature of a match result — its team compositions and
 * unassigned list. Because the engine is deterministic, the same participants +
 * settings always produce the same signature; if a participant is edited between
 * "Generate" and "Save"/"Explain", the recomputed signature differs, which is how
 * we detect that the organiser is about to freeze something other than what they
 * reviewed.
 */

import { createHash } from "crypto"
import type { MatchResult } from "@/lib/matching"

export function resultSignature(result: MatchResult): string {
  const canonical = JSON.stringify({
    teams: result.teams.map((t) => ({
      name: t.name,
      members: [...t.memberIds].sort(),
    })),
    unassigned: [...result.unassignedIds].sort(),
  })
  return createHash("sha256").update(canonical).digest("hex").slice(0, 32)
}
