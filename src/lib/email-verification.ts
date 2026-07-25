/**
 * Whether member-facing surfaces require a verified email address.
 *
 * OFF by default, deliberately. The transactional email quota (100/day) is
 * smaller than the Impact Lab cohort (~125), so spending it on verification
 * would lock most participants out of their own team reveal AND leave nothing
 * for password resets — the one transactional email that must always work.
 *
 * With the gate off, signup marks the account verified without sending mail and
 * the member surfaces stop checking. The tradeoff is accepted knowingly: someone
 * could sign up with another registrant's address and see that person's team
 * (teammate names and contacts within the cohort). Set
 * REQUIRE_EMAIL_VERIFICATION=true to restore the gate once quota allows.
 */
export const REQUIRE_EMAIL_VERIFICATION =
  process.env.REQUIRE_EMAIL_VERIFICATION === "true"
