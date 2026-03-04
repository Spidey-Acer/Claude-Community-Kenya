/**
 * Data Access Layer — Claude Community Kenya
 *
 * Reads from the database when available (DATABASE_URL is set and db is seeded),
 * falls back to static data files when the database is unavailable.
 *
 * This enables a smooth migration path:
 * 1. Static data (current) — works with zero config
 * 2. Database-backed (future) — just set DATABASE_URL and run `npx prisma db seed`
 */

import { events as staticEvents, getUpcomingEvents as staticUpcoming, getEventBySlug as staticEventBySlug } from "@/data/events"
import { blogPosts as staticBlogPosts, getSortedBlogPosts as staticSortedPosts, getBlogPostBySlug as staticBlogBySlug } from "@/data/blog-posts"
import { projects as staticProjects, getFeaturedProjects as staticFeatured } from "@/data/projects"
import { team as staticTeam } from "@/data/team"
import type { Event } from "@/data/events"
import type { BlogPost } from "@/data/blog-posts"
import type { Project } from "@/data/projects"
import type { TeamMember } from "@/data/team"

const DB_AVAILABLE = !!process.env.DATABASE_URL

async function tryDb<T>(dbFn: () => Promise<T>, fallback: () => T): Promise<T> {
  if (!DB_AVAILABLE) return fallback()
  try {
    const { prisma } = await import("@/lib/prisma")
    // Quick connectivity check — if no rows exist, fall back to static
    const count = await prisma.event.count()
    if (count === 0) return fallback()
    return await dbFn()
  } catch {
    return fallback()
  }
}

// ─── Events ───

export async function getEvents(): Promise<Event[]> {
  return tryDb(
    async () => {
      const { prisma } = await import("@/lib/prisma")
      const rows = await prisma.event.findMany({ orderBy: { date: "desc" } })
      return rows.map(mapDbEvent)
    },
    () => staticEvents
  )
}

export async function getUpcomingEvents(): Promise<Event[]> {
  return tryDb(
    async () => {
      const { prisma } = await import("@/lib/prisma")
      const rows = await prisma.event.findMany({
        where: { status: { in: ["UPCOMING", "REGISTRATION_OPEN"] } },
        orderBy: { date: "asc" },
      })
      return rows.map(mapDbEvent)
    },
    () => staticUpcoming()
  )
}

export async function getEventBySlug(slug: string): Promise<Event | undefined> {
  return tryDb(
    async () => {
      const { prisma } = await import("@/lib/prisma")
      const row = await prisma.event.findUnique({ where: { slug } })
      return row ? mapDbEvent(row) : undefined
    },
    () => staticEventBySlug(slug)
  )
}

// ─── Blog ───

export async function getBlogPosts(): Promise<BlogPost[]> {
  return tryDb(
    async () => {
      const { prisma } = await import("@/lib/prisma")
      const rows = await prisma.blogPost.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
      })
      return rows.map(mapDbBlogPost)
    },
    () => staticSortedPosts()
  )
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
  return tryDb(
    async () => {
      const { prisma } = await import("@/lib/prisma")
      const row = await prisma.blogPost.findUnique({ where: { slug } })
      return row ? mapDbBlogPost(row) : undefined
    },
    () => staticBlogBySlug(slug)
  )
}

// ─── Projects ───

export async function getProjects(): Promise<Project[]> {
  return tryDb(
    async () => {
      const { prisma } = await import("@/lib/prisma")
      const rows = await prisma.project.findMany({ orderBy: { createdAt: "desc" } })
      return rows.map(mapDbProject)
    },
    () => staticProjects
  )
}

export async function getFeaturedProjects(): Promise<Project[]> {
  return tryDb(
    async () => {
      const { prisma } = await import("@/lib/prisma")
      const rows = await prisma.project.findMany({
        where: { featured: true },
        orderBy: { createdAt: "desc" },
      })
      return rows.map(mapDbProject)
    },
    () => staticFeatured()
  )
}

// ─── Team ───

export async function getTeam(): Promise<TeamMember[]> {
  return tryDb(
    async () => {
      const { prisma } = await import("@/lib/prisma")
      const rows = await prisma.teamMember.findMany({
        where: { active: true },
        orderBy: { order: "asc" },
      })
      return rows.map(mapDbTeamMember)
    },
    () => staticTeam
  )
}

// ─── Mappers (DB row → Static data shape) ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB rows are generic records
function mapDbEvent(row: Record<string, any>): Event {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    fullDescription: row.fullDescription || undefined,
    date: (row.date as Date).toISOString().split("T")[0],
    time: row.time,
    venue: row.venue,
    city: row.city,
    type: (row.type as string).toLowerCase().replace(/_/g, "-") as Event["type"],
    status: (row.status as string).toLowerCase().replace(/_/g, "-") as Event["status"],
    registrationUrl: row.registrationUrl || undefined,
    lumaUrl: row.lumaUrl || undefined,
    host: row.host || undefined,
    partnerOrg: row.partnerOrg || undefined,
    highlights: row.highlights || undefined,
    agenda: row.agenda || undefined,
    attendeeCount: row.attendeeCount || undefined,
    photosUrl: row.photosUrl || undefined,
    prizes: row.prizes || undefined,
    rules: row.rules || undefined,
  } satisfies Event
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbBlogPost(row: Record<string, any>): BlogPost {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    author: row.author,
    tags: row.tags || [],
    date: row.publishedAt ? (row.publishedAt as Date).toISOString().split("T")[0] : "",
    readingTime: row.readingTime ?? 5,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbProject(row: Record<string, any>): Project {
  return {
    id: row.id,
    name: row.name,
    builder: row.builder,
    description: row.description,
    stack: row.stack || [],
    status: row.status ? (row.status as string).toLowerCase().replace(/_/g, "-") as Project["status"] : null,
    demoUrl: row.demoUrl || undefined,
    repoUrl: row.repoUrl || undefined,
    featured: row.featured,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbTeamMember(row: Record<string, any>): TeamMember {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    bio: row.bio,
    linkedIn: row.linkedIn || undefined,
    github: row.github || undefined,
    twitter: row.twitter || undefined,
    website: row.website || undefined,
    avatar: row.avatar || undefined,
  }
}
