// Shared defaults for Conversations Live admin flows (page config attach,
// moderation, Q&A). See docs/superpowers/specs/2026-08-28-conversations-live-design.md.

import type { TableQuestion } from "./schemas"

/**
 * The Conversations Room Kit's canonical three questions. Applied when a
 * ConversationsPage is first attached to an event; Peter edits copy from the
 * admin Config tab afterwards. Keys are stable and referenced by
 * EventContribution.questionKey — never rename them without a migration.
 */
export const DEFAULT_TABLE_QUESTIONS: TableQuestion[] = [
  {
    key: "jobs",
    label: "What does AI mean for my job?",
    description: "Work, income, and the tasks a machine can now do cheaper.",
  },
  {
    key: "community",
    label: "What is AI doing to me, my kids, my community?",
    description: "Daily life, family, and what changes when everyone is online with it.",
  },
  {
    key: "rules",
    label: "Who decides the rules?",
    description: "Consent, appeal, and who is accountable when a system decides for you.",
  },
]

/** Result payload has at most this many runners-up alongside the winner. */
export const MAX_RESULT_RUNNERS_UP = 2
