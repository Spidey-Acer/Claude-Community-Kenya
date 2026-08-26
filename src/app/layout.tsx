import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, IBM_Plex_Sans, Fraunces, Newsreader, Inter } from "next/font/google";
import { ConditionalLayout } from "@/components/layout/ConditionalLayout";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { WebVitals } from "@/components/WebVitals";
import { isKaribuEnabled, isKaribuCanaryHit } from "@/lib/karibu/feature-flag";
import { ensureVisitorId, getAudienceCookie } from "@/lib/karibu/cookies";
import { type AudienceState } from "@/contexts/AudienceContext";
import { prisma } from "@/lib/prisma";
import { getSocialLinks } from "@/lib/social-links";
import "./globals.css";
import { serializeJsonLd } from "@/lib/json-ld"

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

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
  display: "swap",
});

// ─── Karibu identity (warm-light redesign) ───
// Newsreader = display serif, Inter = body. Self-hosted via next/font (no CDN).
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#141413",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.claudekenya.org"),
  // Pages author bare titles ("Events", "Community Hub"); the template
  // appends the site name exactly once. A page that needs full control
  // (the home page's marketing title) uses `title: { absolute: ... }`.
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
    "Africa AI",
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
      "Kenya's independent, volunteer-run Claude developer community. Building, learning, and shipping with Claude.",
    url: "https://www.claudekenya.org",
    siteName: "Claude Community Kenya",
    locale: "en_KE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Community Kenya",
    description:
      "Kenya's independent, volunteer-run Claude developer community. Building, learning, and shipping with Claude.",
    images: ["/opengraph-image"],
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
  logo: "https://www.claudekenya.org/images/cck-logo.webp",
  description:
    "Anthropic-supported Claude developer community — building, learning, and shipping with Claude.",
  sameAs: [
    "https://twitter.com/ClaudeCommunityKE",
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
  const karibuEnabled = isKaribuEnabled();
  const canaryHit = karibuEnabled && isKaribuCanaryHit(visitorId);
  const socialLinks = await getSocialLinks();

  // Source of truth = DB session, not just the cookie.
  // The cck-audience cookie can fail to propagate when set from inside the
  // streaming /api/karibu tool response (response headers are sent before
  // tool.execute runs). Reading the DB also lets us hide the modal correctly
  // on /join (and every other post-Karibu page) for visitors whose cookie
  // write didn't land.
  const session =
    canaryHit && audienceCookie !== "skipped"
      ? await prisma.onboardingSession.findUnique({
          where: { cookieId: visitorId },
          select: {
            audience: true,
            intent: true,
            experience: true,
            name: true,
            city: true,
            language: true,
            skipped: true,
            completedAt: true,
          },
        })
      : null;

  const hasCompletedKaribu = !!(
    session?.audience && !session.skipped && session.completedAt
  );

  const showKaribu = canaryHit && !hasCompletedKaribu && audienceCookie !== "skipped";

  const audienceState: AudienceState = hasCompletedKaribu && session
    ? {
        audience: session.audience,
        intent: session.intent,
        experience: session.experience,
        name: session.name,
        city: session.city,
        language: session.language,
      }
    : {
        audience: null,
        intent: null,
        experience: null,
        name: null,
        city: null,
        language: null,
      };

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`dark persona-pro ${jetbrainsMono.variable} ${ibmPlexSans.variable} ${fraunces.variable} ${newsreader.variable} ${inter.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
        {/* Karibu theme + motion init — runs before paint.
         * 1. Adds `.js` to <html> so the degrade-safe reveal CSS (globals.css)
         *    activates its hidden→visible transition. No JS → no `.js` →
         *    content stays fully visible (no legibility gated behind motion).
         * 2. Sets data-theme only when the visitor made an explicit choice via
         *    KaribuThemeToggle; absent that, the CSS prefers-color-scheme media
         *    query in globals.css handles the system default. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){document.documentElement.classList.add('js');try{var t=localStorage.getItem('cck-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();",
          }}
        />
      </head>
      <body className="antialiased">
        <GoogleAnalytics />
        <WebVitals />
        <ConditionalLayout audienceState={audienceState} showKaribu={showKaribu} socialLinks={socialLinks}>
          {children}
        </ConditionalLayout>
      </body>
    </html>
  );
}
