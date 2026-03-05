export default function AdminLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        padding: "2rem",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Header skeleton */}
        <div
          style={{
            height: "2rem",
            width: "240px",
            backgroundColor: "#1a1a1a",
            borderRadius: "4px",
            marginBottom: "2rem",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />

        {/* Stats row skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: "80px",
                backgroundColor: "#1a1a1a",
                borderRadius: "8px",
                border: "1px solid #222",
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>

        {/* Content skeleton bars */}
        <div
          style={{
            backgroundColor: "#1a1a1a",
            borderRadius: "8px",
            border: "1px solid #222",
            padding: "1.5rem",
          }}
        >
          {[100, 85, 70, 90, 60].map((width, i) => (
            <div
              key={i}
              style={{
                height: "1rem",
                width: `${width}%`,
                backgroundColor: "#222",
                borderRadius: "4px",
                marginBottom: i < 4 ? "1rem" : 0,
                animation: "pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        {/* Terminal cursor blink */}
        <div
          style={{
            marginTop: "2rem",
            color: "#00ff41",
            fontSize: "0.875rem",
            fontFamily: "monospace",
          }}
        >
          <span>Loading</span>
          <span
            style={{
              animation: "blink 1s step-end infinite",
            }}
          >
            _
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
