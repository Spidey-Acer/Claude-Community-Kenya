import { ImageResponse } from "next/og";
import { getBlogPostBySlug } from "@/lib/data";

// Default Node.js runtime — Prisma data fetch uses node:path which the edge
// runtime can't resolve. Node runtime still supports ImageResponse fine.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Claude Community Kenya — Blog Post";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug).catch(() => null);

  if (!post) {
    return null;
  }

  const formattedDate = post.date
    ? new Date(post.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // Truncate excerpt for OG display
  const displayExcerpt =
    post.excerpt.length > 140 ? post.excerpt.slice(0, 137) + "…" : post.excerpt;

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
              ✦ BLOG
            </div>
          </div>

          {/* Post title */}
          <h1
            style={{
              color: "#faf9f5",
              fontSize: post.title.length > 70 ? "42px" : "54px",
              fontWeight: "600",
              margin: "0 0 20px",
              lineHeight: "1.2",
              letterSpacing: "-0.025em",
              maxWidth: "940px",
              fontFamily: "Georgia, serif",
              display: "flex",
            }}
          >
            {post.title}
          </h1>

          {/* Excerpt */}
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
            {displayExcerpt}
          </p>

          {/* Author + date */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <span
              style={{
                color: "#d97757",
                fontSize: "16px",
                fontFamily: "system-ui, sans-serif",
                fontWeight: "600",
                display: "flex",
              }}
            >
              {post.author}
            </span>
            {formattedDate && (
              <>
                <span
                  style={{
                    color: "#3a3a37",
                    fontSize: "16px",
                    display: "flex",
                  }}
                >
                  ·
                </span>
                <span
                  style={{
                    color: "#7a7870",
                    fontSize: "16px",
                    fontFamily: "system-ui, sans-serif",
                    display: "flex",
                  }}
                >
                  {formattedDate}
                </span>
              </>
            )}
            {post.readingTime && (
              <>
                <span
                  style={{
                    color: "#3a3a37",
                    fontSize: "16px",
                    display: "flex",
                  }}
                >
                  ·
                </span>
                <span
                  style={{
                    color: "#7a7870",
                    fontSize: "16px",
                    fontFamily: "system-ui, sans-serif",
                    display: "flex",
                  }}
                >
                  {post.readingTime} min read
                </span>
              </>
            )}
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
            claudekenya.org/blog
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
