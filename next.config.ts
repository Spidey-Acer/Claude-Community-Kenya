import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // sharp and archiver are native/stream-heavy and must not be bundled by the
  // server compiler — sharp in particular resolves a platform binary at
  // runtime, which webpack cannot follow.
  serverExternalPackages: ["bcryptjs", "sharp", "archiver"],
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
