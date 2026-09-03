import { ImageResponse } from "next/og"
import { CARD_DARK, cardStyleForTitle, type CardStyle } from "@/lib/impact-lab/result-card"
import { findResultCardBySlug } from "@/lib/impact-lab/result-card-store"

/**
 * The LinkedIn post graphic for one team's result card. Same lookup as the
 * page, same four treatments — see `cardStyleForTitle` in `result-card.ts`,
 * the single source of the dark premium palette both files share. Literal
 * hex only: Satori cannot read CSS variables, and a Karibu theme token would
 * invert under the visitor's dark-mode preference anyway.
 *
 * Fraunces and Inter are fetched from Google Fonts at render time (Satori
 * ships only Noto Sans and cannot see system fonts), cached by the runtime,
 * and if the fetch fails the image still renders in the bundled sans rather
 * than failing a share. Default Node.js runtime: the lookup goes through
 * Prisma, which the edge runtime cannot load.
 */

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Impact Lab result — Claude Community Kenya"

const DISPLAY = "Fraunces"
const SANS = "Inter"

/** CSS `linear-gradient` for a `CardStyle`'s panel — 2 or 3 stops, top to bottom. */
function panelBackground(style: CardStyle): string {
  return `linear-gradient(to bottom, ${style.gradient.join(", ")})`
}

type LoadedFont = { name: string; data: ArrayBuffer; weight: 400 | 600; style: "normal" }

/**
 * Fraunces 600 and Inter 400 — the Karibu pairing. The stylesheet endpoint
 * serves TTF or WOFF (not WOFF2) to a browser that predates woff2, which is
 * what Satori can parse; both requests use `force-cache` so a warm function
 * reuses them. Any failure yields `[]` and the image renders in Satori's
 * bundled sans rather than failing a share.
 */
async function loadFonts(): Promise<LoadedFont[]> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=Inter:wght@400",
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0" },
        cache: "force-cache",
      }
    ).then((r) => r.text())

    const wanted: { name: string; weight: 400 | 600 }[] = [
      { name: DISPLAY, weight: 600 },
      { name: SANS, weight: 400 },
    ]
    const fonts = await Promise.all(
      wanted.map(async ({ name, weight }) => {
        const block = css.match(
          new RegExp(`font-family: '${name}';[^}]*?font-weight: ${weight};[^}]*?src:\\s*url\\(([^)]+\\.(?:ttf|woff))\\)`)
        )
        if (!block) return null
        const data = await fetch(block[1], { cache: "force-cache" }).then((r) => r.arrayBuffer())
        return { name, data, weight, style: "normal" as const }
      })
    )
    return fonts.filter((f): f is LoadedFont => f !== null)
  } catch {
    return []
  }
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [card, fonts] = await Promise.all([
    findResultCardBySlug(slug).catch(() => null),
    loadFonts(),
  ])

  // A valid page never gets a blank preview: an unknown slug renders the
  // generic "built" treatment rather than nothing.
  const isPodium = card ? card.title !== "Built" : false
  const style = cardStyleForTitle(card?.title ?? "Built")
  const fg = style.ink
  const muted = style.muted
  const eyebrowColor = CARD_DARK.orange
  // Podium: the placing is the headline and the project sits under it.
  // Built: the project is the headline — same hierarchy as the page.
  const eyebrow = card ? (isPodium ? card.track : `Built at ${card.eventName}`) : "Claude Community Kenya"
  const headline = card ? (isPodium ? card.title : card.projectName) : "Impact Lab"
  const sub = card ? (isPodium ? card.projectName : `${card.track} track`) : "Results"
  const eventLine = card
    ? `${card.eventName}${card.eventDates ? ` · ${card.eventDates}` : ""}`
    : "Nairobi"
  const members = card?.members.join(" · ") ?? ""
  const displayFamily = fonts.some((f) => f.name === DISPLAY) ? DISPLAY : SANS

  // The placement word ("Winner" / "Runner-up" / "Third place") must read as
  // one line on a 1200px poster no matter how it's cropped by a client:
  // ~120px for the five-letter "Winner", scaled down to ~96px for the two
  // longer titles so neither wraps or gets clipped.
  const headlineFontSize = !isPodium
    ? headline.length > 22
      ? "72px"
      : "118px"
    : style.kind === "winner"
      ? "120px"
      : "96px"

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: CARD_DARK.pageBg,
          padding: "36px",
          fontFamily: SANS,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            position: "relative",
            textAlign: "center",
            background: panelBackground(style),
            border: style.kind === "built" ? `1px solid ${CARD_DARK.hairline}` : "none",
            borderLeft: style.kind === "built" ? `6px solid ${CARD_DARK.orange}` : "none",
            borderRadius: "28px",
            padding: "56px 64px",
          }}
        >
          {style.kind === "winner" ? (
            <div
              style={{
                display: "flex",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: "#F3DFA0",
                borderRadius: "28px 28px 0 0",
              }}
            />
          ) : null}

          <div
            style={{
              display: "flex",
              fontSize: "22px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: eyebrowColor,
            }}
          >
            {eyebrow}
          </div>

          {style.pill ? (
            <div
              style={{
                display: "flex",
                marginTop: "20px",
                fontSize: "20px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: style.pill.color,
                border: `2px solid ${style.pill.color}`,
                borderRadius: "999px",
                padding: "8px 22px",
              }}
            >
              {style.pill.label}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              marginTop: "24px",
              fontFamily: displayFamily,
              fontSize: headlineFontSize,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: isPodium ? "-0.01em" : "-0.03em",
              whiteSpace: isPodium ? "nowrap" : "normal",
              color: fg,
            }}
          >
            {headline}
          </div>
          <div
            style={{
              display: "flex",
              width: "84px",
              height: "4px",
              marginTop: "28px",
              background: CARD_DARK.orange,
            }}
          />
          <div
            style={{
              display: "flex",
              marginTop: "26px",
              fontFamily: displayFamily,
              fontSize: sub.length > 40 ? "38px" : "50px",
              lineHeight: 1.15,
              fontWeight: 600,
              color: fg,
              maxWidth: "1000px",
            }}
          >
            {sub}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginTop: "40px" }}>
            {members ? (
              <div style={{ display: "flex", fontSize: "22px", color: muted }}>{members}</div>
            ) : null}
            <div style={{ display: "flex", fontSize: "22px", color: fg }}>{eventLine}</div>
          </div>
          <div style={{ display: "flex", marginTop: "16px", fontSize: "20px", color: muted }}>claudekenya.org</div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined }
  )
}
