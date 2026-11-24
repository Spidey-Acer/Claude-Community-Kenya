/**
 * Decision function for the copy script's schema preflight.
 *
 * The script writes `type = PROJECT` and the `featured` column, so a database
 * that has not had the matching migration applied must stop it before any work.
 * Kept free of database access: the script runs the two read-only queries and
 * passes the results in, so the decision is unit-testable with mocked rows.
 */

export interface PreflightFacts {
  /** Rows from pg_enum for CommunityResourceType = 'PROJECT'. */
  projectEnumRows: unknown[]
  /** Rows from information_schema.columns for community_submissions.featured. */
  featuredColumnRows: unknown[]
}

/** Returns one message per missing schema piece; an empty array means safe to proceed. */
export function preflightProblems(facts: PreflightFacts): string[] {
  const problems: string[] = []
  if (facts.projectEnumRows.length === 0) {
    problems.push("enum value CommunityResourceType.PROJECT is missing; apply the migration first")
  }
  if (facts.featuredColumnRows.length === 0) {
    problems.push("column community_submissions.featured is missing; apply the migration first")
  }
  return problems
}
