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

export async function getEventSlugs(): Promise<string[]> {
  const rows = await prisma.event.findMany({ select: { slug: true } })
  return rows.map((r) => r.slug)
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

export async function getBlogSlugs(): Promise<string[]> {
  const rows = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  })
  return rows.map((r) => r.slug)
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
