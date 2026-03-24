/**
 * Data Access Layer — fetches from Prisma DB and maps to component-compatible types.
 * Falls back to static data if DB is unavailable (development without DB).
 */

import { prisma } from "@/lib/prisma"
import type { Event } from "@/data/events"
import type {
  Event as PrismaEvent,
  BlogPost as PrismaBlogPost,
  Project as PrismaProject,
  TeamMember as PrismaTeamMember,
  CommunitySubmission as PrismaCommunitySubmission,
  CommunityComment as PrismaCommunityComment,
} from "@/generated/prisma/client"

// ─── Event Mappers ──────────────────────────────────────────────────────────

const EVENT_STATUS_MAP: Record<string, Event["status"]> = {
  UPCOMING: "upcoming",
  REGISTRATION_OPEN: "registration-open",
  COMPLETED: "completed",
  SOLD_OUT: "sold-out",
  CANCELLED: "completed", // fallback
}

const EVENT_TYPE_MAP: Record<string, Event["type"]> = {
  MEETUP: "meetup",
  WORKSHOP: "workshop",
  CAREER_TALK: "career-talk",
  HACKATHON: "hackathon",
  CONFERENCE: "meetup", // fallback
}

function mapPrismaEvent(e: PrismaEvent): Event {
  return {
    slug: e.slug,
    title: e.title,
    date: e.date.toISOString().split("T")[0],
    time: e.time,
    venue: e.venue,
    city: e.city,
    type: EVENT_TYPE_MAP[e.type] || "meetup",
    status: EVENT_STATUS_MAP[e.status] || "upcoming",
    description: e.description,
    fullDescription: e.fullDescription ?? undefined,
    agenda: (e.agenda as string[]) ?? undefined,
    registrationUrl: e.registrationUrl ?? undefined,
    lumaUrl: e.lumaUrl ?? undefined,
    host: e.host ?? undefined,
    partnerOrg: e.partnerOrg ?? undefined,
    highlights: (e.highlights as string[]) ?? undefined,
    attendeeCount: e.attendeeCount ?? undefined,
    posterUrl: e.posterUrl ?? undefined,
    photosUrl: e.photosUrl ?? undefined,
    prizes: (e.prizes as string[]) ?? undefined,
    rules: (e.rules as string[]) ?? undefined,
  }
}

// ─── Blog Post Types ────────────────────────────────────────────────────────

export interface BlogPostView {
  slug: string
  title: string
  date: string
  excerpt: string
  content: string
  author: string
  tags: string[]
  readingTime: number
  featured: boolean
  status: string
  views: number
}

function mapPrismaBlog(p: PrismaBlogPost): BlogPostView {
  return {
    slug: p.slug,
    title: p.title,
    date: p.publishedAt?.toISOString().split("T")[0] ?? "",
    excerpt: p.excerpt,
    content: p.content,
    author: p.author,
    tags: (p.tags as string[]) ?? [],
    readingTime: p.readingTime ?? 5,
    featured: p.featured,
    status: p.status,
    views: p.views,
  }
}

// ─── Project Types ──────────────────────────────────────────────────────────

export interface ProjectView {
  name: string
  builder: string
  description: string
  stack: string[]
  status: string
  demoUrl?: string
  repoUrl?: string
  featured: boolean
}

function mapPrismaProject(p: PrismaProject): ProjectView {
  return {
    name: p.name,
    builder: p.builder,
    description: p.description,
    stack: (p.stack as string[]) ?? [],
    status: p.status ?? "in-development",
    demoUrl: p.demoUrl ?? undefined,
    repoUrl: p.repoUrl ?? undefined,
    featured: p.featured,
  }
}

// ─── Team Member Types ──────────────────────────────────────────────────────

export interface TeamMemberView {
  name: string
  role: string
  bio: string
  linkedIn?: string
  github?: string
  twitter?: string
  website?: string
  avatar?: string
  active: boolean
}

function mapPrismaTeamMember(t: PrismaTeamMember): TeamMemberView {
  return {
    name: t.name,
    role: t.role,
    bio: t.bio,
    linkedIn: t.linkedIn ?? undefined,
    github: t.github ?? undefined,
    twitter: t.twitter ?? undefined,
    website: t.website ?? undefined,
    avatar: t.avatar ?? undefined,
    active: t.active,
  }
}

// ─── Data Fetchers ──────────────────────────────────────────────────────────

export async function getEvents(): Promise<Event[]> {
  const rows = await prisma.event.findMany({ orderBy: { date: "desc" } })
  return rows.map(mapPrismaEvent)
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  const row = await prisma.event.findUnique({ where: { slug } })
  return row ? mapPrismaEvent(row) : null
}

export async function getUpcomingEvents(): Promise<Event[]> {
  const rows = await prisma.event.findMany({
    where: { status: { in: ["UPCOMING", "REGISTRATION_OPEN"] } },
    orderBy: { date: "asc" },
  })
  return rows.map(mapPrismaEvent)
}

