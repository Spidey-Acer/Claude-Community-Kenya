/**
 * Data Access Layer — fetches from Prisma DB and maps to component-compatible types.
 * Falls back to static data if DB is unavailable (development without DB).
 */

import { prisma } from "@/lib/prisma"
import { decodeHtmlEntities } from "@/lib/input-sanitization"
import type { Event } from "@/lib/types"
import type {
  Event as PrismaEvent,
  BlogPost as PrismaBlogPost,
  Project as PrismaProject,
  TeamMember as PrismaTeamMember,
  DemoRequest as PrismaDemoRequest,
  CommunitySubmission as PrismaCommunitySubmission,
  CommunityComment as PrismaCommunityComment,
  NewsletterIssue as PrismaNewsletterIssue,
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
    id: e.id,
    slug: e.slug,
    title: decodeHtmlEntities(e.title),
    date: e.date.toISOString().split("T")[0],
    time: e.time,
    venue: decodeHtmlEntities(e.venue),
    city: e.city,
    type: EVENT_TYPE_MAP[e.type] || "meetup",
    status: EVENT_STATUS_MAP[e.status] || "upcoming",
    description: decodeHtmlEntities(e.description),
    fullDescription: e.fullDescription ? decodeHtmlEntities(e.fullDescription) : undefined,
    agenda: (e.agenda as string[]) ?? undefined,
    registrationUrl: e.registrationUrl ?? undefined,
    lumaUrl: e.lumaUrl ?? undefined,
    host: e.host ? decodeHtmlEntities(e.host) : undefined,
    partnerOrg: e.partnerOrg ? decodeHtmlEntities(e.partnerOrg) : undefined,
    highlights: ((e.highlights as string[]) ?? undefined)?.map(decodeHtmlEntities),
    attendeeCount: e.attendeeCount ?? undefined,
    capacity: e.capacity ?? undefined,
    posterUrl: e.posterUrl ?? undefined,
    photosUrl: e.photosUrl ?? undefined,
    recordingUrl: e.recordingUrl ?? undefined,
    slidesUrl: e.slidesUrl ?? undefined,
    prizes: (e.prizes as string[]) ?? undefined,
    rules: (e.rules as string[]) ?? undefined,
    audiences: (e.audiences as string[]) ?? [],
    intents: (e.intents as string[]) ?? [],
    featured: e.featured,
  }
}

// ─── Demo Request Types ─────────────────────────────────────────────────────

export interface DemoRequestView {
  id: string
  eventId: string
  name: string
  email: string
  projectTitle: string
  description: string
  estimatedTime: string
  demoUrl?: string
  repoUrl?: string
  status: string
  displayOrder?: number
  reviewedBy?: string
  reviewNotes?: string
  reviewedAt?: string
  createdAt: string
}

function mapPrismaDemoRequest(d: PrismaDemoRequest): DemoRequestView {
  return {
    id: d.id,
    eventId: d.eventId,
    name: d.name,
    email: d.email,
    projectTitle: d.projectTitle,
    description: d.description,
    estimatedTime: d.estimatedTime,
    demoUrl: d.demoUrl ?? undefined,
    repoUrl: d.repoUrl ?? undefined,
    status: d.status,
    displayOrder: d.displayOrder ?? undefined,
    reviewedBy: d.reviewedBy ?? undefined,
    reviewNotes: d.reviewNotes ?? undefined,
    reviewedAt: d.reviewedAt?.toISOString() ?? undefined,
    createdAt: d.createdAt.toISOString(),
  }
}

export async function getApprovedDemosByEventId(
  eventId: string
): Promise<DemoRequestView[]> {
  const rows = await prisma.demoRequest.findMany({
    where: { eventId, status: "APPROVED" },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
  })
  return rows.map(mapPrismaDemoRequest)
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
  /** Audience tags used by the recommendation engine. */
  audiences: string[]
  /** Intent tags used by the recommendation engine. */
  intents: string[]
}

function mapPrismaBlog(p: PrismaBlogPost): BlogPostView {
  return {
    slug: p.slug,
    title: decodeHtmlEntities(p.title),
    date: p.publishedAt?.toISOString().split("T")[0] ?? "",
    excerpt: decodeHtmlEntities(p.excerpt),
    content: decodeHtmlEntities(p.content),
    author: decodeHtmlEntities(p.author),
    tags: ((p.tags as string[]) ?? []).map(decodeHtmlEntities),
    readingTime: p.readingTime ?? 5,
    featured: p.featured,
    status: p.status,
    views: p.views,
    audiences: (p.audiences as string[]) ?? [],
    intents: (p.intents as string[]) ?? [],
  }
}

// ─── Project Types ──────────────────────────────────────────────────────────

export interface ProjectView {
  id: string
  name: string
  builder: string
  description: string
  stack: string[]
  status: string
  demoUrl?: string
  repoUrl?: string
  featured: boolean
  potwAt?: string
}

