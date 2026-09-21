import { ImageResponse } from "next/og"
import type { ReactNode } from "react"
import { CARD_SANS, CARD_SERIF, loadCardAssets, type MarkVariant } from "./card-assets"
import {
  CARD_BRONZE,
  CARD_GOLD,
  CARD_GRAPHITE,
  CARD_POSTER,
  cardMembersLine,
  cardPlacingLine,
  cardStyleForTitle,
  cardSubline,
  type PublicResultCard,
} from "./result-card"

/**
 * The Build Day share card — one Satori tree, four surfaces, four sizes.
 *
 * A sibling of the poster the event was promoted with: the "CLAUDE
 * COMMUNITY" arc and hand icon on top (pre-rendered, see `card-assets.ts`),
 * the project name in the kit serif where the poster says "Nairobi", the
 * placing in the kit sans caps where it says "BUILD DAY", then the event
 * line, the members and the site. Every route that serves a PNG of a team's
 * card — the three downloads, the OG preview and the admin preview — calls
 * `renderCard`, so the card a team downloads is the card the page shows is
 * the card LinkedIn unfurls.
 *
 * Surface by placing (`cardStyleForTitle(card.title).kind`):
 *   built      flat clay, serif ink, sans paper, the poster's own colours
 *   winner     `CARD_GOLD`, ink text (the champion is a winner too)
 *   runner-up  `CARD_GRAPHITE`, paper text, thin silver rule under the placing
 *   third      `CARD_BRONZE`, paper text (copper-red so it never reads as gold)
 *
 * Satori rules, all of which this file obeys: inline styles only, no CSS
 * variables, `display: flex` on every element with children, text set by
 * character-count bands (Satori cannot measure and shrink), images as data
 * URIs. Nothing here reads a score — `PublicResultCard` has none.
 */

export type CardSize = "square" | "portrait" | "story" | "og"

export const CARD_SIZES: Record<CardSize, { width: number; height: number }> = {
  square: { width: 1080, height: 1080 },
  portrait: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
}

/** Everything a surface decides: field, text colours, which mark, the rule. */
interface Surface {
  background: string
  /** The serif project name. */
  serif: string
  /** The sans lines (placing, event, members, site). */
  sans: string
  mark: MarkVariant
  /** Colour of the rule under the placing line, or `null` for none. */
  rule: string | null
}

function surfaceFor(card: PublicResultCard): Surface {
  const kind = cardStyleForTitle(card.title).kind
  if (kind === "winner") {
    return {
      background: `linear-gradient(165deg, ${CARD_GOLD.from}, ${CARD_GOLD.mid}, ${CARD_GOLD.to})`,
      serif: CARD_POSTER.ink,
      sans: CARD_POSTER.ink,
      mark: "ink",
      rule: null,
    }
  }
  if (kind === "runner-up") {
    return {
      background: `linear-gradient(180deg, ${CARD_GRAPHITE.from}, ${CARD_GRAPHITE.to})`,
      serif: CARD_POSTER.paper,
      sans: CARD_POSTER.paper,
      mark: "paper",
      rule: CARD_GRAPHITE.silver,
    }
  }
  if (kind === "third") {
    return {
      background: `linear-gradient(180deg, ${CARD_BRONZE.from}, ${CARD_BRONZE.to})`,
      serif: CARD_POSTER.paper,
      sans: CARD_POSTER.paper,
      mark: "paper",
      rule: null,
    }
  }
  return {
    background: CARD_POSTER.clay,
    serif: CARD_POSTER.ink,
    sans: CARD_POSTER.paper,
    mark: "poster",
    rule: null,
  }
}

// ─── Type scale ──────────────────────────────────────────────────────────────

/**
 * Serif size for the project name on a 1080-wide card, by character count.
 * Bands, not measurement: Satori has no `fit`. Up to 18 characters stays on
 * one line ("Socratic Workspace" at 110px spans ~950 of the 960 available);
 * past that the name may wrap once, at a size where two lines still sit
 * where the poster's "Nairobi" sits.
 */
function projectNameSize(name: string): { fontSize: number; wrap: boolean } {
  const n = name.trim().length
  if (n <= 7) return { fontSize: 190, wrap: false }
  if (n <= 10) return { fontSize: 168, wrap: false }
  if (n <= 14) return { fontSize: 124, wrap: false }
  if (n <= 18) return { fontSize: 106, wrap: false }
  return { fontSize: 88, wrap: true }
}

/**
 * The same idea for the OG's ~630px text column: shorter names stay on one
 * line, anything longer wraps (the column is too narrow to shrink further
 * and still read at LinkedIn thumbnail size).
 */
