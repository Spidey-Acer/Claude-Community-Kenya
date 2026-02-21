import type { Metadata } from "next";
import { JetBrains_Mono, IBM_Plex_Sans } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LoadingBar } from "@/components/terminal/LoadingBar";
import { EasterEggs } from "@/components/EasterEggs";
import { PageTransition } from "@/components/layout/PageTransition";
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

export const metadata: Metadata = {
  metadataBase: new URL("https://www.claudekenya.org"),
  title: {
    default: "Claude Community Kenya",
    template: "%s | Claude Community Kenya",
  },
  description:
    "Kenya's official Anthropic developer community — building, learning, and shipping with Claude.",
  keywords: [
    "Claude",
    "Anthropic",
    "AI",
    "Kenya",
    "Developer Community",
    "Machine Learning",
    "Nairobi",
  ],
  authors: [{ name: "Claude Community Kenya" }],
  openGraph: {
    title: "Claude Community Kenya",
    description:
      "Kenya's official Anthropic developer community — building, learning, and shipping with Claude.",
    url: "https://www.claudekenya.org",
    siteName: "Claude Community Kenya",
    locale: "en_KE",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Claude Community Kenya",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Claude Community Kenya",
    description:
      "Kenya's official Anthropic developer community — building, learning, and shipping with Claude.",
    images: ["/og-image.png"],
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
    "Kenya's official Anthropic developer community — building, learning, and shipping with Claude.",
  sameAs: [
    "https://twitter.com/ClaudeCommunityKE",
    "https://github.com/claude-community-kenya",
    "https://discord.gg/NSB9AsCm",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <a href="#main-content" className="skip-nav">
          Skip to main content
        </a>
        <Navbar />
        <LoadingBar />
        <main id="main-content">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
        <EasterEggs />
      </body>
    </html>
  );
}