export async function getBlogPosts(): Promise<BlogPostView[]> {
  const rows = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  })
  return rows.map(mapPrismaBlog)
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPostView | null> {
  const row = await prisma.blogPost.findUnique({ where: { slug } })
  if (!row) return null
  // Increment view count (non-blocking)
  prisma.blogPost.update({ where: { slug }, data: { views: { increment: 1 } } }).catch(() => {})
  return mapPrismaBlog(row)
}

export async function getProjects(): Promise<ProjectView[]> {
  const rows = await prisma.project.findMany({ orderBy: { createdAt: "desc" } })
  return rows.map(mapPrismaProject)
}

export async function getFeaturedProjects(): Promise<ProjectView[]> {
  const rows = await prisma.project.findMany({
    where: { featured: true },
    orderBy: { createdAt: "desc" },
  })
  return rows.map(mapPrismaProject)
}

export async function getTeamMembers(): Promise<TeamMemberView[]> {
  const rows = await prisma.teamMember.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  })
  return rows.map(mapPrismaTeamMember)
}

export async function getDashboardStats() {
  const [eventCount, memberCount, projectCount] = await Promise.all([
    prisma.event.count(),
    prisma.joinApplication.count(),
    prisma.project.count(),
  ])
  const cities = await prisma.event.findMany({ select: { city: true }, distinct: ["city"] })
  return {
    events: eventCount,
    members: memberCount,
    projects: projectCount,
    cities: cities.length,
  }
}

// ─── Community Hub Types ───────────────────────────────────────────────────

export interface CommunitySubmissionView {
  id: string
  slug: string
  type: "MCP" | "PROMPT" | "WORKFLOW" | "TOOL"
  title: string
  shortDescription: string
  fullDescription: string
  url?: string
  repoUrl?: string
  installInstructions?: string
  tags: string[]
  submitterName?: string
  upvoteCount: number
  commentCount: number
  createdAt: string
}

export interface CommunityCommentView {
  id: string
  authorName: string
  content: string
  createdAt: string
}

function mapPrismaCommunitySubmission(
  s: PrismaCommunitySubmission & { _count?: { comments: number } }
): CommunitySubmissionView {
  return {
    id: s.id,
    slug: s.slug,
    type: s.type,
    title: s.title,
    shortDescription: s.shortDescription,
    fullDescription: s.fullDescription,
    url: s.url ?? undefined,
    repoUrl: s.repoUrl ?? undefined,
    installInstructions: s.installInstructions ?? undefined,
    tags: (s.tags as string[]) ?? [],
    submitterName: s.submitterName ?? undefined,
    upvoteCount: s.upvoteCount,
    commentCount: s._count?.comments ?? 0,
    createdAt: s.createdAt.toISOString(),
  }
}

function mapPrismaCommunityComment(c: PrismaCommunityComment): CommunityCommentView {
  return {
    id: c.id,
    authorName: c.authorName ?? "Anonymous",
    content: c.content,
    createdAt: c.createdAt.toISOString(),
  }
}

export async function getCommunitySubmissions(opts?: {
  type?: string
  sort?: "recent" | "popular"
  page?: number
  limit?: number
}): Promise<{ items: CommunitySubmissionView[]; total: number }> {
  const page = opts?.page ?? 1
  const limit = opts?.limit ?? 20
  const skip = (page - 1) * limit

  const where = {
    status: "APPROVED" as const,
    ...(opts?.type && { type: opts.type as PrismaCommunitySubmission["type"] }),
  }

  const orderBy = opts?.sort === "popular"
    ? { upvoteCount: "desc" as const }
    : { createdAt: "desc" as const }

  const [rows, total] = await Promise.all([
    prisma.communitySubmission.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { _count: { select: { comments: { where: { status: "APPROVED" } } } } },
    }),
    prisma.communitySubmission.count({ where }),
  ])

  return { items: rows.map(mapPrismaCommunitySubmission), total }
}

export async function getCommunitySubmissionBySlug(
  slug: string
): Promise<CommunitySubmissionView | null> {
  const row = await prisma.communitySubmission.findUnique({
    where: { slug },
    include: { _count: { select: { comments: { where: { status: "APPROVED" } } } } },
  })
  if (!row || row.status !== "APPROVED") return null
  return mapPrismaCommunitySubmission(row)
}

export async function getCommunityCommentsBySlug(
  slug: string
): Promise<CommunityCommentView[]> {
  const submission = await prisma.communitySubmission.findUnique({
    where: { slug },
    select: { id: true, status: true },
  })
  if (!submission || submission.status !== "APPROVED") return []

  const comments = await prisma.communityComment.findMany({
    where: { submissionId: submission.id, status: "APPROVED" },
    orderBy: { createdAt: "asc" },
  })
  return comments.map(mapPrismaCommunityComment)
}
