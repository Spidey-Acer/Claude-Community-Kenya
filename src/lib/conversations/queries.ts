/**
 * Server-side data access for Conversations Live public pages.
 *
 * Mirrors the shape and conventions of src/lib/data.ts: Prisma in, decoded
 * plain view types with ISO-string dates out — UI code never touches a
 * Prisma row or a raw Json column directly. Contribution ordering (FEATURED
 * first, newest first within each tier, capped) matches the public GET
 * /api/events/[slug]/contributions route exactly, so the SSR page and a
 * client refetch of that endpoint would always agree.
 *
 * See docs/superpowers/specs/2026-08-28-conversations-live-design.md.
 */

import { prisma } from "@/lib/prisma"
import { decodeHtmlEntities } from "@/lib/input-sanitization"
import { isEventPast, isEventToday } from "@/lib/event-dates"
import type { SubmissionModerationStatus } from "@/generated/prisma/client"

/** Mirrors MAX_PUBLIC_CONTRIBUTIONS in the contributions API route. */
const MAX_PUBLIC_CONTRIBUTIONS = 100

/** Questions counted toward the "X questions already in" counter — never FEATURED/REJECTED, and never the question bodies. */
const OPEN_SESSION_COUNTED_STATUSES: SubmissionModerationStatus[] = ["PENDING", "APPROVED"]

const PUBLIC_CONTRIBUTION_STATUSES: SubmissionModerationStatus[] = ["APPROVED", "FEATURED"]

// ─── View types ─────────────────────────────────────────────────────────────

export interface ConversationsFramingStat {
  line: string
  source: string
}

export interface ConversationsTableQuestion {
  key: string
  label: string
  description: string
}

export interface ConversationsSeedProblem {
  title: string
  statement: string
  questionKey: string
  buildWedge?: string
}

export interface ConversationsResultEntry {
  title: string
  statement: string
}

export interface ConversationsResult {
  winner: ConversationsResultEntry
  runnersUp: ConversationsResultEntry[]
  note?: string
  publishedAt: string
}

export interface ConversationsEventSummary {
  slug: string
  title: string
  date: string
  time: string
  venue: string
  city: string
  isPast: boolean
  isLiveToday: boolean
  result: ConversationsResult | null
}

export interface ConversationsContributionView {
  id: string
  questionKey: string
  body: string
  submitterName: string
  county: string
  featured: boolean
  createdAt: string
}

export interface ConversationsPageView {
  event: {
    slug: string
    title: string
    date: string
    time: string
    venue: string
    city: string
    lumaUrl?: string
  }
  heroHeadline: string
  heroSubline: string
  framingStats: ConversationsFramingStat[]
  tableQuestions: ConversationsTableQuestion[]
  seedProblems: ConversationsSeedProblem[]
  contributionsOpen: boolean
  result: ConversationsResult | null
  /** Approved/featured contributions, grouped by tableQuestions[].key. */
  contributionsByQuestionKey: Record<string, ConversationsContributionView[]>
  /**
   * Where the result banner's CTA points. The schema has no field naming
   * "the Impact Lab event" for a given Conversations page, so this defaults
   * to the soonest upcoming event (after this one) that has a lumaUrl set —
   * null omits the CTA rather than guessing wrong. Flagged to team-lead as a
   * spec gap; swap the query here if a more specific link is decided.
   */
  impactLabLumaUrl: string | null
}

export interface OpenQuestionSessionView {
  id: string
  title: string
  prompt: string
  /** Count only — question bodies are never returned to a public reader. */
  questionCount: number
}

// ─── Json field parsers ─────────────────────────────────────────────────────
// Defensive: these fields are admin-authored Json, not user input, but a
// malformed row should degrade to an empty section rather than 500 the page.

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null
}

function parseFramingStats(raw: unknown): ConversationsFramingStat[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(asRecord)
    .filter((s): s is Record<string, unknown> => s !== null && typeof s.line === "string")
    .map((s) => ({
      line: decodeHtmlEntities(String(s.line)),
      source: decodeHtmlEntities(String(s.source ?? "")),
    }))
}

function parseTableQuestions(raw: unknown): ConversationsTableQuestion[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(asRecord)
    .filter((q): q is Record<string, unknown> => q !== null && typeof q.key === "string")
    .map((q) => ({
      key: String(q.key),
      label: decodeHtmlEntities(String(q.label ?? "")),
      description: decodeHtmlEntities(String(q.description ?? "")),
    }))
}

function parseSeedProblems(raw: unknown): ConversationsSeedProblem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map(asRecord)
    .filter((p): p is Record<string, unknown> => p !== null && typeof p.title === "string")
    .map((p) => ({
      title: decodeHtmlEntities(String(p.title)),
      statement: decodeHtmlEntities(String(p.statement ?? "")),
      questionKey: String(p.questionKey ?? ""),
      buildWedge: typeof p.buildWedge === "string" ? decodeHtmlEntities(p.buildWedge) : undefined,
    }))
}

function parseResult(raw: unknown): ConversationsResult | null {
  const r = asRecord(raw)
  const winner = r ? asRecord(r.winner) : null
  if (!winner || typeof winner.title !== "string") return null
  const runnersUpRaw = Array.isArray(r!.runnersUp) ? (r!.runnersUp as unknown[]) : []
  return {
    winner: {
      title: decodeHtmlEntities(String(winner.title)),
      statement: decodeHtmlEntities(String(winner.statement ?? "")),
    },
    runnersUp: runnersUpRaw
      .map(asRecord)
      .filter((ru): ru is Record<string, unknown> => ru !== null && typeof ru.title === "string")
      .map((ru) => ({
        title: decodeHtmlEntities(String(ru.title)),
        statement: decodeHtmlEntities(String(ru.statement ?? "")),
      })),
    note: typeof r!.note === "string" ? decodeHtmlEntities(r!.note) : undefined,
    publishedAt: typeof r!.publishedAt === "string" ? r!.publishedAt : new Date().toISOString(),
  }
}

