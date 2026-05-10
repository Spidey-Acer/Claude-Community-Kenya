import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, IBM_Plex_Sans } from "next/font/google";
import { ConditionalLayout } from "@/components/layout/ConditionalLayout";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { WebVitals } from "@/components/WebVitals";
import { isKaribuEnabled, isKaribuCanaryHit } from "@/lib/karibu/feature-flag";
import { ensureVisitorId, getAudienceCookie } from "@/lib/karibu/cookies";
import { type AudienceState } from "@/contexts/AudienceContext";
import { prisma } from "@/lib/prisma";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.claudekenya.org"),
  title: {
    default: "Claude Community Kenya",
    template: "%s | Claude Community Kenya",
  },
  description:
    "Anthropic-supported Claude developer community — building, learning, and shipping with Claude.",
  keywords: [
    "Claude",
    "Claude AI",
    "Claude Code",
    "Anthropic",
    "AI",
    "Kenya",
    "Developer Community",
    "Machine Learning",
    "Nairobi",
    "Mombasa",
    "AI Community Kenya",
    "Claude Community",
    "Claude Developer",
    "AI Meetup Kenya",
    "Claude Code Kenya",
    "East Africa AI",
    "Claude API",
    "LLM Kenya",
  ],
  authors: [{ name: "Claude Community Kenya", url: "https://www.claudekenya.org" }],
  creator: "Claude Community Kenya",
  publisher: "Claude Community Kenya",
  alternates: {
    canonical: "https://www.claudekenya.org",
  },
  category: "technology",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/favicon/apple-icon.png" },
      { url: "/favicon/apple-icon-57x57.png", sizes: "57x57" },
      { url: "/favicon/apple-icon-60x60.png", sizes: "60x60" },
      { url: "/favicon/apple-icon-72x72.png", sizes: "72x72" },
      { url: "/favicon/apple-icon-76x76.png", sizes: "76x76" },
      { url: "/favicon/apple-icon-114x114.png", sizes: "114x114" },
      { url: "/favicon/apple-icon-120x120.png", sizes: "120x120" },
      { url: "/favicon/apple-icon-144x144.png", sizes: "144x144" },
      { url: "/favicon/apple-icon-152x152.png", sizes: "152x152" },
      { url: "/favicon/apple-icon-180x180.png", sizes: "180x180" },
    ],
    other: [
      { rel: "msapplication-TileImage", url: "/favicon/ms-icon-144x144.png" },
    ],
  },
  openGraph: {
    title: "Claude Community Kenya",
    description:
      "Kenya's official Anthropic developer community — building, learning, and shipping with Claude.",
    url: "https://www.claudekenya.org",
    siteName: "Claude Community Kenya",
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Community Kenya",
    description:
      "Kenya's official Anthropic developer community — building, learning, and shipping with Claude.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Claude Community Kenya",
  url: "https://www.claudekenya.org",
  logo: "https://www.claudekenya.org/logo.svg",
  description:
    "Anthropic-supported Claude developer community — building, learning, and shipping with Claude.",
  sameAs: [
    "https://twitter.com/ClaudeCommunityKE",
    "https://github.com/claude-community-kenya",
    "https://discord.gg/CkD9QWjsHm",
    "https://linkedin.com/company/claude-community-kenya",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "claudecommunitykenya@gmail.com",
    contactType: "general",
  },
  areaServed: {
    "@type": "Country",
    name: "Kenya",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const visitorId = await ensureVisitorId();
  const audienceCookie = await getAudienceCookie();
  const showKaribu =
    isKaribuEnabled() && audienceCookie === null && isKaribuCanaryHit(visitorId);

  let audienceState: AudienceState = {
    audience: null,
    intent: null,
    experience: null,
    name: null,
    city: null,
    language: null,
  };

  if (audienceCookie && audienceCookie !== "skipped") {
    const session = await prisma.onboardingSession.findUnique({
      where: { cookieId: visitorId },
      select: {
        audience: true,
        intent: true,
        experience: true,
        name: true,
        city: true,
        language: true,
      },
    });
    if (session) {
      audienceState = {
        audience: session.audience,
        intent: session.intent,
        experience: session.experience,
        name: session.name,
        city: session.city,
        language: session.language,
      };
    }
  }

  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${jetbrainsMono.variable} ${ibmPlexSans.variable} antialiased`}
      >
        <GoogleAnalytics />
        <WebVitals />
        <ConditionalLayout audienceState={audienceState} showKaribu={showKaribu}>
          {children}
        </ConditionalLayout>
      </body>
    </html>
  );
}
