"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { KaribuNav } from "@/components/karibu/KaribuNav";
import { KaribuFooter } from "@/components/karibu/KaribuFooter";
import { LoadingBar } from "@/components/terminal/LoadingBar";
import { EasterEggs } from "@/components/EasterEggs";
import { PageTransition } from "@/components/layout/PageTransition";
import { SkinProvider } from "@/contexts/SkinContext";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { AudienceProvider, type AudienceState } from "@/contexts/AudienceContext";
import { SocialLinksProvider } from "@/contexts/SocialLinksContext";
import type { SocialLinks } from "@/lib/social-links-schema";
import { KaribuBanner } from "@/components/karibu/KaribuBanner";
import { StickyMobileCTA } from "@/components/layout/StickyMobileCTA";

const KaribuModal = dynamic(
  () => import("@/components/karibu/KaribuModal").then((m) => m.KaribuModal),
  { ssr: false },
);

export function ConditionalLayout({
  children,
  audienceState,
  showKaribu,
  socialLinks,
}: {
  children: React.ReactNode;
  audienceState: AudienceState;
  showKaribu: boolean;
  socialLinks: SocialLinks;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isDashboard = pathname.startsWith("/dashboard");
  // /timer is a projector display for the room — no nav, no footer, no chrome
  // competing with a clock people read from across a hall.
  const isBareDisplay = pathname.startsWith("/timer") || pathname.startsWith("/judge");
  // Karibu (warm-light) is the default identity. Routes still on the Terminal
  // Noir chrome are listed here and removed as they get converted — unknown
  // paths (404s) fall through to Karibu so dead links stay on-brand.
  const legacyPrefixes = [
    "/account",
    "/chat",
    "/code-of-conduct",
    "/forgot-password",
    "/login",
    "/merch",
    "/reset-password",
    "/signup",
    "/verify-email",
    "/dashboard",
    "/resources/",
    "/blog/",
    "/community/",
  ];
  const isKaribu = !legacyPrefixes.some((p) => pathname.startsWith(p));

  if (isAdmin || isBareDisplay) {
    return <>{children}</>;
  }

  return (
    <SessionProvider>
      <SkinProvider>
        <AudienceProvider value={audienceState}>
          <SocialLinksProvider value={socialLinks}>
            <div className={isKaribu ? "karibu" : undefined}>
              <a href="#main-content" className="skip-nav">
                Skip to main content
              </a>
              {isKaribu ? <KaribuNav /> : <Navbar />}
              <LoadingBar />
              <main id="main-content">
                <PageTransition>{children}</PageTransition>
              </main>
              {isKaribu ? <KaribuFooter /> : !isDashboard && <Footer />}
            </div>
            <EasterEggs />
            <ChatWidget />
            <KaribuBanner />
            {!isDashboard && !isKaribu && <StickyMobileCTA />}
            {showKaribu && <KaribuModal />}
          </SocialLinksProvider>
        </AudienceProvider>
      </SkinProvider>
    </SessionProvider>
  );
}

