import { ImageResponse } from "next/og"
import { CARD_DARK } from "@/lib/impact-lab/result-card"
import { findPublicRecap } from "@/lib/impact-lab/public-recap-store"
import { loadFonts } from "@/lib/impact-lab/og-fonts"

/**
 * The link-preview graphic for one cohort's public recap — same dark
 * premium palette as the result card's poster (`CARD_DARK`, see
 * `result-card.ts`), so a share of either page reads as the same event.
 *
 * Force-dynamic for the same reason the page is: the recap is computed from
 * the run's `resultsSnapshot` per request, and a post-publish correction
 * must reach the poster too, not just the page.
 */
export const dynamic = "force-dynamic"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Impact Lab results — Claude Community Kenya"

const DISPLAY = "Fraunces"
const SANS = "Inter"

export default async function Image({ params }: { params: Promise<{ cohort: string }> }) {
  const { cohort } = await params
  const [recap, fonts] = await Promise.all([
    findPublicRecap(cohort).catch(() => null),
    loadFonts([
      { name: DISPLAY, weight: 600 },
      { name: SANS, weight: 400 },
    ]),
  ])

  const eventName = recap?.event.name ?? "Impact Lab"
  const headline = recap?.champion?.projectName ?? "The results are in"
  const sub = recap
    ? `${recap.numbers.teamsFormed} teams · ${recap.numbers.projectsSubmitted} projects · ${recap.numbers.tracksCount} tracks`
    : "Claude Community Kenya"
  const displayFamily = fonts.some((f) => f.name === DISPLAY) ? DISPLAY : SANS

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
            textAlign: "center",
            background: CARD_DARK.card,
            border: `1px solid ${CARD_DARK.hairline}`,
            borderLeft: `6px solid ${CARD_DARK.orange}`,
            borderRadius: "28px",
            padding: "56px 64px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "22px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: CARD_DARK.orange,
            }}
          >
            {eventName}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: "24px",
              fontFamily: displayFamily,
              fontSize: headline.length > 26 ? "56px" : "84px",
              lineHeight: 1.1,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: CARD_DARK.text,
              maxWidth: "1000px",
            }}
          >
            {headline}
          </div>
          <div
            style={{ display: "flex", width: "72px", height: "4px", marginTop: "28px", background: CARD_DARK.orange }}
          />
          <div style={{ display: "flex", marginTop: "26px", fontSize: "24px", color: CARD_DARK.muted }}>{sub}</div>
          <div style={{ display: "flex", marginTop: "16px", fontSize: "20px", color: CARD_DARK.dim }}>
            claudekenya.org
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length > 0 ? fonts : undefined }
  )
}
