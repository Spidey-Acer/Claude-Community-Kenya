"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LoadingBar } from "@/components/terminal/LoadingBar";
import { EasterEggs } from "@/components/EasterEggs";
import { PageTransition } from "@/components/layout/PageTransition";
import { SkinProvider, useSkin } from "@/contexts/SkinContext";
import { PersonaSelectorModal } from "@/components/persona/PersonaSelectorModal";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { AudienceProvider, type AudienceState } from "@/contexts/AudienceContext";

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
          <Footer />
          <EasterEggs />
          <ChatWidget />
          <PersonaGate />
          {showKaribu && <KaribuModal />}
        </AudienceProvider>
      </SkinProvider>
    </SessionProvider>
  );
}

function PersonaGate() {
  const { skin, setSkin, isLoaded } = useSkin();
  if (!isLoaded || skin !== null) return null;
  return <PersonaSelectorModal onSelect={setSkin} />;
}
