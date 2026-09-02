/**
 * The team as a judge sees it: the wire shape of one row in the judging
 * payload, plus the pure list decisions the scoring screen makes over it.
 *
 * Declared here rather than inside the route or the component so both import
 * the same contract and cannot drift — the route adding a field the screen
 * never renders, or the screen reading one the route never sends, is the class
 * of bug that shows up as a blank block on a judge's phone mid-demo.
 *
 * Dependency-free on purpose (no Prisma, no Next, no React) so it can be
 * asserted in vitest and imported by a client component without dragging a
 * server module into the browser bundle.
 */

/** One member of a team, as shown on the judge's screen. */
export interface JudgeTeamMember {
  id: string
  fullName: string
  /** The role they registered as. Shown so a judge knows who to ask what. */
  primaryRole: string
  /** True for the team's self-declared leader — the person to address. */
  isLeader: boolean
}

/**
 * A team's written submission, as a judge reads it.
 *
 * Every optional link is `null` rather than absent when the team did not give
 * one, so the links row can be built by filtering rather than by probing.
 */
export interface JudgeSubmissionView {
  projectName: string
  pitch: string
  /** Who the project helps and with what — the team's own words. */
  problemTackled: string
  /** What is really built versus what is stubbed for the demo. */
  worksVsMocked: string
  /** Where Claude sits in the product, as opposed to in the build process. */
  claudeUsage: string
  repoUrl: string
  demoUrl: string | null
  videoUrl: string | null
  screenshotUrl: string | null
  slidesUrl: string | null
  /** ISO timestamp the submission row was first written. */
  submittedAt: string
}

/** One team in the final run, with everything a judge needs to score it. */
export interface JudgeTeamRow {
  teamId: string
  teamName: string
  /** The venue's physical table. Null on runs saved before tables existed. */
  table: number | null
  /**
   * The track label. Kept under its original name because the admin
   * leaderboard has read this field since before `trackLabel` existed.
   */
  track: string
  /** The matcher's track key, for grouping and filtering without label drift. */
  trackKey: string | null
  /** The same label as `track`, under the name the judge screen reads. */
  trackLabel: string
  /**
   * How many people are on the team per the frozen run. Can exceed
   * `members.length` if a participant row was deleted after the freeze, so it
   * is sent rather than derived.
   */
  memberCount: number
  members: JudgeTeamMember[]
  /** The leader's name, or null when the team never declared one. */
  leaderName: string | null
  submission: JudgeSubmissionView | null
}

/**
 * A judge is told "table 12" over a microphone, so the search box has to
 * accept that as readily as a project name. Matches a bare number and the
 * word "table" in front of one; anything else is treated as free text.
 */
export function tableNumberIn(query: string): number | null {
  const match = /^(?:table\s*)?(\d{1,4})$/.exec(query.trim().toLowerCase())
  return match ? Number(match[1]) : null
}

/**
 * Table order, with unnumbered teams last.
 *
 * A judge works the room in table order; any other order makes them scan the
 * whole list for the table they were just sent to. Teams with no table (older
 * runs) keep their original relative order at the bottom rather than being
 * scattered through the numbered ones.
 */
export function byTableNumber(
  a: Pick<JudgeTeamRow, "table">,
  b: Pick<JudgeTeamRow, "table">
): number {
  if (a.table === b.table) return 0
  if (a.table === null) return 1
  if (b.table === null) return -1
  return a.table - b.table
}

/**
 * Whether a team matches what the judge typed.
 *
 * Searches the four things a judge actually knows about a team they are
 * looking for: its table, its name, the project name, and a member's name —
 * that last one because "the team with Achieng in it" is how a judge is
 * pointed at a table when nobody remembers the project name.
 *
 * @param team The row to test.
 * @param query Raw search input. Empty or whitespace matches everything.
 */
export function matchesTeamQuery(team: JudgeTeamRow, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true

  // "12" and "table 12" find table 12. The number still falls through to the
  // text match, so a project called "Shamba 12" stays findable.
  if (tableNumberIn(needle) === team.table && team.table !== null) return true

  const haystacks = [
    team.teamName,
    team.trackLabel,
    team.submission?.projectName ?? "",
    ...team.members.map((m) => m.fullName),
  ]
  return haystacks.some((text) => text.toLowerCase().includes(needle))
}

/** One outbound link on a submission, in the order a judge opens them. */
export interface SubmissionLink {
  label: string
  href: string
}

/**
 * The submission's links, in reading order, skipping the ones not given.
 *
 * Repo first because it is the only required one and the one that settles
 * "did they build it"; the screenshot last because it is the weakest evidence.
 */
export function submissionLinks(
  submission: JudgeSubmissionView | null
): SubmissionLink[] {
  if (!submission) return []
  const candidates: [string, string | null][] = [
    ["Repo", submission.repoUrl],
    ["Live demo", submission.demoUrl],
    ["Video", submission.videoUrl],
    ["Slides", submission.slidesUrl],
    ["Screenshot", submission.screenshotUrl],
  ]
  return candidates
    .filter((entry): entry is [string, string] => Boolean(entry[1]?.trim()))
    .map(([label, href]) => ({ label, href }))
}

/**
 * Clock time for the "Saved 17:04" confirmation.
 *
 * 24-hour and device-local: judges are in one room on one timezone, and a
 * 12-hour "5:04" beside a run-of-show written in 24-hour time is one more
 * thing to translate while standing up.
 */
export function formatClockTime(when: Date): string {
  return `${String(when.getHours()).padStart(2, "0")}:${String(
    when.getMinutes()
  ).padStart(2, "0")}`
}

/**
 * The list filters, as the header renders them.
 *
 * `all`, `unscored` and `scored` are fixed; every other value is a track key,
 * prefixed so a track called "scored" could never shadow a fixed filter.
 */
export type JudgeListFilter = "all" | "unscored" | "scored" | `track:${string}`

/** The track key a filter selects, or null when it is not a track filter. */
export function trackKeyOfFilter(filter: JudgeListFilter): string | null {
  return filter.startsWith("track:") ? filter.slice("track:".length) : null
}

/**
 * Whether a team survives the active filter.
 *
 * @param team The row to test.
 * @param filter The active filter.
 * @param isScored Whether THIS judge has scored this team.
 */
export function matchesFilter(
  team: JudgeTeamRow,
  filter: JudgeListFilter,
  isScored: boolean
): boolean {
  if (filter === "all") return true
  if (filter === "scored") return isScored
  if (filter === "unscored") return !isScored
  const key = trackKeyOfFilter(filter)
  // Falls back to the label so a legacy team with no `trackKey` is still
  // reachable by its track chip rather than vanishing from every track view.
  return key !== null && (team.trackKey ?? team.trackLabel) === key
}

/**
 * The distinct tracks in a run, in label order, for the filter chips.
 *
 * Keyed by `trackKey` where there is one and by label otherwise, matching
 * `matchesFilter` so a chip can never select nothing.
 */
export function tracksInRun(
  teams: readonly JudgeTeamRow[]
): { key: string; label: string }[] {
  const byKey = new Map<string, string>()
  for (const team of teams) {
    const key = team.trackKey ?? team.trackLabel
    if (key && !byKey.has(key)) byKey.set(key, team.trackLabel || key)
  }
  return [...byKey.entries()]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
}
