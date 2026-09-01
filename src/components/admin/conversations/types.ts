// Shared client-side shapes for the Conversations Live admin components.
// Mirrors the JSON the admin API routes return — see
// src/lib/conversations/schemas.ts for the server-side zod source of truth.

export interface FramingStat {
  line: string
  source: string
}

export interface TableQuestion {
  key: string
  label: string
  description: string
}

export interface SeedProblem {
  title: string
  statement: string
  questionKey: string
  buildWedge?: string
}

export interface ResultEntry {
  title: string
  statement: string
}

export interface ConversationsResult {
  winner: ResultEntry
  runnersUp: ResultEntry[]
  note?: string
  publishedAt: string
}

export interface ConversationsPageData {
  id: string
  heroHeadline: string
  heroSubline: string
  framingStats: unknown
  tableQuestions: unknown
  seedProblems: unknown
  contributionsOpen: boolean
  result: ConversationsResult | null
}

export interface QuestionSessionData {
  id: string
  title: string
  prompt: string
  isOpen: boolean
  createdAt: string
  counts: { pending: number; approved: number; rejected: number }
}
