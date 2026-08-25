import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { HOT_SCORE_SQL, type ShowcaseSort } from "@/lib/showcase/ranking"
import type { MediaDescriptor } from "@/lib/showcase/media"
import type { NeedKey } from "@/lib/showcase/constants"

export interface BuiltWith {
  models: string[]
  skills: string[]
  mcps: string[]
  tokensPerRun?: number
}

export interface ShowcasePostView {
  id: string
  slug: string
  title: string
  shortDescription: string
  fullDescription: string
  url: string | null
  repoUrl: string | null
  tags: string[]
  authorName: string | null
  coverImageUrl: string | null
  media: MediaDescriptor[]
  needs: NeedKey[]
  builtWith: BuiltWith | null
  eventName: string | null
  eventSlug: string | null
  upvoteCount: number
  commentCount: number
  reactionCounts: Record<string, number>
  createdAt: string
  lastActivityAt: string
}

/** Json columns are `unknown` at the type level; narrow them once, here. */
function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, number>
}

type Row = Prisma.CommunitySubmissionGetPayload<{
  include: {
    event: { select: { title: true; slug: true } }
    _count: { select: { comments: true } }
  }
}>

function mapRow(row: Row): ShowcasePostView {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.shortDescription,
    fullDescription: row.fullDescription,
    url: row.url,
    repoUrl: row.repoUrl,
    tags: asArray<string>(row.tags),
    authorName: row.submitterName,
    coverImageUrl: row.coverImageUrl,
    media: asArray<MediaDescriptor>(row.media),
    needs: asArray<NeedKey>(row.needs),
    builtWith: (row.builtWith as BuiltWith | null) ?? null,
    eventName: row.event?.title ?? null,
    eventSlug: row.event?.slug ?? null,
    upvoteCount: row.upvoteCount,
    commentCount: row._count.comments,
    reactionCounts: asCounts(row.reactionCounts),
    createdAt: row.createdAt.toISOString(),
    lastActivityAt: row.lastActivityAt.toISOString(),
  }
}

export async function getShowcasePosts(opts?: {
  sort?: ShowcaseSort
  eventId?: string
  need?: string
  page?: number
  limit?: number
}): Promise<{ items: ShowcasePostView[]; total: number }> {
  const page = opts?.page ?? 1
  const limit = opts?.limit ?? 20
  const skip = (page - 1) * limit
  const sort = opts?.sort ?? "hot"

  const where: Prisma.CommunitySubmissionWhereInput = {
    type: "SHOWCASE",
    status: "APPROVED",
    ...(opts?.eventId ? { eventId: opts.eventId } : {}),
    ...(opts?.need ? { needs: { array_contains: [opts.need] } } : {}),
    // "Needs help" means the poster actually asked for something. A row with
    // `needs: []` is not null but is not asking either, so both are excluded.
    ...(sort === "needs-help"
      ? { AND: [{ NOT: { needs: { equals: Prisma.DbNull } } }, { NOT: { needs: { equals: [] } } }] }
      : {}),
  }

  const include = {
    event: { select: { title: true, slug: true } },
    _count: { select: { comments: { where: { status: "APPROVED" as const } } } },
  }

  // "hot" needs an expression sort, which Prisma's orderBy cannot express, so
  // it resolves ids in raw SQL first and then hydrates through the normal
  // client — keeping one mapping path rather than hand-rolling row parsing.
  if (sort === "hot") {
    const eventFilter = opts?.eventId
      ? Prisma.sql`AND "eventId" = ${opts.eventId}`
      : Prisma.empty

    // Every filter in `where` has to be repeated here by hand. The raw query
    // and the count below must select the same set, or page 2 of a filtered
    // feed silently shows rows that page 1 was filtering out.
    const needFilter = opts?.need
      ? Prisma.sql`AND "needs" @> ${JSON.stringify([opts.need])}::jsonb`
      : Prisma.empty

    const ranked = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM community_submissions
      WHERE type = 'SHOWCASE' AND status = 'APPROVED' ${eventFilter} ${needFilter}
      ORDER BY ${HOT_SCORE_SQL} DESC
      LIMIT ${limit} OFFSET ${skip}
    `)

    const ids = ranked.map(r => r.id)
    if (ids.length === 0) {
      return { items: [], total: await prisma.communitySubmission.count({ where }) }
    }

    const [rows, total] = await Promise.all([
      prisma.communitySubmission.findMany({ where: { id: { in: ids } }, include }),
      prisma.communitySubmission.count({ where }),
    ])

    // findMany does not honour the `in` ordering, so restore the ranked order.
    const byId = new Map(rows.map(r => [r.id, r]))
    const items = ids
      .map(id => byId.get(id))
      .filter((r): r is Row => Boolean(r))
      .map(mapRow)

    return { items, total }
  }

  const orderBy: Prisma.CommunitySubmissionOrderByWithRelationInput =
    sort === "popular" ? { upvoteCount: "desc" } : { createdAt: "desc" }

  const [rows, total] = await Promise.all([
    prisma.communitySubmission.findMany({ where, orderBy, skip, take: limit, include }),
    prisma.communitySubmission.count({ where }),
  ])

  return { items: rows.map(mapRow), total }
}

export async function getShowcasePostBySlug(slug: string): Promise<ShowcasePostView | null> {
  const row = await prisma.communitySubmission.findUnique({
    where: { slug },
    include: {
      event: { select: { title: true, slug: true } },
      _count: { select: { comments: { where: { status: "APPROVED" } } } },
    },
  })
  if (!row || row.status !== "APPROVED" || row.type !== "SHOWCASE") return null
  return mapRow(row)
}