function mapPrismaProject(p: PrismaProject): ProjectView {
  return {
    id: p.id,
    name: p.name,
    builder: p.builder,
    description: p.description,
    stack: (p.stack as string[]) ?? [],
    status: p.status ?? "in-development",
    demoUrl: p.demoUrl ?? undefined,
    repoUrl: p.repoUrl ?? undefined,
    featured: p.featured,
    potwAt: p.potwAt?.toISOString() ?? undefined,
  }
}

// ─── Team Member Types ──────────────────────────────────────────────────────

export interface TeamMemberView {
  slug?: string
  name: string
  role: string
  tagline?: string
  location?: string
  bio: string
  longBio?: string
  linkedIn?: string
  github?: string
  twitter?: string
  website?: string
  avatar?: string
  active: boolean
  featured: boolean
}

function mapPrismaTeamMember(t: PrismaTeamMember): TeamMemberView {
  return {
    slug: t.slug ?? undefined,
    name: t.name,
    role: t.role,
    tagline: t.tagline ?? undefined,
    location: t.location ?? undefined,
    bio: t.bio,
    longBio: t.longBio ?? undefined,
    linkedIn: t.linkedIn ?? undefined,
    github: t.github ?? undefined,
    twitter: t.twitter ?? undefined,
    website: t.website ?? undefined,
    avatar: t.avatar ?? undefined,
    active: t.active,
    featured: t.featured,
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

/** East Africa Time is UTC+3 year-round — no DST to account for. */
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000

/**
 * The instant of midnight-today in Nairobi, as a UTC Date.
 *
 * Events store `date` as the day (time lives in the separate `time` string),
 * so comparing against `now` would drop a same-day event the moment the clock
 * passed its stored midnight — the site would stop advertising tonight's
 * meetup on the morning of the meetup. Start-of-day keeps it listed until the
 * day is genuinely over.
 */
function startOfTodayEAT(): Date {
  const eatNow = new Date(Date.now() + EAT_OFFSET_MS)
  return new Date(
    Date.UTC(eatNow.getUTCFullYear(), eatNow.getUTCMonth(), eatNow.getUTCDate()) -
      EAT_OFFSET_MS,
  )
}

export async function getUpcomingEvents(): Promise<Event[]> {
  // Status alone is not enough: it is set by hand in admin, so a finished event
  // left as UPCOMING advertises itself forever. Date is the fact that cannot be
  // forgotten to update.
  const rows = await prisma.event.findMany({
    where: {
      status: { in: ["UPCOMING", "REGISTRATION_OPEN"] },
      date: { gte: startOfTodayEAT() },
    },
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
  const rows = await prisma.project.findMany({
    where: { featured: true },
    orderBy: { createdAt: "desc" },
  })
  return rows.map(mapPrismaProject)
}

export async function getFeaturedProjects(): Promise<ProjectView[]> {
  const rows = await prisma.project.findMany({
    where: { featured: true },
    orderBy: { createdAt: "desc" },
  })
  return rows.map(mapPrismaProject)
}

/**
 * Returns the most recent Project of the Week, or null if none has been set.
 * The current POTW is whichever project has the latest non-null `potwAt` date.
 */
export async function getProjectOfTheWeek(): Promise<ProjectView | null> {
  const row = await prisma.project.findFirst({
    where: { potwAt: { not: null } },
    orderBy: { potwAt: "desc" },
  })
  return row ? mapPrismaProject(row) : null
}

// ─── Gallery ────────────────────────────────────────────────────────────────

export interface PhotoView {
  id: string
  url: string
  thumbnailUrl: string | null
  alt: string | null
  caption: string | null
  photographer: string | null
  featured: boolean
  takenAt: Date | null
  event: { slug: string; title: string; date: Date; city: string } | null
}

interface GetGalleryOptions {
  limit?: number
  eventSlug?: string
  featuredOnly?: boolean
}

/**
 * Fetches photos for the gallery aggregator.
 * Optionally filters by event slug or featured-only.
 */
export async function getGalleryPhotos(
  options: GetGalleryOptions = {},
): Promise<PhotoView[]> {
  const { limit, eventSlug, featuredOnly } = options
  const rows = await prisma.meetupPhoto.findMany({
    where: {
      ...(eventSlug ? { event: { slug: eventSlug } } : {}),
      ...(featuredOnly ? { featured: true } : {}),
    },
    include: {
      event: {
        select: { slug: true, title: true, date: true, city: true },
      },
    },
    orderBy: [{ featured: "desc" }, { order: "asc" }, { takenAt: "desc" }, { createdAt: "desc" }],
    ...(limit ? { take: limit } : {}),
  })

  return rows.map((p) => ({
    id: p.id,
    url: p.url,
    thumbnailUrl: p.thumbnailUrl,
    alt: p.alt,
    caption: p.caption,
    photographer: p.photographer,
    featured: p.featured,
    takenAt: p.takenAt,
    event: p.event
      ? {
          slug: p.event.slug,
          title: p.event.title,
          date: p.event.date,
          city: p.event.city,
        }
      : null,
  }))
}

/**
 * Fetches all photos for a single event, ordered for the album view.
 */
export async function getEventPhotos(slug: string): Promise<PhotoView[]> {
  return getGalleryPhotos({ eventSlug: slug })
}

/**
 * Returns the list of events that currently have photos, so the gallery
 * page can render filter chips without an extra round-trip.
 */
export async function getEventsWithPhotos(): Promise<
  Array<{ slug: string; title: string; date: Date; city: string; count: number }>
> {
  const groups = await prisma.meetupPhoto.groupBy({
    by: ["eventId"],
    _count: { _all: true },
    where: { eventId: { not: null } },
  })
  if (groups.length === 0) return []
  const eventIds = groups.map((g) => g.eventId!).filter(Boolean)
  const events = await prisma.event.findMany({
    where: { id: { in: eventIds } },
    select: { id: true, slug: true, title: true, date: true, city: true },
  })
  const countByEvent = new Map(groups.map((g) => [g.eventId!, g._count._all]))
  return events
    .map((e) => ({
      slug: e.slug,
      title: e.title,
      date: e.date,
      city: e.city,
      count: countByEvent.get(e.id) ?? 0,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
}

export async function getTeamMembers(): Promise<TeamMemberView[]> {
  const rows = await prisma.teamMember.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { order: "asc" }, { name: "asc" }],
  })
  return rows.map(mapPrismaTeamMember)
}

/**
 * Fetch a single active team member by slug for the /team/[slug] page.
 * Returns null if the slug is unknown or the member is inactive.
 */
export async function getTeamMemberBySlug(
  slug: string,
): Promise<TeamMemberView | null> {
  const row = await prisma.teamMember.findFirst({
    where: { slug, active: true },
  })
  return row ? mapPrismaTeamMember(row) : null
}

/**
 * All active slugs — used by /team/[slug] generateStaticParams + sitemap.
 */
export async function getTeamMemberSlugs(): Promise<string[]> {
  const rows = await prisma.teamMember.findMany({
    where: { active: true, slug: { not: null } },
    select: { slug: true },
  })
  return rows.map((r) => r.slug!).filter(Boolean)
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
    title: decodeHtmlEntities(s.title),
    shortDescription: decodeHtmlEntities(s.shortDescription),
    fullDescription: decodeHtmlEntities(s.fullDescription),
    url: s.url ?? undefined,
    repoUrl: s.repoUrl ?? undefined,
    installInstructions: s.installInstructions ? decodeHtmlEntities(s.installInstructions) : undefined,
    tags: ((s.tags as string[]) ?? []).map(decodeHtmlEntities),
    submitterName: s.submitterName ? decodeHtmlEntities(s.submitterName) : undefined,
    upvoteCount: s.upvoteCount,
    commentCount: s._count?.comments ?? 0,
    createdAt: s.createdAt.toISOString(),
  }
}

function mapPrismaCommunityComment(c: PrismaCommunityComment): CommunityCommentView {
  return {
    id: c.id,
    authorName: c.authorName ? decodeHtmlEntities(c.authorName) : "Anonymous",
    content: decodeHtmlEntities(c.content),
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

// ─── Newsletter Issues ─────────────────────────────────────────────────────

export interface NewsletterIssueView {
  id: string
  slug: string
  number: number
  title: string
  subject: string
  excerpt: string
  body: string
  publishedAt: string
}

function mapPrismaNewsletterIssue(n: PrismaNewsletterIssue): NewsletterIssueView {
  return {
    id: n.id,
    slug: n.slug,
    number: n.number,
    title: decodeHtmlEntities(n.title),
    subject: decodeHtmlEntities(n.subject),
    excerpt: decodeHtmlEntities(n.excerpt),
    body: decodeHtmlEntities(n.body),
    publishedAt: n.publishedAt.toISOString(),
  }
}

/**
 * Returns all published newsletter issues, newest first.
 */
export async function getNewsletterIssues(): Promise<NewsletterIssueView[]> {
  const rows = await prisma.newsletterIssue.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  })
  return rows.map(mapPrismaNewsletterIssue)
}

/**
 * Returns a single published newsletter issue by slug.
 */
export async function getNewsletterIssueBySlug(
  slug: string
): Promise<NewsletterIssueView | null> {
  const row = await prisma.newsletterIssue.findUnique({ where: { slug } })
  if (!row || row.status !== "PUBLISHED") return null
  return mapPrismaNewsletterIssue(row)
}
