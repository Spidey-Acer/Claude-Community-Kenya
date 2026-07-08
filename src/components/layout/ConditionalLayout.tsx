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
}: {
  children: React.ReactNode;
  audienceState: AudienceState;
  showKaribu: boolean;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isDashboard = pathname.startsWith("/dashboard");
  // Routes migrated to the warm-light "Karibu" identity. Grows page-by-page;
  // everything else keeps the Terminal Noir chrome until converted.
  const isKaribu =
    pathname === "/" ||
    pathname.startsWith("/events") ||
    pathname === "/about" ||
    pathname === "/resources" ||
    pathname === "/community" ||
    pathname === "/join" ||
    pathname === "/projects" ||
    pathname === "/team" ||
    pathname === "/faq" ||
    pathname === "/gallery" ||
    pathname === "/newsletter" ||
    pathname === "/blog";

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <SessionProvider>
      <SkinProvider>
        <AudienceProvider value={audienceState}>
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
        </AudienceProvider>
      </SkinProvider>
    </SessionProvider>
  );
}

