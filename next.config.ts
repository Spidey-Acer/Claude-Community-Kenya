import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // sharp and archiver are native/stream-heavy and must not be bundled by the
  // server compiler — sharp in particular resolves a platform binary at
  // runtime, which webpack cannot follow. pdfkit reads its built-in font
  // metrics from node_modules at runtime and exceljs is a large CJS tree —
  // both must stay external to the bundle too.
  serverExternalPackages: ["bcryptjs", "sharp", "archiver", "pdfkit", "exceljs"],
  // Vercel's output file tracing misses sharp's platform packages (@img/*),
  // so the linux libvips .so never reaches /var/task and every sharp route
  // dies with ERR_DLOPEN_FAILED in production. Force-include them on the
  // routes that import sharp (directly or via gallery derivatives).
  outputFileTracingIncludes: {
    "/api/showcase/media/finalize": ["./node_modules/@img/**"],
    "/api/admin/photos/finalize": ["./node_modules/@img/**"],
    "/api/admin/photos/presign": ["./node_modules/@img/**"],
  },
  experimental: {
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Cloudflare R2 custom domain — gallery photos and their pre-generated
      // derivatives. Grid and lightbox pass `unoptimized` for these (the
      // renditions are already sized), but the hostname still has to be
      // allowed or next/image refuses the src outright.
      {
        protocol: "https",
        hostname: "media.claudekenya.org",
        pathname: "/**",
      },
      // GIPHY — a picked GIF can become a post's cover image, and the feed
      // card renders covers through next/image, so the media hosts
      // (media0–media4, i.giphy.com) must be allowed.
      {
        protocol: "https",
        hostname: "*.giphy.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
}

export default nextConfig
