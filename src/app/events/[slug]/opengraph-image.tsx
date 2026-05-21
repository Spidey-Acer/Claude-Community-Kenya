import { ImageResponse } from "next/og";
import { getEventBySlug } from "@/lib/data";

// Default Node.js runtime — Prisma data fetch uses node:path which the edge
// runtime can't resolve. Node runtime still supports ImageResponse fine.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Claude Community Kenya — Event";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug).catch(() => null);

  if (!event) {
    return null;
  }

  const formattedDate = new Date(event.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return new ImageResponse(
    (
      <div
        style={{
          background: "#141413",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Subtle grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(217,119,87,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(217,119,87,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            display: "flex",
          }}
        />

        {/* Orange accent stripe at top */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: "linear-gradient(90deg, #d97757, #e8a882, #d97757)",
            display: "flex",
          }}
        />

        {/* Main content area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "72px 80px 64px",
            flex: 1,
          }}
        >
          {/* Eyebrow label */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "28px",
            }}
          >
            <div
              style={{
                background: "rgba(217,119,87,0.15)",
                border: "1px solid rgba(217,119,87,0.35)",
                borderRadius: "100px",
                padding: "6px 18px",
                color: "#d97757",
                fontSize: "14px",
                fontFamily: "system-ui, sans-serif",
                fontWeight: "600",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              ✦ EVENT
            </div>
          </div>

          {/* Event title */}
          <h1
            style={{
              color: "#faf9f5",
              fontSize: event.title.length > 60 ? "44px" : "56px",
              fontWeight: "600",
              margin: "0 0 24px",
              lineHeight: "1.15",
              letterSpacing: "-0.025em",
              maxWidth: "900px",
              fontFamily: "Georgia, serif",
              display: "flex",
            }}
          >
            {event.title}
          </h1>

          {/* Date + venue */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <p
              style={{
                color: "#b0aea5",
                fontSize: "22px",
                margin: 0,
                fontFamily: "system-ui, sans-serif",
                display: "flex",
              }}
            >
              {formattedDate}
            </p>
            <p
              style={{
                color: "#9a9890",
                fontSize: "18px",
                margin: 0,
                fontFamily: "system-ui, sans-serif",
                display: "flex",
              }}
            >
              {event.venue} · {event.city}, Kenya
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 80px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.2)",
          }}
        >
          <span
            style={{
              color: "#7a7870",
              fontSize: "16px",
              fontFamily: "system-ui, sans-serif",
              display: "flex",
            }}
          >
            claudekenya.org
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                color: "#d97757",
                fontSize: "16px",
                fontFamily: "system-ui, sans-serif",
                display: "flex",
              }}
            >
              ✦
            </span>
            <span
              style={{
                color: "#9a9890",
                fontSize: "16px",
                fontFamily: "system-ui, sans-serif",
                display: "flex",
              }}
            >
              Claude Community Kenya
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
