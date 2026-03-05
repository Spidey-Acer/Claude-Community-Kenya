"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          maxWidth: "520px",
          width: "100%",
          backgroundColor: "#1a1a1a",
          border: "1px solid #ff3333",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {/* Terminal title bar */}
        <div
          style={{
            backgroundColor: "#111",
            padding: "0.5rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            borderBottom: "1px solid #222",
          }}
        >
          <span
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "#ff3333",
            }}
          />
          <span
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "#222",
            }}
          />
          <span
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              backgroundColor: "#222",
            }}
          />
          <span
            style={{
              color: "#666",
              fontSize: "0.75rem",
              marginLeft: "0.5rem",
            }}
          >
            admin — error
          </span>
        </div>

        {/* Error content */}
        <div style={{ padding: "1.5rem" }}>
          <p
            style={{
              color: "#ff3333",
              fontSize: "0.875rem",
              marginBottom: "0.5rem",
            }}
          >
            [ERROR] Process exited with failure
          </p>

          <p
            style={{
              color: "#ccc",
              fontSize: "0.875rem",
              marginBottom: "1.5rem",
              lineHeight: 1.6,
              wordBreak: "break-word",
            }}
          >
            {error.message || "An unexpected error occurred."}
          </p>

          {error.digest && (
            <p
              style={{
                color: "#666",
                fontSize: "0.75rem",
                marginBottom: "1.5rem",
              }}
            >
              Digest: {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              backgroundColor: "transparent",
              color: "#00ff41",
              border: "1px solid #00ff41",
              padding: "0.5rem 1.25rem",
              borderRadius: "4px",
              fontFamily: "monospace",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#00ff4115";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            $ retry
          </button>
        </div>
      </div>
    </div>
  );
}