function ogProjectNameSize(name: string): { fontSize: number; wrap: boolean } {
  const n = name.trim().length
  if (n <= 7) return { fontSize: 128, wrap: false }
  if (n <= 10) return { fontSize: 104, wrap: false }
  if (n <= 14) return { fontSize: 80, wrap: false }
  return { fontSize: 68, wrap: true }
}

/** Sans caps size for the placing line: "CHAMPION" large, "RUNNER-UP IN BREAKTHROUGH" small. */
function placingSize(line: string): number {
  const n = line.length
  if (n <= 10) return 68
  if (n <= 16) return 58
  if (n <= 22) return 48
  return 40
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

interface Pieces {
  mark: (width: number) => ReactNode
  project: (scale: number) => ReactNode
  placing: (scale: number) => ReactNode
  event: (scale: number) => ReactNode
  members: (scale: number) => ReactNode
  site: (scale: number) => ReactNode
}

/**
 * `align` is "center" for the stacked cards and "start" for the OG's
 * left-hand text column; `project` is the name's size band, chosen by the
 * layout because the OG column is narrower than a 1080 card.
 */
function pieces(
  card: PublicResultCard,
  surface: Surface,
  markSrc: string,
  markSize: { width: number; height: number },
  align: "center" | "start",
  project: { fontSize: number; wrap: boolean }
): Pieces {
  const placingLine = cardPlacingLine(card)
  const subline = cardSubline(card)
  const membersLine = cardMembersLine(card.members)
  const alignItems = align === "center" ? "center" : "flex-start"
  const justifyContent = align === "center" ? "center" : "flex-start"
  const textAlign = align === "center" ? ("center" as const) : ("left" as const)

  return {
    mark: (width) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={markSrc}
        width={width}
        height={Math.round((width * markSize.height) / markSize.width)}
        alt=""
        style={{ display: "flex" }}
      />
    ),
    project: (scale) => (
      <div
        style={{
          display: "flex",
          justifyContent,
          width: "100%",
          fontFamily: CARD_SERIF,
          fontWeight: 300,
          fontSize: project.fontSize * scale,
          // Not 1: a lowercase descender ("prism") at 190px reaches ~0.2em
          // below the baseline and ran into the placing line.
          lineHeight: 1.15,
          // Never let yoga squash this box when a column runs long — that
          // shows up as the name printed over the placing line, not as an
          // overflow anyone notices.
          flexShrink: 0,
          letterSpacing: "-0.01em",
          color: surface.serif,
          textAlign,
          whiteSpace: project.wrap ? "normal" : "nowrap",
        }}
      >
        {card.projectName}
      </div>
    ),
    placing: (scale) => (
      <div style={{ display: "flex", flexDirection: "column", alignItems, gap: 18 * scale, flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            fontFamily: CARD_SANS,
            fontWeight: 600,
            fontSize: placingSize(placingLine) * scale,
            lineHeight: 1,
            letterSpacing: "0.04em",
            color: surface.sans,
            whiteSpace: "nowrap",
          }}
        >
          {placingLine}
        </div>
        {subline ? (
          <div
            style={{
              display: "flex",
              fontFamily: CARD_SANS,
              fontWeight: 600,
              fontSize: 30 * scale,
              lineHeight: 1.1,
              color: surface.sans,
              opacity: 0.88,
              whiteSpace: "nowrap",
            }}
          >
            {subline}
          </div>
        ) : null}
        {surface.rule ? (
          <div style={{ display: "flex", width: 120 * scale, height: Math.max(2, Math.round(2 * scale)), background: surface.rule }} />
        ) : null}
      </div>
    ),
    event: (scale) => (
      <div style={{ display: "flex", flexDirection: "column", alignItems, gap: 10 * scale }}>
        <div
          style={{
            display: "flex",
            fontFamily: CARD_SANS,
            fontWeight: 600,
            fontSize: 40 * scale,
            lineHeight: 1.1,
            color: surface.sans,
            whiteSpace: "nowrap",
          }}
        >
          {card.eventName}
        </div>
        {card.eventDates ? (
          <div
            style={{
              display: "flex",
              fontFamily: CARD_SANS,
              fontWeight: 600,
              fontSize: 32 * scale,
              lineHeight: 1.1,
              color: surface.sans,
              whiteSpace: "nowrap",
            }}
          >
            {card.eventDates}
          </div>
        ) : null}
      </div>
    ),
    members: (scale) =>
      membersLine ? (
        <div
          style={{
            display: "flex",
            justifyContent,
            width: "100%",
            fontFamily: CARD_SANS,
            fontWeight: 600,
            fontSize: 26 * scale,
            lineHeight: 1.35,
            color: surface.sans,
            opacity: 0.88,
            textAlign,
          }}
        >
          {membersLine}
        </div>
      ) : null,
    site: (scale) => (
      <div
        style={{
          display: "flex",
          fontFamily: CARD_SANS,
          fontWeight: 600,
          fontSize: 24 * scale,
          lineHeight: 1,
          letterSpacing: "0.02em",
          color: surface.sans,
          opacity: 0.88,
        }}
      >
        claudekenya.org
      </div>
    ),
  }
}

