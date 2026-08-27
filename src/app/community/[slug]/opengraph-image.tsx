import { ImageResponse } from "next/og";
import { getCommunitySubmissionBySlug } from "@/lib/data";

// Default Node.js runtime — Prisma data fetch uses node:path which the edge
// runtime can't resolve. Node runtime still supports ImageResponse fine.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Claude Community Kenya — Tools & Prompts";

/** Badge color per submission type */
function typeBadgeColor(type: string): string {
  switch (type) {
    case "MCP":
      return "#6a9bcc";
    case "PROMPT":
      return "#9b8fcc";
    case "WORKFLOW":
      return "#5cb88a";
    case "TOOL":
    default:
      return "#d97757";
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const submission = await getCommunitySubmissionBySlug(slug).catch(() => null);

  if (!submission) {
    return null;
  }

  const badgeColor = typeBadgeColor(submission.type);
  const displayDesc =
    submission.shortDescription.length > 140
      ? submission.shortDescription.slice(0, 137) + "…"
      : submission.shortDescription;

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
            padding: "72px 80px 56px",
            flex: 1,
          }}
        >
          {/* Eyebrow: type badge + "Tools & Prompts" */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "28px",
            }}
          >
            {/* Type badge */}
            <div
              style={{
                background: `${badgeColor}22`,
                border: `1px solid ${badgeColor}55`,
                borderRadius: "100px",
                padding: "6px 18px",
                color: badgeColor,
                fontSize: "14px",
                fontFamily: "system-ui, sans-serif",
                fontWeight: "700",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {submission.type}
            </div>

            {/* Divider dot */}
            <span
              style={{
                color: "#3a3a37",
                fontSize: "18px",
                display: "flex",
              }}
            >
              ·
            </span>

            {/* Tools & Prompts label */}
            <span
              style={{
                color: "#7a7870",
                fontSize: "14px",
                fontFamily: "system-ui, sans-serif",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              Tools &amp; Prompts
            </span>
          </div>

          {/* Submission title */}
          <h1
            style={{
              color: "#faf9f5",
              fontSize: submission.title.length > 70 ? "42px" : "54px",
              fontWeight: "600",
              margin: "0 0 20px",
              lineHeight: "1.2",
              letterSpacing: "-0.025em",
              maxWidth: "940px",
              fontFamily: "Georgia, serif",
              display: "flex",
            }}
          >
            {submission.title}
          </h1>

          {/* Short description */}
          <p
            style={{
              color: "#b0aea5",
              fontSize: "20px",
              margin: "0 0 28px",
              lineHeight: "1.55",
              maxWidth: "820px",
              fontFamily: "system-ui, sans-serif",
              display: "flex",
            }}
          >
            {displayDesc}
          </p>

          {/* Submitter */}
          {submission.submitterName && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
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
                Shared by
              </span>
              <span
                style={{
                  color: "#d97757",
                  fontSize: "16px",
                  fontFamily: "system-ui, sans-serif",
                  fontWeight: "600",
                  display: "flex",
                }}
              >
                {submission.submitterName}
              </span>
            </div>
          )}
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
            claudekenya.org/community
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
