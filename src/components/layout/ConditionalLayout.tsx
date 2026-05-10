"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LoadingBar } from "@/components/terminal/LoadingBar";
import { EasterEggs } from "@/components/EasterEggs";
import { PageTransition } from "@/components/layout/PageTransition";
import { SkinProvider, useSkin } from "@/contexts/SkinContext";
import { PersonaSelectorModal } from "@/components/persona/PersonaSelectorModal";
import { ChatWidget } from "@/components/chat/ChatWidget";

export function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <SessionProvider>
      <SkinProvider>
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
      </SkinProvider>
    </SessionProvider>
  );
}

function PersonaGate() {
  const { skin, setSkin, isLoaded } = useSkin();
  if (!isLoaded || skin !== null) return null;
  return <PersonaSelectorModal onSelect={setSkin} />;
}