// ─── Layouts ─────────────────────────────────────────────────────────────────

const column = (gap: number, extra: Record<string, string | number> = {}) => ({
  display: "flex" as const,
  flexDirection: "column" as const,
  alignItems: "center" as const,
  gap,
  ...extra,
})

/**
 * Square and portrait: one centred column in the poster's order. The gaps
 * are fixed rather than distributed so the name sits where "Nairobi" sits
 * and the event line where the date line sits, whatever the name's length.
 */
function stackedLayout(p: Pieces, size: { width: number; height: number }, surface: Surface) {
  const tall = size.height > size.width
  // The square's budget is tight once a card carries a subline: 840px mark
  // (358 high) + 190px name + placing + subline + event + members + site
  // fits the 1000px inside the padding with these gaps and nothing to spare.
  const g = tall ? { mark: 56, placing: 30, event: 84, members: 34, site: 48 } : { mark: 32, placing: 20, event: 48, members: 24, site: 28 }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: surface.background,
        padding: "40px 60px",
      }}
    >
      {p.mark(tall ? 960 : 840)}
      <div style={{ display: "flex", height: g.mark }} />
      {p.project(1)}
      <div style={{ display: "flex", height: g.placing }} />
      {p.placing(1)}
      <div style={{ display: "flex", height: g.event }} />
      {p.event(1)}
      <div style={{ display: "flex", height: g.members }} />
      {p.members(1)}
      <div style={{ display: "flex", height: g.site }} />
      {p.site(1)}
    </div>
  )
}

/**
 * Story: the card block centred in the tall frame, the event line at the
 * foot. Both stay clear of the top and bottom ~250px that Instagram's and
 * WhatsApp's own chrome covers.
 */
function storyLayout(p: Pieces, surface: Surface) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100%",
        background: surface.background,
        padding: "220px 60px 240px",
      }}
    >
      <div style={{ display: "flex", flexGrow: 1, alignItems: "center", justifyContent: "center", width: "100%" }}>
        <div style={column(0)}>
          {p.mark(930)}
          <div style={{ display: "flex", height: 60 }} />
          {p.project(1)}
          <div style={{ display: "flex", height: 30 }} />
          {p.placing(1)}
          <div style={{ display: "flex", height: 56 }} />
          {p.members(1)}
        </div>
      </div>
      <div style={column(28)}>
        {p.event(1)}
        {p.site(1)}
      </div>
    </div>
  )
}

/**
 * OG (1200x630): a landscape crop of the same card. The mark sits left, the
 * words right, on the same surface. The placing and the project name are
 * the two largest things on it so a LinkedIn thumbnail still says who won.
 */
function ogLayout(p: Pieces, surface: Surface) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        height: "100%",
        background: surface.background,
        padding: "48px 64px",
        gap: 44,
      }}
    >
      <div style={{ display: "flex", flexShrink: 0 }}>{p.mark(400)}</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          width: 628,
        }}
      >
        {p.placing(0.62)}
        <div style={{ display: "flex", height: 18 }} />
        {p.project(1)}
        <div style={{ display: "flex", height: 30 }} />
        {p.event(0.72)}
        <div style={{ display: "flex", height: 18 }} />
        {p.members(0.8)}
        <div style={{ display: "flex", height: 16 }} />
        {p.site(0.8)}
      </div>
    </div>
  )
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/** The PNG of one team's card at one size. Throws if the assets cannot be read. */
export async function renderCard(card: PublicResultCard, size: CardSize): Promise<ImageResponse> {
  const assets = await loadCardAssets()
  const surface = surfaceFor(card)
  const dims = CARD_SIZES[size]
  const p =
    size === "og"
      ? pieces(card, surface, assets.marks[surface.mark], assets.markSize, "start", ogProjectNameSize(card.projectName))
      : pieces(card, surface, assets.marks[surface.mark], assets.markSize, "center", projectNameSize(card.projectName))

  const tree =
    size === "og" ? ogLayout(p, surface) : size === "story" ? storyLayout(p, surface) : stackedLayout(p, dims, surface)

  return new ImageResponse(tree, { ...dims, fonts: assets.fonts })
}

/** "socratic-workspace-square" style filename stem for the download routes. */
export function cardFileName(card: PublicResultCard, size: CardSize): string {
  const stem =
    card.projectName
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "result"
  return `${stem}-${size}.png`
}
