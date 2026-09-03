import { ImageResponse } from "next/og"
import { findResultCardBySlug } from "@/lib/impact-lab/result-card-store"

/**
 * The LinkedIn post graphic for one team's result card. Same lookup as the
 * page, same three facts: placing, project, event. Karibu palette by value —
 * Satori cannot read CSS variables.
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

const PAPER = "#F4EEE3"
const CARD = "#FBF7F0"
const INK = "#23201B"
const INK_MUTED = "#6A6155"
const CLAY = "#A84E2D"
const SAND = "#E4DAC8"
const PANEL_DARK = "#23201B"
const ON_PANEL_DARK = "#E9E0D2"
const ON_PANEL_DARK_MUTED = "#B4A997"

const DISPLAY = "Fraunces"
const SANS = "Inter"

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
  // generic event card rather than nothing.
  const isPodium = card ? card.title !== "Built" : false
  const isWinner = card?.title === "Winner"
  const panelBg = isWinner ? CLAY : isPodium ? PANEL_DARK : CARD
  const fg = isWinner ? CARD : isPodium ? ON_PANEL_DARK : INK
  const muted = isWinner ? "#F8E4DA" : isPodium ? ON_PANEL_DARK_MUTED : INK_MUTED
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

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: PAPER,
          padding: "44px",
          fontFamily: SANS,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            background: panelBg,
            border: isPodium ? "none" : `2px solid ${SAND}`,
            borderRadius: "28px",
            padding: "56px 64px 48px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: "22px",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: muted,
              }}
            >
              {eyebrow}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: "18px",
                fontFamily: displayFamily,
                fontSize: headline.length > 22 ? "72px" : "118px",
                lineHeight: 1,
                fontWeight: 600,
                letterSpacing: "-0.03em",
                color: fg,
              }}
            >
              {headline}
            </div>
            <div
              style={{
                display: "flex",
                width: "72px",
                height: "4px",
                marginTop: "30px",
                background: isPodium ? muted : CLAY,
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
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "820px" }}>
              {members ? (
                <div style={{ display: "flex", fontSize: "22px", color: muted }}>{members}</div>
              ) : null}
              <div style={{ display: "flex", fontSize: "22px", color: fg }}>{eventLine}</div>
            </div>
            <div style={{ display: "flex", fontSize: "22px", color: muted }}>claudekenya.org</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined }
  )
}
