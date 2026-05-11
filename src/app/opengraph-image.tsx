import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Claude Community Kenya — Africa's First Claude Developer Community";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "monospace",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Scanline overlay effect */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.03) 2px, rgba(0,255,65,0.03) 4px)",
            display: "flex",
          }}
        />

        {/* Top border accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #00ff41, #ffb000, #00d4ff)",
            display: "flex",
          }}
        />

        {/* Terminal prompt */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <span style={{ color: "#00ff41", fontSize: "20px" }}>$</span>
          <span style={{ color: "#666", fontSize: "20px" }}>cat community.md</span>
        </div>

        {/* Main title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <h1
            style={{
              color: "#00ff41",
              fontSize: "64px",
              fontWeight: "bold",
              margin: 0,
              textAlign: "center",
              letterSpacing: "-1px",
            }}
          >
            Claude Community Kenya
          </h1>
          <p
            style={{
              color: "#a0a0a0",
              fontSize: "28px",
              margin: 0,
              textAlign: "center",
              maxWidth: "800px",
            }}
          >
            Africa&apos;s first Claude developer community
          </p>
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: "40px",
            marginTop: "48px",
            padding: "20px 40px",
            border: "1px solid rgba(0,255,65,0.2)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "#00ff41", fontSize: "32px", fontWeight: "bold" }}>Anthropic</span>
            <span style={{ color: "#666", fontSize: "14px", textTransform: "uppercase", letterSpacing: "2px" }}>
              Supported
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "#ffb000", fontSize: "32px", fontWeight: "bold" }}>Nairobi</span>
            <span style={{ color: "#666", fontSize: "14px", textTransform: "uppercase", letterSpacing: "2px" }}>
              + Mombasa
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <span style={{ color: "#00d4ff", fontSize: "32px", fontWeight: "bold" }}>Claude</span>
            <span style={{ color: "#666", fontSize: "14px", textTransform: "uppercase", letterSpacing: "2px" }}>
              Code · API
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ color: "#444", fontSize: "16px" }}>claudekenya.org</span>
          <span style={{ color: "#333", fontSize: "16px" }}>|</span>
          <span style={{ color: "#444", fontSize: "16px" }}>Supported by Anthropic</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
