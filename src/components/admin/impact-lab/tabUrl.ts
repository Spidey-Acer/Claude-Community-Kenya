/**
 * Tab identity for the Impact Lab admin dashboard, shared between the tab
 * bar (`ImpactLabDashboard`) and its URL-query parsing so a refreshed or
 * pasted link lands back on the tab it was copied from.
 */
export type Tab =
  | "events"
  | "participants"
  | "matching"
  | "runs"
  | "submissions"
  | "checkin"
  | "rubric"
  | "leaderboard"
  | "judges"
  | "results"
  | "cards"

/** Where the dashboard opens when the URL names no tab, or an unknown one. */
export const DEFAULT_TAB: Tab = "participants"

const TAB_KEYS: readonly Tab[] = [
  "events",
  "participants",
  "matching",
  "runs",
  "submissions",
  "checkin",
  "rubric",
  "leaderboard",
  "judges",
  "results",
  "cards",
]

function isTab(value: string): value is Tab {
  return (TAB_KEYS as readonly string[]).includes(value)
}

/**
 * Parses a `?tab=` search-param value into a known `Tab`. Anything missing,
 * stale (a tab renamed since the link was shared), or hand-edited falls back
 * to the default rather than rendering a blank pane.
 */
export function tabFromQuery(value: string | null | undefined): Tab {
  return value != null && isTab(value) ? value : DEFAULT_TAB
}