// ─── Fetchers ───────────────────────────────────────────────────────────────

/**
 * Every event with a ConversationsPage, upcoming (soonest first) then past
 * (most recent first) — the ordering the index page's two bands need.
 */
export async function getConversationsEvents(): Promise<ConversationsEventSummary[]> {
  const rows = await prisma.event.findMany({
    where: { conversationsPage: { isNot: null } },
    select: {
      slug: true,
      title: true,
      date: true,
      time: true,
      venue: true,
      city: true,
      conversationsPage: { select: { result: true } },
    },
  })

  const mapped: ConversationsEventSummary[] = rows.map((e) => ({
    slug: e.slug,
    title: decodeHtmlEntities(e.title),
    date: e.date.toISOString().split("T")[0],
    time: e.time,
    venue: decodeHtmlEntities(e.venue),
    city: e.city,
    isPast: isEventPast(e.date),
    isLiveToday: isEventToday(e.date),
    result: parseResult(e.conversationsPage?.result),
  }))

  const upcoming = mapped.filter((e) => !e.isPast).sort((a, b) => a.date.localeCompare(b.date))
  const past = mapped.filter((e) => e.isPast).sort((a, b) => b.date.localeCompare(a.date))
  return [...upcoming, ...past]
}

/**
 * Soonest event after `afterDate` that has a lumaUrl — the CTA fallback
 * documented on ConversationsPageView.impactLabLumaUrl. Only queried when a
 * result exists, since it's only used by the result banner.
 */
async function getFallbackImpactLabLumaUrl(afterDate: Date): Promise<string | null> {
  const candidate = await prisma.event.findFirst({
    where: { date: { gt: afterDate }, lumaUrl: { not: null } },
    orderBy: { date: "asc" },
    select: { lumaUrl: true },
  })
  return candidate?.lumaUrl ?? null
}

/**
 * The full live page for one Conversations event: config, contributions
 * grouped by question, and the result-banner CTA target. Null when the slug
 * doesn't exist or has no ConversationsPage attached.
 */
export async function getConversationsPageBySlug(
  slug: string
): Promise<ConversationsPageView | null> {
  const event = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      date: true,
      time: true,
      venue: true,
      city: true,
      lumaUrl: true,
      conversationsPage: true,
    },
  })
  if (!event || !event.conversationsPage) return null
  const page = event.conversationsPage

  const rows = await prisma.eventContribution.findMany({
    where: { eventId: event.id, status: { in: PUBLIC_CONTRIBUTION_STATUSES } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      questionKey: true,
      body: true,
      submitterName: true,
      county: true,
      status: true,
      createdAt: true,
    },
  })

  // FEATURED first, newest first within each tier — same rule the public
  // GET route applies. Grouping by questionKey afterward preserves that
  // relative order within each column.
  const featured = rows.filter((r) => r.status === "FEATURED")
  const approved = rows.filter((r) => r.status === "APPROVED")
  const ordered = [...featured, ...approved].slice(0, MAX_PUBLIC_CONTRIBUTIONS)

  const contributionsByQuestionKey: Record<string, ConversationsContributionView[]> = {}
  for (const r of ordered) {
    const view: ConversationsContributionView = {
      id: r.id,
      questionKey: r.questionKey,
      body: decodeHtmlEntities(r.body),
      submitterName: decodeHtmlEntities(r.submitterName),
      county: r.county,
      featured: r.status === "FEATURED",
      createdAt: r.createdAt.toISOString(),
    }
    ;(contributionsByQuestionKey[r.questionKey] ??= []).push(view)
  }

  const result = parseResult(page.result)
  const impactLabLumaUrl = result ? await getFallbackImpactLabLumaUrl(event.date) : null

  return {
    event: {
      slug: event.slug,
      title: decodeHtmlEntities(event.title),
      date: event.date.toISOString().split("T")[0],
      time: event.time,
      venue: decodeHtmlEntities(event.venue),
      city: event.city,
      lumaUrl: event.lumaUrl ?? undefined,
    },
    heroHeadline: decodeHtmlEntities(page.heroHeadline),
    heroSubline: decodeHtmlEntities(page.heroSubline),
    framingStats: parseFramingStats(page.framingStats),
    tableQuestions: parseTableQuestions(page.tableQuestions),
    seedProblems: parseSeedProblems(page.seedProblems),
    contributionsOpen: page.contributionsOpen,
    result,
    contributionsByQuestionKey,
    impactLabLumaUrl,
  }
}

/**
 * The open EventQuestionSession for an event, if any, with a count-only
 * tally of pending+approved questions for the "X questions already in"
 * line. Never selects question bodies — they're for the live session, not
 * a public wall.
 */
export async function getOpenQuestionSession(
  eventId: string
): Promise<OpenQuestionSessionView | null> {
  const session = await prisma.eventQuestionSession.findFirst({
    where: { eventId, isOpen: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      prompt: true,
      _count: {
        select: {
          questions: { where: { status: { in: OPEN_SESSION_COUNTED_STATUSES } } },
        },
      },
    },
  })
  if (!session) return null

  return {
    id: session.id,
    title: decodeHtmlEntities(session.title),
    prompt: decodeHtmlEntities(session.prompt),
    questionCount: session._count.questions,
  }
}
