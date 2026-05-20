"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
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

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <SessionProvider>
      <SkinProvider>
        <AudienceProvider value={audienceState}>
          <a href="#main-content" className="skip-nav">
            Skip to main content
          </a>
          <Navbar />
          <LoadingBar />
          <main id="main-content">
            <PageTransition>{children}</PageTransition>
          </main>
          {!isDashboard && <Footer />}
          <EasterEggs />
          <ChatWidget />
          <KaribuBanner />
          {!isDashboard && <StickyMobileCTA />}
          {showKaribu && <KaribuModal />}
        </AudienceProvider>
      </SkinProvider>
    </SessionProvider>
  );
}

